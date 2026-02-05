import { http } from './http'

export type CreateRoomRequest = {
  roomId: string
}

export async function createRoom(roomId: string): Promise<unknown> {
  const payload: CreateRoomRequest = { roomId }
  const res = await http.post('/rooms', payload)
  console.log('[rooms][create]', { roomId, status: res.status })
  return res.data
}

export async function joinRoom(roomId: string): Promise<unknown> {
  const res = await http.get(`/rooms/${encodeURIComponent(roomId)}`)
  console.log('[rooms][join]', { roomId, status: res.status })
  return res.data
}

/** Response from POST /rooms/one-to-one - creates or returns a room for two users */
export type OneToOneRoomResponse = {
  roomId: string
  [key: string]: unknown
}

export async function createOneToOneRoom(username: string): Promise<OneToOneRoomResponse> {
  const res = await http.post<OneToOneRoomResponse>('/rooms/one-to-one', null, {
    params: { username },
  })
  console.log('[rooms][one-to-one]', { username, status: res.status })
  const data = res.data
  if (data && typeof data === 'object' && typeof (data as OneToOneRoomResponse).roomId === 'string') {
    return data as OneToOneRoomResponse
  }
  throw new Error('Invalid one-to-one room response: missing roomId')
}

