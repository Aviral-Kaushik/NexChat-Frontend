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

/** Response from POST /rooms/one-to-one - creates or returns a room for two users */
export type OneToOneRoomResponse = {
  roomId: string
  [key: string]: unknown
}

export async function createOneToOneRoom(username: string): Promise<OneToOneRoomResponse> {
  if (import.meta.env.DEV) console.log('[rooms][one-to-one] request', { username })
  const res = await http.post<OneToOneRoomResponse>('/rooms/one-to-one', null, {
    params: { username },
  })
  if (import.meta.env.DEV) console.log('[rooms][one-to-one] response', { status: res.status, data: res.data })
  const data = res.data
  if (data && typeof data === 'object' && typeof (data as OneToOneRoomResponse).roomId === 'string') {
    return data as OneToOneRoomResponse
  }
  throw new Error('Invalid one-to-one room response: missing roomId')
}

