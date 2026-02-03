import { useEffect, useId, useMemo, useRef, useState } from 'react'
import styles from './ChatShellPage.module.css'

import { connectRoomSocket, type RoomSocket } from '../../api/chatSocket'
import { getApiErrorMessage } from '../../api/errors'
import { getRoomMessages, type Message as BackendMessage, uploadFile } from '../../api/messages'
import { createRoom, createOneToOneRoom, joinRoom } from '../../api/rooms'
import { getUserName } from '../../api/token'
import { getUserChats, searchUsers, type SearchUser, type UserChatRoom, type UserChatRoomMessage } from '../../api/user'

type ChatPreview = {
  id: string
  name: string
  lastMessage: string
  time: string
  unreadCount?: number
  isOnline?: boolean
  /** True when this chat is a 1-to-1 room (show other member's name, not room ID) */
  oneToOneRoom?: boolean
}

type RoomAction = 'create' | 'join'

type ChatMessage = {
  id: string
  chatId: string
  from: 'me' | 'other' | 'system'
  sender?: string
  text?: string
  attachment?: {
    name: string
    size: number
    downloadUrl?: string
    mimeType?: string
  }
  createdAt: number
  isUploading?: boolean
}

function chatIdToRoomId(chatId: string): string | null {
  if (!chatId.startsWith('room:')) return null
  return chatId.slice('room:'.length)
}

/** For one-to-one chat before room is created: user:username → username */
function chatIdToUsername(chatId: string): string | null {
  if (!chatId.startsWith('user:')) return null
  return chatId.slice('user:'.length)
}

function parseLocalDateTime(input: string | null | undefined): number {
  if (!input) return Date.now()
  const t = Date.parse(input)
  return Number.isFinite(t) ? t : Date.now()
}

/** Format timestamp for chat list: "2:18 PM", "Yesterday", "Mon", or "Sun" */
function formatChatTime(isoString: string | null | undefined): string {
  if (!isoString) return ''
  const ms = parseLocalDateTime(isoString)
  const d = new Date(ms)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const then = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  if (then.getTime() === today.getTime()) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  if (then.getTime() === yesterday.getTime()) return 'Yesterday'
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[d.getDay()] ?? ''
}

const CHAT_PREVIEW_MAX_LENGTH = 45

/** Get last message preview from room.messages array (from GET /user/chats). */
function getLastMessageFromRoomMessages(messages: UserChatRoomMessage[] | null | undefined): {
  lastMessage: string
  lastMessageAt: string
} {
  if (!messages || messages.length === 0) {
    return { lastMessage: 'No messages yet', lastMessageAt: '' }
  }
  const sorted = [...messages].sort(
    (a, b) => parseLocalDateTime(a.timestamp) - parseLocalDateTime(b.timestamp)
  )
  const last = sorted[sorted.length - 1]
  let text: string
  if (last.type === 'FILE') {
    text = last.file?.originalName?.trim() || '[File]'
  } else {
    const content = typeof last.content === 'string' ? last.content.trim() : ''
    text =
      content.length > CHAT_PREVIEW_MAX_LENGTH
        ? content.slice(0, CHAT_PREVIEW_MAX_LENGTH) + '…'
        : content || 'No messages yet'
  }
  return {
    lastMessage: text,
    lastMessageAt: formatChatTime(last.timestamp),
  }
}

function mapRoomToChatPreview(room: UserChatRoom): ChatPreview {
  const id = `room:${room.roomId}`
  let name = room.name?.trim() || room.roomId
  if (room.oneToOneRoom && Array.isArray(room.usernames) && room.usernames.length >= 2) {
    const current = getUserName()?.trim().toLowerCase()
    const other = room.usernames.find((u) => (u ?? '').trim().toLowerCase() !== current)
    if (other?.trim()) name = other.trim()
  }
  const { lastMessage, lastMessageAt } =
    Array.isArray(room.messages) && room.messages.length > 0
      ? getLastMessageFromRoomMessages(room.messages)
      : {
          lastMessage: room.lastMessage?.trim() || 'No messages yet',
          lastMessageAt: formatChatTime(room.lastMessageAt ?? room.updatedAt),
        }
  return {
    id,
    name,
    lastMessage,
    time: lastMessageAt,
    unreadCount: room.unreadCount,
    oneToOneRoom: room.oneToOneRoom === true,
  }
}

function getSearchUserDisplayName(user: SearchUser): string {
  const name = user.userName?.trim() || user.name?.trim() || user.email?.trim()
  return name || 'Unknown'
}

function resolveFrom(sender: string | null | undefined): ChatMessage['from'] {
  if (!sender) return 'other'
  
  const normalizedSender = sender.trim().toLowerCase()
  if (normalizedSender === 'system') return 'system'
  
  const currentUser = getUserName()
  if (!currentUser) {
    if (import.meta.env.DEV) {
      console.log('[resolveFrom] No current user found, sender:', sender)
    }
    return 'other'
  }
  
  const normalizedCurrentUser = currentUser.trim().toLowerCase()
  const isMe = normalizedCurrentUser && normalizedSender === normalizedCurrentUser
  
  if (import.meta.env.DEV) {
    console.log('[resolveFrom]', {
      sender,
      normalizedSender,
      currentUser,
      normalizedCurrentUser,
      isMe,
    })
  }
  
  return isMe ? 'me' : 'other'
}

function isImageMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) return false
  return mimeType.startsWith('image/')
}

function getImageUrl(downloadUrl: string | undefined): string | undefined {
  if (!downloadUrl) return undefined
  // If downloadUrl already starts with http, return as-is
  if (downloadUrl.startsWith('http://') || downloadUrl.startsWith('https://')) {
    return downloadUrl
  }
  // Otherwise, prepend the base URL
  return `http://localhost:8080/${downloadUrl}`
}

const MAX_PREVIEW_LENGTH = 45

/** Get last message preview and time from backend message list for the chat sidebar. */
function getLastMessagePreview(list: BackendMessage[] | null | undefined): {
  lastMessage: string
  lastMessageAt: string
} {
  if (!list || list.length === 0) {
    return { lastMessage: 'No messages yet', lastMessageAt: '' }
  }
  const sorted = [...list].sort(
    (a, b) => parseLocalDateTime(a.timestamp) - parseLocalDateTime(b.timestamp)
  )
  const last = sorted[sorted.length - 1]
  let text: string
  if (last.type === 'FILE' && last.file?.originalName) {
    text = last.file.originalName
  } else if (last.type === 'FILE') {
    text = '[File]'
  } else {
    const content = typeof last.content === 'string' ? last.content.trim() : ''
    text = content.length > MAX_PREVIEW_LENGTH
      ? content.slice(0, MAX_PREVIEW_LENGTH) + '…'
      : content || 'No messages yet'
  }
  return {
    lastMessage: text,
    lastMessageAt: formatChatTime(last.timestamp),
  }
}

