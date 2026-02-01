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
