import { http } from './http'

export type CreateRoomRequest = {
  roomId: string
}

export async function createRoom(roomId: string): Promise<unknown> {
  const payload: CreateRoomRequest = { roomId }
  if (import.meta.env.DEV) console.log('[rooms][create] request', payload)
  const res = await http.post('/rooms', payload)
  if (import.meta.env.DEV) console.log('[rooms][create] response', { status: res.status, data: res.data })
  return res.data
}

export async function joinRoom(roomId: string): Promise<unknown> {
  if (import.meta.env.DEV) console.log('[rooms][join] request', { roomId })
  const res = await http.get(`/rooms/${encodeURIComponent(roomId)}`)
  if (import.meta.env.DEV) console.log('[rooms][join] response', { status: res.status, data: res.data })
  return res.data
}

