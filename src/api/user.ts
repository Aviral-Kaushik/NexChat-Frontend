import { http } from './http'

/** Room as returned by GET /user/chats */
export type UserChatRoom = {
  roomId: string
  name?: string
  lastMessage?: string
  lastMessageAt?: string
  updatedAt?: string
  unreadCount?: number
}

/** Response from GET /user/chats - list of rooms or { rooms: [...] } */
export type UserChatsResponse = UserChatRoom[] | { rooms?: UserChatRoom[] }

export async function getUserChats(): Promise<UserChatRoom[]> {
  if (import.meta.env.DEV) console.log('[user][chats] fetching')
  const res = await http.get<UserChatsResponse>('/user/chats')
  const data = res.data
  if (import.meta.env.DEV) console.log('[user][chats] response', { data })
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { rooms?: UserChatRoom[] }).rooms)) {
    return (data as { rooms: UserChatRoom[] }).rooms
  }
  return []
}

/** User as returned by GET /user/search?q= */
export type SearchUser = {
  userId?: string
  userName?: string
  name?: string
  email?: string
}

export type UserSearchResponse = SearchUser[] | { users?: SearchUser[] }

export async function searchUsers(q: string): Promise<SearchUser[]> {
  const trimmed = q.trim()
  if (trimmed.length < 2) return []
  if (import.meta.env.DEV) console.log('[user][search] request', { q: trimmed })
  const res = await http.get<UserSearchResponse>('/user/search', {
    params: { q: trimmed },
  })
  const data = res.data
  if (import.meta.env.DEV) console.log('[user][search] response', { data })
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { users?: SearchUser[] }).users)) {
    return (data as { users: SearchUser[] }).users
  }
  return []
}
