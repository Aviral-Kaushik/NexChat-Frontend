import { useEffect, useId, useMemo, useRef, useState } from 'react'
import styles from './ChatShellPage.module.css'

type ChatPreview = {
  id: string
  name: string
  lastMessage: string
  time: string
  unreadCount?: number
  isOnline?: boolean
}

type RoomAction = 'create' | 'join'

type ChatMessage = {
  id: string
  chatId: string
  from: 'me' | 'system'
  text?: string
  attachment?: {
    name: string
    size: number
  }
  createdAt: number
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
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
      width="18"
      height="18"
      aria-hidden="true"
      focusable="false"
    >
      <title>{title}</title>
      {children}
    </svg>
  )
}

function Avatar({ name, online }: { name: string; online?: boolean }) {
  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p[0]?.toUpperCase()).join('')
  }, [name])

  return (
    <span className={styles.avatar} aria-hidden="true">
      <span className={styles.avatarInner}>{initials}</span>
      {online ? <span className={styles.onlineDot} /> : null}
    </span>
  )
}

export function ChatShellPage() {
  const chats: ChatPreview[] = useMemo(
    () => [
      {
        id: 'c1',
        name: 'Aviral',
        lastMessage: 'Let’s ship the UI first, then wire APIs.',
        time: '2:18 PM',
        unreadCount: 2,
        isOnline: true,
      },
      {
        id: 'c2',
        name: 'NexChat Team',
        lastMessage: 'Sidebar polish looks great. Add empty state next.',
        time: '1:04 PM',
        unreadCount: 0,
      },
      {
        id: 'c3',
        name: 'Design',
        lastMessage: 'Use a soft glass effect with subtle gradients.',
        time: 'Yesterday',
        unreadCount: 0,
      },
      {
        id: 'c4',
        name: 'Support',
        lastMessage: 'We can add “typing…” and read receipts later.',
        time: 'Mon',
        unreadCount: 1,
      },
      {
        id: 'c5',
        name: 'Akash',
        lastMessage: 'Bro, WhatsApp-like layout is ready?',
        time: 'Sun',
        unreadCount: 0,
        isOnline: true,
      },
    ],
    [],
  )

  const [rooms, setRooms] = useState<ChatPreview[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const allItems = useMemo(() => [...rooms, ...chats], [rooms, chats])

  const selected = useMemo(
    () => allItems.find((c) => c.id === selectedId) ?? null,
    [allItems, selectedId],
  )

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

  const messages = useMemo(() => {
    if (!selectedId) return []
    return messagesByChat[selectedId] ?? []
  }, [messagesByChat, selectedId])

  useEffect(() => {
    if (!roomAction) return
    const t = window.setTimeout(() => roomIdInputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [roomAction])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length, selectedId])

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
      // TODO: Replace this mock with backend API call.
      await sleep(750)

      // Mock backend error examples:
      if (
        action === 'join' &&
        (normalized === '404' || normalized.toLowerCase() === 'not-found')
      ) {
        setRoomError('Room not found. Double-check the Room ID and try again.')
        return
      }
      if (
        action === 'create' &&
        (normalized.toLowerCase() === 'taken' || normalized.toLowerCase() === 'exists')
      ) {
        setRoomError('That Room ID is already taken. Try a different one.')
        return
      }
      if (normalized.toLowerCase() === 'error') {
        setRoomError('Something went wrong on our side. Please try again in a moment.')
        return
      }

      const finalId =
        normalized.length > 0
          ? normalized
          : `room-${Math.random().toString(36).slice(2, 8)}`

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

  function sendMessage() {
    if (!selectedId) return
    const text = draft.trim()
    if (text.length === 0 && !attachedFile) return

    const msg: ChatMessage = {
      id: `m:${Date.now()}:${Math.random().toString(16).slice(2)}`,
      chatId: selectedId,
      from: 'me',
      text: text.length ? text : undefined,
      attachment: attachedFile
        ? { name: attachedFile.name, size: attachedFile.size }
        : undefined,
      createdAt: Date.now(),
    }

    setMessagesByChat((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), msg],
    }))
    setDraft('')
    setAttachedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <aside className={styles.sidebar} aria-label="Chats sidebar">
          <div className={styles.sidebarTop}>
            <button className={styles.profileButton} type="button" title="Profile">
              <span className={styles.profileMark} aria-hidden="true" />
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
                d="M10.5 3a7.5 7.5 0 1 1 4.7 13.35l3.22 3.22a1 1 0 0 1-1.42 1.42l-3.22-3.22A7.5 7.5 0 0 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
                fill="currentColor"
              />
            </Icon>
            <input
              className={styles.search}
              type="text"
              placeholder="Search chats"
              aria-label="Search chats"
            />
          </div>

          <div className={styles.chatList} role="list" aria-label="Chat list">
            {allItems.map((c) => {
              const selected = c.id === selectedId
              return (
                <button
                  key={c.id}
                  type="button"
                  className={styles.chatItem}
                  data-selected={selected ? 'true' : 'false'}
                  onClick={() => setSelectedId(c.id)}
                  role="listitem"
                >
                  <Avatar name={c.name} online={c.isOnline} />
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
            })}
          </div>
        </aside>

        <main className={styles.main} aria-label="Chat content">
          {selected ? (
            <div className={styles.placeholder}>
              <div className={styles.placeholderTop}>
                <div className={styles.placeholderLeft}>
                  <Avatar name={selected.name} online={selected.isOnline} />
                  <div className={styles.placeholderTitle}>
                    <div className={styles.placeholderName}>{selected.name}</div>
                    <div className={styles.placeholderSub}>
                      Messages UI will appear here next.
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
                  {messages.length === 0 ? (
                    <div className={styles.emptyCenter}>
                      <div className={styles.illus} aria-hidden="true">
                        <div className={styles.illusRing} />
                        <div className={styles.illusCore}>
                          <span className={styles.illusMark} />
                        </div>
                      </div>
                      <h2 className={styles.emptyTitle}>No messages yet</h2>
                      <p className={styles.emptyCopy}>
                        Send a message or attach a file to start the conversation.
                      </p>
                    </div>
                  ) : (
                    <div className={styles.messageStack}>
                      {messages.map((m) => {
                        const isMe = m.from === 'me'
                        return (
                          <div
                            key={m.id}
                            className={styles.messageRow}
                            data-me={isMe ? 'true' : 'false'}
                          >
                            <div className={styles.bubble} data-me={isMe ? 'true' : 'false'}>
                              {m.text ? <div className={styles.bubbleText}>{m.text}</div> : null}
                              {m.attachment ? (
                                <div className={styles.bubbleAttachment}>
                                  <div className={styles.attachmentName}>
                                    {m.attachment.name}
                                  </div>
                                  <div className={styles.attachmentSize}>
                                    {formatFileSize(m.attachment.size)}
                                  </div>
                                </div>
                              ) : null}
                              <div className={styles.bubbleMeta}>
                                {new Date(m.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
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
                      setAttachedFile(f)
                    }}
                  />

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
                            if (fileInputRef.current) fileInputRef.current.value = ''
                          }}
                          aria-label="Remove attachment"
                        >
                          ×
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
                      onChange={(e) => setDraft(e.target.value)}
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
              <div className={styles.emptyCenter}>
                <div className={styles.illus} aria-hidden="true">
                  <div className={styles.illusRing} />
                  <div className={styles.illusCore}>
                    <span className={styles.illusMark} />
                  </div>
                </div>
                <h2 className={styles.emptyTitle}>Welcome to NexChat</h2>
                <p className={styles.emptyCopy}>
                  Select a chat on the left to view messages. Your real-time
                  conversations will appear here.
                </p>
                <div className={styles.emptyCtas}>
                  <button
                    className={styles.primary}
                    type="button"
                    onClick={() => openRoomDialog('create')}
                  >
                    Create a room
                  </button>
                  <button
                    className={styles.secondary}
                    type="button"
                    onClick={() => openRoomDialog('join')}
                  >
                    Join a room
                  </button>
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