function mapBackendMessages(chatId: string, roomId: string, list: BackendMessage[]): ChatMessage[] {
  const mapped = list.map((m): ChatMessage => {
    const createdAt = parseLocalDateTime(m.timestamp)
    const sender = m.sender
    const from: ChatMessage['from'] = resolveFrom(sender)

    const text = typeof m.content === 'string' && m.content.trim().length > 0 ? m.content : undefined
    const attachment =
      m.type === 'FILE' && m.file
        ? {
            name: m.file.originalName || m.file.storedName || 'Attachment',
            size: m.file.size ?? 0,
            downloadUrl: m.file.downloadUrl,
            mimeType: m.file.mimeType,
          }
        : undefined

    return {
      id: m.messageId ? `srv:${m.messageId}` : `srv:${roomId}:${createdAt}`,
      chatId,
      from,
      sender,
      text,
      attachment,
      createdAt,
    }
  })

  mapped.sort((a, b) => a.createdAt - b.createdAt)
  return mapped
}

function Icon({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <title>{title}</title>
      {children}
    </svg>
  )
}

/** Simple string hash for deterministic avatar color index (0–5). */
function hashToColorIndex(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h) % 6
}

function Avatar({ name }: { name: string }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase()).join('') || '?'
  }, [name])

  const colorIndex = useMemo(() => hashToColorIndex(name || '0'), [name])

  return (
    <span className={styles.avatar} data-color={String(colorIndex)} aria-hidden="true">
      <span className={styles.avatarInner}>{initials}</span>
    </span>
  )
}

function UserIcon() {
  return (
    <div className={styles.userIcon} aria-hidden="true">
      <Icon title="User">
        <path
          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
          fill="currentColor"
        />
      </Icon>
    </div>
  )
}

