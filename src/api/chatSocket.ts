import SockJS from 'sockjs-client'
import { Stomp, type CompatClient, type IMessage } from '@stomp/stompjs'
import { getToken } from './token'

const SOCKET_URL = 'http://localhost:8080/chat'

export type RoomSocket = {
  roomId: string
  client: CompatClient
  disconnect: () => void
  connected: () => boolean
  sendJson: (destination: string, body: unknown) => void
}

export function connectRoomSocket(args: {
  roomId: string
  onMessage: (messageBody: string) => void
  onConnect?: () => void
  onError?: (error: unknown) => void
}): RoomSocket {
  const socket = new SockJS(SOCKET_URL)
  const client = Stomp.over(socket)

  client.debug = (msg) => console.log('[stomp]', msg)

  const token = getToken()
  const connectHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  client.connect(
    connectHeaders,
    () => {
      console.log('[stomp] connected', { roomId: args.roomId })

      client.subscribe(`/topic/room/${args.roomId}`, (message: IMessage) => {
        args.onMessage(message.body)
      })

      args.onConnect?.()
    },
    (error: unknown) => {
      console.error('[stomp] error', error)
      args.onError?.(error)
    },
  )

  return {
    roomId: args.roomId,
    client,
    disconnect: () => {
      try {
        // Requirement: stompClient.disconnect()
        client.disconnect()
      } catch {
        // ignore
      }
    },
    connected: () => client.connected,
    sendJson: (destination, body) => {
      const payload = JSON.stringify(body)
      console.log('[stomp] send', { destination, payload })
      client.send(destination, {}, payload)
    },
  }
}

