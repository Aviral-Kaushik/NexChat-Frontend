import { http } from './http'

export type MessageType = 'FILE' | 'TEXT'

export type FileMeta = {
  originalName: string
  storedName: string
  downloadUrl: string
  mimeType: string
  size: number
}

export type Message = {
  messageId: string
  roomId: string
  sender: string
  content: string
  type: MessageType
  file?: FileMeta
  timestamp: string
}

export async function getRoomMessages(roomId: string): Promise<Message[]> {
  if (import.meta.env.DEV) console.log('[messages][list] request', { roomId })
  const res = await http.get<Message[]>(`/rooms/${encodeURIComponent(roomId)}/messages`)
  if (import.meta.env.DEV) console.log('[messages][list] response', { status: res.status, data: res.data })
  return res.data
}