export function ChatShellPage() {
  const [chats, setChats] = useState<ChatPreview[]>([])
  const [chatsLoading, setChatsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setChatsLoading(true)
    void (async () => {
      try {
        const list = await getUserChats()
        if (cancelled) return
        const validRooms = list.filter(
          (room): room is UserChatRoom =>
            room != null && typeof room === 'object' && typeof room.roomId === 'string'
        )
        setChats(validRooms.map(mapRoomToChatPreview))
      } catch (err) {
        if (cancelled) return
        if (import.meta.env.DEV) console.error('[chats] load error', err)
        setChats([])
      } finally {
        if (!cancelled) setChatsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const [rooms, setRooms] = useState<ChatPreview[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchFetched, setSearchFetched] = useState(false)
  const searchDebounceRef = useRef<number | null>(null)
  const searchRequestIdRef = useRef(0)
  const allItems = useMemo(() => [...rooms, ...chats], [rooms, chats])

  const selected = useMemo(
    () => allItems.find((c) => c.id === selectedId) ?? null,
    [allItems, selectedId],
  )

  const selectedRoomId = useMemo(() => {
    if (!selected) return null
    return chatIdToRoomId(selected.id)
  }, [selected?.id])

  const roomIdInputId = useId()
  const roomIdInputRef = useRef<HTMLInputElement | null>(null)
  const [roomAction, setRoomAction] = useState<RoomAction | null>(null)
  const [roomId, setRoomId] = useState('')
  const [roomError, setRoomError] = useState<string | null>(null)
  const [roomBusy, setRoomBusy] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>(
    {},
  )
  const [draft, setDraft] = useState('')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [messagesLoadingFor, setMessagesLoadingFor] = useState<string | null>(null)
  const roomSocketRef = useRef<RoomSocket | null>(null)
  const fileErrorTimeoutRef = useRef<number | null>(null)
  const fileErrorMessageIdsRef = useRef<Set<string>>(new Set())

  /** After creating one-to-one room, send this message once STOMP is connected (text only). */
  const [pendingOneToOneMessage, setPendingOneToOneMessage] = useState<{
    roomId: string
    text: string
  } | null>(null)
  const pendingOneToOneMessageRef = useRef<{ roomId: string; text: string } | null>(null)
  useEffect(() => {
    pendingOneToOneMessageRef.current = pendingOneToOneMessage
  }, [pendingOneToOneMessage])

  const MIN_FILE_SIZE = 1024 // 1 KB
  const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB

  const messages = useMemo(() => {
    if (!selectedId) return []
    return messagesByChat[selectedId] ?? []
  }, [messagesByChat, selectedId])

  useEffect(() => {
    const trimmed = searchQuery.trim()
    if (trimmed.length < 2) {
      setSearchResults([])
      setSearchLoading(false)
      setSearchFetched(false)
      return
    }
    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = window.setTimeout(() => {
      searchDebounceRef.current = null
      const requestId = ++searchRequestIdRef.current
      setSearchLoading(true)
      void (async () => {
        try {
          const list = await searchUsers(searchQuery)
          if (requestId !== searchRequestIdRef.current) return
          setSearchResults(list)
          setSearchFetched(true)
        } catch (err) {
          if (requestId !== searchRequestIdRef.current) return
          if (import.meta.env.DEV) console.error('[search] error', err)
          setSearchResults([])
          setSearchFetched(true)
        } finally {
          if (requestId === searchRequestIdRef.current) setSearchLoading(false)
        }
      })()
    }, 250)
    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current)
        searchDebounceRef.current = null
      }
    }
  }, [searchQuery])

  useEffect(() => {
    if (!selectedId) return
    const roomId = chatIdToRoomId(selectedId)
    if (!roomId) {
      setMessagesLoadingFor(null)
      return
    }

    let cancelled = false
    setMessagesLoadingFor(selectedId)

    void (async () => {
      try {
        const list = await getRoomMessages(roomId)
        if (cancelled) return

        const rawList = Array.isArray(list) ? list : []
        const mapped = mapBackendMessages(selectedId, roomId, rawList)
        setMessagesByChat((prev) => {
          if (mapped.length === 0) return prev
          return { ...prev, [selectedId]: mapped }
        })

        const { lastMessage, lastMessageAt } = getLastMessagePreview(rawList)
        setChats((prev) =>
          prev.map((c) =>
            c.id === selectedId ? { ...c, lastMessage, time: lastMessageAt } : c
          )
        )
        setRooms((prev) =>
          prev.map((c) =>
            c.id === selectedId ? { ...c, lastMessage, time: lastMessageAt } : c
          )
        )
      } catch (err) {
        if (cancelled) return
        const msg: ChatMessage = {
          id: `sys:${Date.now()}`,
          chatId: selectedId,
          from: 'system',
          text: `Failed to load messages: ${getApiErrorMessage(err)}`,
          createdAt: Date.now(),
        }
        setMessagesByChat((prev) => ({ ...prev, [selectedId]: [msg] }))
      } finally {
        if (!cancelled) setMessagesLoadingFor(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedId])

  useEffect(() => {
    // Leaving room (or selecting a non-room chat): disconnect the stomp client.
    if (!selectedId) {
      roomSocketRef.current?.disconnect()
      roomSocketRef.current = null
      return
    }

    const roomId = chatIdToRoomId(selectedId)
    if (!roomId) {
      roomSocketRef.current?.disconnect()
      roomSocketRef.current = null
      return
    }

    // Switching rooms: disconnect previous connection first.
    roomSocketRef.current?.disconnect()
    roomSocketRef.current = null

    const currentChatId = selectedId
    const socket = connectRoomSocket({
      roomId,
      onConnect: () => {
        const pending = pendingOneToOneMessageRef.current
        if (!pending || pending.roomId !== roomId) return
        pendingOneToOneMessageRef.current = null
        setPendingOneToOneMessage(null)
        const sender = getUserName() ?? 'anonymous'
        const payload = {
          roomId,
          sender,
          content: pending.text,
          type: 'TEXT',
          timestamp: new Date().toISOString(),
        }
        socket.sendJson(`/app/sendMessage/${roomId}`, payload)
      },
      onMessage: (body) => {
        if (import.meta.env.DEV) console.log('[ws] received', { roomId, body })

        let parsed: unknown = null
        try {
          parsed = JSON.parse(body)
        } catch {
          parsed = null
        }

        if (!parsed || typeof parsed !== 'object') {
          const sys: ChatMessage = {
            id: `sys:${Date.now()}`,
            chatId: currentChatId,
            from: 'system',
            text: 'Received an invalid message payload.',
            createdAt: Date.now(),
          }
          setMessagesByChat((prev) => ({
            ...prev,
            [currentChatId]: [...(prev[currentChatId] ?? []), sys],
          }))
          return
        }

        const m = parsed as BackendMessage
        const mapped = mapBackendMessages(currentChatId, roomId, [m])[0]
        if (!mapped) return

        setMessagesByChat((prev) => {
          const existing = prev[currentChatId] ?? []
          if (existing.some((x) => x.id === mapped.id)) return prev
          return { ...prev, [currentChatId]: [...existing, mapped] }
        })
      },
      onError: (err) => {
        const sys: ChatMessage = {
          id: `sys:${Date.now()}`,
          chatId: currentChatId,
          from: 'system',
          text: `WebSocket error: ${getApiErrorMessage(err)}`,
          createdAt: Date.now(),
        }
        setMessagesByChat((prev) => ({
          ...prev,
          [currentChatId]: [...(prev[currentChatId] ?? []), sys],
        }))
      },
    })

    roomSocketRef.current = socket

    return () => {
      // Requirement: disconnect when leaving the room
      socket.disconnect()
      if (roomSocketRef.current === socket) roomSocketRef.current = null
    }
  }, [selectedId])

  useEffect(() => {
    if (!roomAction) return
    const t = window.setTimeout(() => roomIdInputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [roomAction])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end' 
      })
    }
  }, [messages.length, selectedId])

  // Auto-hide file error in composer after 5 seconds
  useEffect(() => {
    if (fileError) {
      // Clear any existing timeout
      if (fileErrorTimeoutRef.current) {
        window.clearTimeout(fileErrorTimeoutRef.current)
      }
      
      // Set new timeout to hide error after 5 seconds
      fileErrorTimeoutRef.current = window.setTimeout(() => {
        setFileError(null)
        fileErrorTimeoutRef.current = null
      }, 5000)
      
      return () => {
        if (fileErrorTimeoutRef.current) {
          window.clearTimeout(fileErrorTimeoutRef.current)
          fileErrorTimeoutRef.current = null
        }
      }
    }
  }, [fileError])

  // Auto-hide file error system messages after 8 seconds
  useEffect(() => {
    if (fileErrorMessageIdsRef.current.size > 0 && selectedId) {
      const timeoutId = window.setTimeout(() => {
        setMessagesByChat((prev) => {
          const existing = prev[selectedId] ?? []
          const filtered = existing.filter((m) => !fileErrorMessageIdsRef.current.has(m.id))
          if (filtered.length !== existing.length) {
            fileErrorMessageIdsRef.current.clear()
            return { ...prev, [selectedId]: filtered }
          }
          return prev
        })
      }, 8000)
      
      return () => {
        window.clearTimeout(timeoutId)
      }
    }
  }, [selectedId, messagesByChat])

  function openRoomDialog(action: RoomAction) {
    setRoomAction(action)
    setRoomId('')
    setRoomError(null)
    setRoomBusy(false)
  }

  function closeRoomDialog() {
    setRoomAction(null)
    setRoomId('')
    setRoomError(null)
    setRoomBusy(false)
  }

  function normalizeRoomId(raw: string) {
    return raw.trim().replace(/\\s+/g, '-')
  }

  async function submitRoom(action: RoomAction) {
    const normalized = normalizeRoomId(roomId)

    if (action === 'join' && normalized.length === 0) {
      setRoomError('Room ID is required to join a room.')
      return
    }

    if (normalized.length > 0 && !/^[a-zA-Z0-9_-]{3,40}$/.test(normalized)) {
      setRoomError('Room ID must be 3–40 characters (letters, numbers, _ or -).')
      return
    }

    setRoomBusy(true)
    setRoomError(null)

    try {
      const finalId =
        normalized.length > 0
          ? normalized
          : `room-${Math.random().toString(36).slice(2, 8)}`

      if (action === 'create') {
        await createRoom(finalId)
      } else {
        await joinRoom(finalId)
      }

      const newRoom: ChatPreview = {
        id: `room:${finalId}`,
        name: `Room · ${finalId}`,
        lastMessage:
          action === 'create'
            ? 'Room created. Invite others to join.'
            : 'Joined the room. Say hi!',
        time: 'Now',
        unreadCount: 0,
      }

      setRooms((prev) => {
        const exists = prev.some((p) => p.id === newRoom.id)
        if (exists) return prev
        return [newRoom, ...prev]
      })

      setMessagesByChat((prev) => {
        if (prev[newRoom.id]?.length) return prev
        const sys: ChatMessage = {
          id: `m:${Date.now()}`,
          chatId: newRoom.id,
          from: 'system',
          text:
            action === 'create'
              ? 'Room created. Share the Room ID to invite others.'
              : 'You joined the room. Say hello!',
          createdAt: Date.now(),
        }
        return { ...prev, [newRoom.id]: [sys] }
      })

      setSelectedId(newRoom.id)
      closeRoomDialog()
    } catch (err) {
      setRoomError(getApiErrorMessage(err))
    } finally {
      setRoomBusy(false)
    }
  }

  function formatFileSize(size: number) {
    if (size < 1024) return `${size} B`
    const kb = size / 1024
    if (kb < 1024) return `${kb.toFixed(0)} KB`
    const mb = kb / 1024
    return `${mb.toFixed(1)} MB`
  }

  async function sendMessage() {
    if (!selectedId) return
    const text = draft.trim()
    if (text.length === 0 && !attachedFile) return

    const oneToOneUsername = chatIdToUsername(selectedId)
    if (oneToOneUsername) {
      if (attachedFile) {
        const sys: ChatMessage = {
          id: `sys:${Date.now()}`,
          chatId: selectedId,
          from: 'system',
          text: 'Send a text message first to start the chat, then you can attach files.',
          createdAt: Date.now(),
        }
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), sys],
        }))
        return
      }
      try {
        const { roomId } = await createOneToOneRoom(oneToOneUsername)
        const otherName = selected?.name ?? oneToOneUsername
        const newChatId = `room:${roomId}`
        pendingOneToOneMessageRef.current = { roomId, text }
        setPendingOneToOneMessage({ roomId, text })
        setRooms((prev) => {
          const withoutUserChat = prev.filter((c) => c.id !== selectedId)
          const alreadyExists = prev.some((c) => c.id === newChatId) || chats.some((c) => c.id === newChatId)
          if (alreadyExists) return withoutUserChat
          return withoutUserChat.concat({
            id: newChatId,
            name: otherName,
            lastMessage: 'No messages yet',
            time: '',
            oneToOneRoom: true,
          })
        })
        setSelectedId(newChatId)
        setDraft('')
        setAttachedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (err) {
        const sys: ChatMessage = {
          id: `sys:${Date.now()}`,
          chatId: selectedId,
          from: 'system',
          text: getApiErrorMessage(err),
          createdAt: Date.now(),
        }
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), sys],
        }))
      }
      return
    }

    const roomId = chatIdToRoomId(selectedId)
    if (!roomId) return

    const socket = roomSocketRef.current
    if (!socket || socket.roomId !== roomId || !socket.connected()) {
      const sys: ChatMessage = {
        id: `sys:${Date.now()}`,
        chatId: selectedId,
        from: 'system',
        text: 'Not connected to the room yet. Please wait a moment and try again.',
        createdAt: Date.now(),
      }
      setMessagesByChat((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), sys],
      }))
      return
    }

    // Handle file upload
    if (attachedFile) {
      // Validate file size again
      if (attachedFile.size < MIN_FILE_SIZE || attachedFile.size > MAX_FILE_SIZE) {
        const errorMsg: ChatMessage = {
          id: `sys:${Date.now()}`,
          chatId: selectedId,
          from: 'system',
          text: `File size must be between ${formatFileSize(MIN_FILE_SIZE)} and ${formatFileSize(MAX_FILE_SIZE)}.`,
          createdAt: Date.now(),
        }
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), errorMsg],
        }))
        return
      }

      // Create temporary message with uploading state
      const tempMessageId = `temp:${Date.now()}:${Math.random().toString(16).slice(2)}`
      const tempMsg: ChatMessage = {
        id: tempMessageId,
        chatId: selectedId,
        from: 'me',
        text: text.length > 0 ? text : undefined,
        attachment: {
          name: attachedFile.name,
          size: attachedFile.size,
          mimeType: attachedFile.type,
        },
        createdAt: Date.now(),
        isUploading: true,
      }

      // Add uploading message to chat
      setMessagesByChat((prev) => ({
        ...prev,
        [selectedId]: [...(prev[selectedId] ?? []), tempMsg],
      }))

      try {
        // Upload file to backend
        const uploadResponse = await uploadFile(roomId, attachedFile)

        // Remove temporary uploading message
        setMessagesByChat((prev) => {
          const existing = prev[selectedId] ?? []
          return {
            ...prev,
            [selectedId]: existing.filter((m) => m.id !== tempMessageId),
          }
        })

        // Send message via websocket with FILE type
        const sender = getUserName() ?? 'anonymous'
        const payload = {
          roomId,
          sender,
          content: text.length > 0 ? text : '',
          type: 'FILE',
          file: {
            originalName: attachedFile.name,
            storedName: uploadResponse.fileName,
            downloadUrl: uploadResponse.downloadUrl,
            mimeType: uploadResponse.mimeType,
            size: uploadResponse.size,
          },
          timestamp: new Date().toISOString(),
        }

        socket.sendJson(`/app/sendMessage/${roomId}`, payload)
        setDraft('')
        setAttachedFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
        
        // Clear any file errors on successful upload
        if (fileError) {
          setFileError(null)
          if (fileErrorTimeoutRef.current) {
            window.clearTimeout(fileErrorTimeoutRef.current)
            fileErrorTimeoutRef.current = null
          }
        }
      } catch (err) {
        // Remove temporary uploading message
        setMessagesByChat((prev) => {
          const existing = prev[selectedId] ?? []
          return {
            ...prev,
            [selectedId]: existing.filter((m) => m.id !== tempMessageId),
          }
        })

        // Show error message (will auto-hide after 8 seconds)
        const errorMsgId = `sys:file-error:${Date.now()}`
        const errorMsg: ChatMessage = {
          id: errorMsgId,
          chatId: selectedId,
          from: 'system',
          text: `Failed to upload file: ${getApiErrorMessage(err)}`,
          createdAt: Date.now(),
        }
        fileErrorMessageIdsRef.current.add(errorMsgId)
        setMessagesByChat((prev) => ({
          ...prev,
          [selectedId]: [...(prev[selectedId] ?? []), errorMsg],
        }))
        
        // Auto-hide after 8 seconds
        window.setTimeout(() => {
          setMessagesByChat((prev) => {
            const existing = prev[selectedId] ?? []
            const filtered = existing.filter((m) => m.id !== errorMsgId)
            fileErrorMessageIdsRef.current.delete(errorMsgId)
            return { ...prev, [selectedId]: filtered }
          })
        }, 8000)
      }
      return
    }

    // Handle text-only message
    const sender = getUserName() ?? 'anonymous'
    const payload = {
      roomId,
      sender,
      content: text,
      type: 'TEXT',
      timestamp: new Date().toISOString(),
    }

    socket.sendJson(`/app/sendMessage/${roomId}`, payload)
    setDraft('')
    
    // Clear file error when sending message
    if (fileError) {
      setFileError(null)
      if (fileErrorTimeoutRef.current) {
        window.clearTimeout(fileErrorTimeoutRef.current)
        fileErrorTimeoutRef.current = null
      }
    }
    
    // Clear file error system messages when sending message
    if (selectedId && fileErrorMessageIdsRef.current.size > 0) {
      setMessagesByChat((prev) => {
        const existing = prev[selectedId] ?? []
        const filtered = existing.filter((m) => !fileErrorMessageIdsRef.current.has(m.id))
        fileErrorMessageIdsRef.current.clear()
        return { ...prev, [selectedId]: filtered }
      })
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div
          className={styles.sidebarOverlay}
          data-open={isSidebarOpen ? 'true' : 'false'}
          aria-hidden={isSidebarOpen ? 'false' : 'true'}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsSidebarOpen(false)
          }}
        />

        <aside
          className={styles.sidebar}
          data-open={isSidebarOpen ? 'true' : 'false'}
          aria-label="Chats sidebar"
        >
          <div className={styles.sidebarTop}>
            <button className={styles.profileButton} type="button" title="Profile">
              <span className={styles.profileMark} aria-hidden="true">
                {(() => {
                  const name = getUserName() ?? 'U'
                  const parts = name.trim().split(/\s+/).slice(0, 2)
                  return parts.map((p) => p[0]?.toUpperCase()).join('') || 'U'
                })()}
              </span>
            </button>

            <div className={styles.brandBlock}>
              <div className={styles.brand}>NexChat</div>
              <div className={styles.brandSub}>Messages</div>
            </div>

            <div className={styles.actions}>
              <button className={styles.iconButton} type="button" title="New chat">
                <Icon title="New chat">
                  <path
                    d="M12 5a1 1 0 0 1 1 1v5h5a1 1 0 1 1 0 2h-5v5a1 1 0 1 1-2 0v-5H6a1 1 0 1 1 0-2h5V6a1 1 0 0 1 1-1Z"
                    fill="currentColor"
                  />
                </Icon>
              </button>
              <button className={styles.iconButton} type="button" title="Settings">
                <Icon title="Settings">
                  <path
                    d="M19.14 12.94a7.9 7.9 0 0 0 .05-.94 7.9 7.9 0 0 0-.05-.94l2.03-1.58a.8.8 0 0 0 .19-1.02l-1.92-3.32a.8.8 0 0 0-.98-.35l-2.39.96a7.6 7.6 0 0 0-1.63-.94l-.36-2.54A.8.8 0 0 0 12.29 1h-3.84a.8.8 0 0 0-.79.68l-.36 2.54c-.58.23-1.12.54-1.63.94l-2.39-.96a.8.8 0 0 0-.98.35L.38 7.87a.8.8 0 0 0 .19 1.02l2.03 1.58c-.03.31-.05.62-.05.94 0 .32.02.63.05.94L.57 14.52a.8.8 0 0 0-.19 1.02l1.92 3.32c.2.35.62.5.98.35l2.39-.96c.51.4 1.05.71 1.63.94l.36 2.54c.07.39.4.68.79.68h3.84c.39 0 .72-.29.79-.68l.36-2.54c.58-.23 1.12-.54 1.63-.94l2.39.96c.36.15.78 0 .98-.35l1.92-3.32a.8.8 0 0 0-.19-1.02l-2.03-1.58ZM10.37 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
                    fill="currentColor"
                  />
                </Icon>
              </button>
            </div>
          </div>

          <div className={styles.searchWrap}>
            <Icon title="Search">
              <path
                d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm8.707 11.293a1 1 0 0 0-1.414 1.414l2 2a1 1 0 0 0 1.414-1.414l-2-2Z"
                fill="currentColor"
              />
            </Icon>
            <input
              className={styles.search}
              type="text"
              placeholder="Search users"
              aria-label="Search users"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className={styles.chatList} role="list" aria-label="Chat list">
            {searchQuery.trim().length >= 2 ? (
              searchLoading || !searchFetched ? (
                <div className={styles.searchState} aria-live="polite" aria-busy={searchLoading}>
                  <div className={styles.searchStateIcon}>
                    <div className={styles.searchStateSpinner}>
                      <Icon title="Searching">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.9 1.57h1.6c0-.93-.56-2.01-2.1-2.01-1.65 0-2.2.81-2.2 1.43 0 1.25 1.15 1.76 2.55 2.19 1.8.55 2.34 1.18 2.34 1.95 0 .9-.79 1.52-2.1 1.52-1.5 0-2.05-.68-2.05-1.57H8.45c0 1.01.66 2.01 2.1 2.01 1.65 0 2.2-.81 2.2-1.43 0-1.25-1.15-1.76-2.55-2.19z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                  </div>
                  <p className={styles.searchStateTitle}>Searching…</p>
                  <p className={styles.searchStateSubtitle}>
                    {searchLoading ? 'Finding users matching your query' : 'Please wait'}
                  </p>
                </div>
              ) : searchResults.length === 0 ? (
                <div className={styles.searchState} aria-live="polite">
                  <div className={styles.searchStateIcon}>
                    <Icon title="No users">
                      <path
                        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
                        fill="currentColor"
                      />
                    </Icon>
                  </div>
                  <p className={styles.searchStateTitle}>No users found</p>
                  <p className={styles.searchStateSubtitle}>Try a different name or check the spelling</p>
                </div>
              ) : (
                <div className={styles.searchResultsList} role="list">
                  {searchResults.map((user) => {
                    const displayName = getSearchUserDisplayName(user)
                    const key = user.userId ?? user.userName ?? user.email ?? displayName
                    const username = user.userName ?? user.name ?? user.email ?? displayName
                    const userChatId = `user:${username}`
                    return (
                      <button
                        key={key}
                        type="button"
                        className={styles.searchResultItem}
                        role="listitem"
                        onClick={() => {
                          setRooms((prev) => {
                            if (prev.some((c) => c.id === userChatId)) return prev
                            return [
                              {
                                id: userChatId,
                                name: displayName,
                                lastMessage: 'No messages yet',
                                time: '',
                              },
                              ...prev,
                            ]
                          })
                          setSelectedId(userChatId)
                          setIsSidebarOpen(false)
                          setSearchQuery('')
                          setSearchResults([])
                        }}
                      >
                        <Avatar name={displayName} />
                        <div className={styles.searchResultMeta}>
                          <span className={styles.searchResultName}>{displayName}</span>
                          {user.email && user.email !== displayName && (
                            <span className={styles.searchResultDetail}>{user.email}</span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            ) : chatsLoading ? (
              <div className={styles.chatListLoader} aria-live="polite" aria-busy="true">
                <div className={styles.chatListLoaderSpinner}>
                  <Icon title="Loading">
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.9 1.57h1.6c0-.93-.56-2.01-2.1-2.01-1.65 0-2.2.81-2.2 1.43 0 1.25 1.15 1.76 2.55 2.19 1.8.55 2.34 1.18 2.34 1.95 0 .9-.79 1.52-2.1 1.52-1.5 0-2.05-.68-2.05-1.57H8.45c0 1.01.66 2.01 2.1 2.01 1.65 0 2.2-.81 2.2-1.43 0-1.25-1.15-1.76-2.55-2.19z"
                      fill="currentColor"
                    />
                  </Icon>
                </div>
                <p className={styles.chatListLoaderText}>Loading chats…</p>
                <p className={styles.chatListLoaderSubtext}>Fetching your conversations</p>
              </div>
            ) : (
              allItems.map((c) => {
                const selected = c.id === selectedId
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={styles.chatItem}
                    data-selected={selected ? 'true' : 'false'}
                    onClick={() => {
                      setSelectedId(c.id)
                      setIsSidebarOpen(false)
                    }}
                    role="listitem"
                  >
                    <Avatar name={c.name} />
                    <div className={styles.chatMeta}>
                      <div className={styles.chatRow}>
                        <div className={styles.chatName}>{c.name}</div>
                        <div className={styles.chatTime}>{c.time}</div>
                      </div>
                      <div className={styles.chatRow}>
                        <div className={styles.chatPreview}>{c.lastMessage}</div>
                        {c.unreadCount ? (
                          <span className={styles.badge} aria-label={`${c.unreadCount} unread`}>
                            {c.unreadCount}
                          </span>
                        ) : (
                          <span className={styles.badgeSpacer} aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        <main className={styles.main} aria-label="Chat content">
          {selected ? (
            <div className={styles.placeholder}>
              <div className={styles.placeholderTop}>
                <div className={styles.placeholderLeft}>
                  <button
                    className={`${styles.iconButton} ${styles.mobileMenuButton}`}
                    type="button"
                    title="Chats"
                    aria-label="Open chats"
                    onClick={() => setIsSidebarOpen(true)}
                  >
                    <Icon title="Chats">
                      <path
                        d="M4 7h16a1 1 0 1 0 0-2H4a1 1 0 0 0 0 2Zm16 4H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Zm0 6H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Z"
                        fill="currentColor"
                      />
                    </Icon>
                  </button>
                  <Avatar name={selected.name} />
                  <div className={styles.placeholderTitle}>
                    <div className={styles.placeholderName}>{selected.name}</div>
                    <div className={styles.placeholderSub}>
                      {selected.oneToOneRoom
                        ? 'Direct message'
                        : selectedRoomId
                          ? `Room ID · ${selectedRoomId}`
                          : selected.isOnline
                            ? 'Online'
                            : 'Ready to chat'}
                    </div>
                  </div>
                </div>
                <div className={styles.placeholderActions}>
                  <button className={styles.iconButton} type="button" title="Call">
                    <Icon title="Call">
                      <path
                        d="M7.1 3.5c.3-.3.7-.5 1.1-.5h2c.6 0 1 .4 1.1 1l.4 2c.1.5-.1 1-.6 1.2l-1.1.6a11.3 11.3 0 0 0 5.2 5.2l.6-1.1c.2-.5.7-.7 1.2-.6l2 .4c.6.1 1 .6 1 1.1v2c0 .4-.2.8-.5 1.1-.8.8-2 1.2-3.1.9-7.1-2-12.6-7.5-14.6-14.6-.3-1.1.1-2.3.9-3.1Z"
                        fill="currentColor"
                      />
                    </Icon>
                  </button>
                  <button className={styles.iconButton} type="button" title="More">
                    <Icon title="More">
                      <path
                        d="M12 6.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm0 7a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z"
                        fill="currentColor"
                      />
                    </Icon>
                  </button>
                </div>
              </div>

              <div className={styles.conversation}>
                <div className={styles.messages} aria-label="Messages">
                  {messagesLoadingFor === selectedId ? (
                    <div className={styles.noMessagesContainer}>
                      <div className={styles.noMessagesContent}>
                        <div className={styles.noMessagesIconWrapper}>
                          <div className={styles.noMessagesIcon}>
                            <Icon title="Loading">
                              <path
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.9 1.57h1.6c0-.93-.56-2.01-2.1-2.01-1.65 0-2.2.81-2.2 1.43 0 1.25 1.15 1.76 2.55 2.19 1.8.55 2.34 1.18 2.34 1.95 0 .9-.79 1.52-2.1 1.52-1.5 0-2.05-.68-2.05-1.57H8.45c0 1.01.66 2.01 2.1 2.01 1.65 0 2.2-.81 2.2-1.43 0-1.25-1.15-1.76-2.55-2.19z"
                                fill="currentColor"
                              />
                            </Icon>
                          </div>
                          <div className={styles.noMessagesIconGlow} />
                        </div>
                        <h2 className={styles.noMessagesTitle}>Loading messages…</h2>
                        <p className={styles.noMessagesSubtitle}>Fetching the latest messages for this room.</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className={styles.noMessagesContainer}>
                      <div className={styles.noMessagesContent}>
                        <div className={styles.noMessagesIconWrapper}>
                          <div className={styles.noMessagesIcon}>
                            <Icon title="Message">
                              <path
                                d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
                                fill="currentColor"
                              />
                            </Icon>
                          </div>
                          <div className={styles.noMessagesIconGlow} />
                        </div>
                        <h2 className={styles.noMessagesTitle}>Start the conversation</h2>
                        <p className={styles.noMessagesSubtitle}>
                          Be the first to send a message in this room
                        </p>

                        <div className={styles.noMessagesTips}>
                          <div className={styles.noMessagesTip}>
                            <div className={styles.noMessagesTipIcon}>
                              <Icon title="Type">
                                <path
                                  d="M9 4v1.38c-.83-.33-1.72-.5-2.61-.5-1.79 0-3.58.68-4.95 2.05l3.33 3.33h1.11v1.11c.86.86 1.98 1.31 3.11 1.36V15H6v3c0 1.1.9 2 2 2h10c1.66 0 3-1.34 3-3V4H9zm-1.11 6.41V8.26H5.61L4.57 7.22a5.07 5.07 0 0 1 1.82-.34c1.34 0 2.59.52 3.54 1.46l1.41 1.41-.2.2a2.7 2.7 0 0 1-1.92.8c-.47 0-.93-.12-1.33-.34zM19 17c0 .55-.45 1-1 1s-1-.45-1-1v-2h-4v-2h4V9h2v8z"
                                  fill="currentColor"
                                />
                              </Icon>
                            </div>
                            <div className={styles.noMessagesTipText}>
                              <div className={styles.noMessagesTipTitle}>Type a message</div>
                              <div className={styles.noMessagesTipDesc}>Share your thoughts below</div>
                            </div>
                          </div>

                          <div className={styles.noMessagesTip}>
                            <div className={styles.noMessagesTipIcon}>
                              <Icon title="Attach">
                                <path
                                  d="M10.6 18.2a4 4 0 0 1-5.66-5.66l7.07-7.07a3 3 0 0 1 4.24 4.24l-7.07 7.07a2 2 0 1 1-2.83-2.83l6.36-6.36a1 1 0 0 1 1.42 1.42l-6.36 6.36a0 0 0 0 0 0 0 .01.01 0 0 0 .01 0l7.07-7.07a1 1 0 0 0-1.42-1.42l-7.07 7.07a2 2 0 1 0 2.83 2.83l7.07-7.07a5 5 0 1 0-7.07-7.07L3.53 11.83a6 6 0 1 0 8.49 8.49 1 1 0 1 1-1.42-1.42Z"
                                  fill="currentColor"
                                />
                              </Icon>
                            </div>
                            <div className={styles.noMessagesTipText}>
                              <div className={styles.noMessagesTipTitle}>Attach a file</div>
                              <div className={styles.noMessagesTipDesc}>Share documents or images</div>
                            </div>
                          </div>

                          <div className={styles.noMessagesTip}>
                            <div className={styles.noMessagesTipIcon}>
                              <Icon title="Send">
                                <path
                                  d="M3 11.2 21 3l-8.2 18-1.9-7.2L3 11.2Zm9.1 1.5 1.1 4.3L17.6 7.4 12.1 12.7Z"
                                  fill="currentColor"
                                />
                              </Icon>
                            </div>
                            <div className={styles.noMessagesTipText}>
                              <div className={styles.noMessagesTipTitle}>Press Enter</div>
                              <div className={styles.noMessagesTipDesc}>Quick send shortcut</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className={styles.messageStack}>
                      {messages.map((m) => {
                        const isMe = m.from === 'me'
                        const isSystem = m.from === 'system'
                        const senderName = m.sender || 'Unknown'
                        
                        if (isSystem) {
                          return (
                            <div key={m.id} className={styles.systemMessage}>
                              {m.text}
                            </div>
                          )
                        }
                        
                        return (
                          <div
                            key={m.id}
                            className={styles.messageRow}
                            data-me={isMe ? 'true' : 'false'}
                          >
                            {!isMe && (
                              <div className={styles.messageAvatar}>
                                <UserIcon />
                              </div>
                            )}
                            <div className={styles.messageContent}>
                              <div className={styles.bubble} data-me={isMe ? 'true' : 'false'}>
                                <div className={styles.bubbleHeader}>
                                  <span className={styles.bubbleSender}>{senderName}</span>
                                </div>
                                {m.isUploading ? (
                                  <div className={styles.uploadingIndicator}>
                                    <div className={styles.uploadingSpinner}>
                                      <Icon title="Uploading">
                                        <path
                                          d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          fill="none"
                                        />
                                      </Icon>
                                    </div>
                                    <span className={styles.uploadingText}>Uploading...</span>
                                  </div>
                                ) : (
                                  <>
                                    {m.attachment && isImageMimeType(m.attachment.mimeType) ? (
                                      <div className={styles.imageMessage}>
                                        {(() => {
                                          const imageUrl = getImageUrl(m.attachment.downloadUrl)
                                          return imageUrl ? (
                                            <a
                                              href={imageUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className={styles.imageMessageLink}
                                            >
                                              <img
                                                src={imageUrl}
                                                alt={m.attachment.name}
                                                className={styles.imageMessageImg}
                                                loading="lazy"
                                              />
                                            </a>
                                          ) : (
                                            <div className={styles.imageMessagePlaceholder}>
                                              <Icon title="Image">
                                                <path
                                                  d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
                                                  fill="currentColor"
                                                />
                                              </Icon>
                                              <span>Image unavailable</span>
                                            </div>
                                          )
                                        })()}
                                        {m.text && m.text.trim() ? (
                                          <div className={styles.imageMessageCaption}>{m.text}</div>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <>
                                        {m.text ? <div className={styles.bubbleText}>{m.text}</div> : null}
                                        {m.attachment ? (
                                          <div className={styles.bubbleAttachment}>
                                            {(() => {
                                              const downloadUrl = getImageUrl(m.attachment.downloadUrl)
                                              return downloadUrl ? (
                                                <a
                                                  className={styles.attachmentName}
                                                  href={downloadUrl}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                >
                                                  {m.attachment.name}
                                                </a>
                                              ) : (
                                                <div className={styles.attachmentName}>{m.attachment.name}</div>
                                              )
                                            })()}
                                            <div className={styles.attachmentSize}>
                                              {formatFileSize(m.attachment.size)}
                                            </div>
                                          </div>
                                        ) : null}
                                      </>
                                    )}
                                  </>
                                )}
                                {m.attachment && m.isUploading && (
                                  <div className={styles.uploadingFileInfo}>
                                    <div className={styles.uploadingFileName}>{m.attachment.name}</div>
                                    <div className={styles.uploadingFileSize}>
                                      {formatFileSize(m.attachment.size)}
                                    </div>
                                  </div>
                                )}
                                <div className={styles.bubbleMeta}>
                                  {m.isUploading ? (
                                    <span className={styles.uploadingMeta}>Uploading...</span>
                                  ) : (
                                    new Date(m.createdAt).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  )}
                                </div>
                              </div>
                            </div>
                            {isMe && (
                              <div className={styles.messageAvatar}>
                                <UserIcon />
                              </div>
                            )}
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <form
                  className={styles.composer}
                  onSubmit={(e) => {
                    e.preventDefault()
                    sendMessage()
                  }}
                >
                  <input
                    ref={fileInputRef}
                    className={styles.hiddenFile}
                    type="file"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      // Clear file error when attaching new file
                      setFileError(null)
                      if (fileErrorTimeoutRef.current) {
                        window.clearTimeout(fileErrorTimeoutRef.current)
                        fileErrorTimeoutRef.current = null
                      }
                      
                      // Clear file error system messages when attaching new file
                      if (selectedId && fileErrorMessageIdsRef.current.size > 0) {
                        setMessagesByChat((prev) => {
                          const existing = prev[selectedId] ?? []
                          const filtered = existing.filter((m) => !fileErrorMessageIdsRef.current.has(m.id))
                          fileErrorMessageIdsRef.current.clear()
                          return { ...prev, [selectedId]: filtered }
                        })
                      }
                      
                      if (!f) {
                        setAttachedFile(null)
                        return
                      }
                      
                      // Validate file size
                      if (f.size < MIN_FILE_SIZE) {
                        setFileError(`File size must be at least ${formatFileSize(MIN_FILE_SIZE)}.`)
                        setAttachedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        return
                      }
                      
                      if (f.size > MAX_FILE_SIZE) {
                        setFileError(`File size must not exceed ${formatFileSize(MAX_FILE_SIZE)}.`)
                        setAttachedFile(null)
                        if (fileInputRef.current) fileInputRef.current.value = ''
                        return
                      }
                      
                      setAttachedFile(f)
                    }}
                  />

                  {fileError ? (
                    <div className={styles.fileError} role="alert">
                      {fileError}
                    </div>
                  ) : null}
                  {attachedFile ? (
                    <div className={styles.attachmentChipRow}>
                      <div className={styles.attachmentChip}>
                        <span className={styles.attachmentChipName}>
                          {attachedFile.name}
                        </span>
                        <span className={styles.attachmentChipSize}>
                          {formatFileSize(attachedFile.size)}
                        </span>
                        <button
                          type="button"
                          className={styles.chipRemove}
                          onClick={() => {
                            setAttachedFile(null)
                            setFileError(null)
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          aria-label="Remove attachment"
                        >
                          <Icon title="Close">
                            <path
                              d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                              fill="currentColor"
                            />
                          </Icon>
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className={styles.composerRow}>
                    <button
                      type="button"
                      className={styles.attachButton}
                      onClick={() => fileInputRef.current?.click()}
                      aria-label="Attach file"
                      title="Attach file"
                    >
                      <Icon title="Attach">
                        <path
                          d="M10.6 18.2a4 4 0 0 1-5.66-5.66l7.07-7.07a3 3 0 0 1 4.24 4.24l-7.07 7.07a2 2 0 1 1-2.83-2.83l6.36-6.36a1 1 0 0 1 1.42 1.42l-6.36 6.36a0 0 0 0 0 0 0 .01.01 0 0 0 .01 0l7.07-7.07a1 1 0 0 0-1.42-1.42l-7.07 7.07a2 2 0 1 0 2.83 2.83l7.07-7.07a5 5 0 1 0-7.07-7.07L3.53 11.83a6 6 0 1 0 8.49 8.49 1 1 0 1 1-1.42-1.42Z"
                          fill="currentColor"
                        />
                      </Icon>
                    </button>

                    <textarea
                      className={styles.textarea}
                      placeholder="Type a message…"
                      value={draft}
                      onChange={(e) => {
                        setDraft(e.target.value)
                        // Clear file error when user types
                        if (fileError) {
                          setFileError(null)
                          if (fileErrorTimeoutRef.current) {
                            window.clearTimeout(fileErrorTimeoutRef.current)
                            fileErrorTimeoutRef.current = null
                          }
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                      rows={1}
                    />

                    <button
                      type="submit"
                      className={styles.sendButton}
                      aria-label="Send message"
                      title="Send"
                      disabled={draft.trim().length === 0 && !attachedFile}
                    >
                      <Icon title="Send">
                        <path
                          d="M3 11.2 21 3l-8.2 18-1.9-7.2L3 11.2Zm9.1 1.5 1.1 4.3L17.6 7.4 12.1 12.7Z"
                          fill="currentColor"
                        />
                      </Icon>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className={styles.empty}>
              <button
                className={`${styles.iconButton} ${styles.mobileEmptyMenu}`}
                type="button"
                title="Chats"
                aria-label="Open chats"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Icon title="Chats">
                  <path
                    d="M4 7h16a1 1 0 1 0 0-2H4a1 1 0 0 0 0 2Zm16 4H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Zm0 6H4a1 1 0 1 0 0 2h16a1 1 0 1 0 0-2Z"
                    fill="currentColor"
                  />
                </Icon>
              </button>
              <div className={styles.emptyContainer}>
                <div className={styles.emptyHeader}>
                  <div className={styles.emptyIconWrapper}>
                    <div className={styles.emptyIcon}>
                      <Icon title="Chat">
                        <path
                          d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                  </div>
                  <h1 className={styles.emptyTitle}>Welcome to NexChat</h1>
                  <p className={styles.emptySubtitle}>
                    Start a conversation or join an existing room to begin chatting
                  </p>
                </div>

                <div className={styles.emptyCards}>
                  <button
                    className={styles.emptyCard}
                    type="button"
                    onClick={() => openRoomDialog('create')}
                  >
                    <div className={styles.emptyCardIcon}>
                      <Icon title="Create room">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                    <div className={styles.emptyCardContent}>
                      <h3 className={styles.emptyCardTitle}>Create a Room</h3>
                      <p className={styles.emptyCardDescription}>
                        Start a new room and invite others to join your conversation
                      </p>
                    </div>
                    <div className={styles.emptyCardArrow}>
                      <Icon title="Arrow">
                        <path
                          d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                  </button>

                  <button
                    className={styles.emptyCard}
                    type="button"
                    onClick={() => openRoomDialog('join')}
                  >
                    <div className={styles.emptyCardIcon}>
                      <Icon title="Join room">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                    <div className={styles.emptyCardContent}>
                      <h3 className={styles.emptyCardTitle}>Join a Room</h3>
                      <p className={styles.emptyCardDescription}>
                        Enter a room ID to join an existing conversation
                      </p>
                    </div>
                    <div className={styles.emptyCardArrow}>
                      <Icon title="Arrow">
                        <path
                          d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                  </button>
                </div>

                <div className={styles.emptyFeatures}>
                  <div className={styles.emptyFeature}>
                    <div className={styles.emptyFeatureIcon}>
                      <Icon title="Real-time">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                    <div className={styles.emptyFeatureText}>
                      <div className={styles.emptyFeatureTitle}>Real-time messaging</div>
                      <div className={styles.emptyFeatureDesc}>Instant delivery</div>
                    </div>
                  </div>
                  <div className={styles.emptyFeature}>
                    <div className={styles.emptyFeatureIcon}>
                      <Icon title="Secure">
                        <path
                          d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                    <div className={styles.emptyFeatureText}>
                      <div className={styles.emptyFeatureTitle}>Secure & private</div>
                      <div className={styles.emptyFeatureDesc}>End-to-end encrypted</div>
                    </div>
                  </div>
                  <div className={styles.emptyFeature}>
                    <div className={styles.emptyFeatureIcon}>
                      <Icon title="Fast">
                        <path
                          d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"
                          fill="currentColor"
                        />
                      </Icon>
                    </div>
                    <div className={styles.emptyFeatureText}>
                      <div className={styles.emptyFeatureTitle}>Lightning fast</div>
                      <div className={styles.emptyFeatureDesc}>Optimized performance</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {roomAction ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={roomAction === 'create' ? 'Create room' : 'Join room'}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeRoomDialog()
          }}
        >
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  {roomAction === 'create' ? 'Create a new room' : 'Join a room'}
                </div>
                <div className={styles.modalSub}>
                  {roomAction === 'create'
                    ? 'Pick a Room ID to share, or leave it empty to auto-generate.'
                    : 'Enter the Room ID you received from your friend or team.'}
                </div>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeRoomDialog}
                disabled={roomBusy}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {roomError ? (
                <div className={styles.alert} role="alert">
                  <span className={styles.alertIcon} aria-hidden="true">
                    !
                  </span>
                  <div className={styles.alertText}>{roomError}</div>
                </div>
              ) : null}

              <div className={styles.formField}>
                <label className={styles.formLabel} htmlFor={roomIdInputId}>
                  Room ID
                </label>
                <div
                  className={styles.formInputWrap}
                  data-invalid={roomError ? 'true' : 'false'}
                >
                  <input
                    ref={roomIdInputRef}
                    id={roomIdInputId}
                    className={styles.formInput}
                    type="text"
                    placeholder={roomAction === 'create' ? 'e.g. nexchat-team' : 'e.g. 7F2A9C'}
                    value={roomId}
                    onChange={(e) => {
                      setRoomId(e.target.value)
                      if (roomError) setRoomError(null)
                    }}
                    disabled={roomBusy}
                    autoComplete="off"
                    inputMode="text"
                  />
                </div>
                <div className={styles.formHelper}>
                  Allowed: letters, numbers, <code>_</code> and <code>-</code>.
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.secondary}
                type="button"
                onClick={closeRoomDialog}
                disabled={roomBusy}
              >
                Cancel
              </button>
              <button
                className={styles.primary}
                type="button"
                onClick={() => void submitRoom(roomAction)}
                disabled={roomBusy}
                aria-busy={roomBusy}
              >
                {roomBusy
                  ? roomAction === 'create'
                    ? 'Creating…'
                    : 'Joining…'
                  : roomAction === 'create'
                    ? 'Create room'
                    : 'Join room'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

