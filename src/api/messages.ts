import { http } from './http'
import { getToken } from './token'

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

export type FileUploadResponse = {
  fileName: string
  mimeType: string
  size: number
  downloadUrl: string
}

export async function getRoomMessages(roomId: string): Promise<Message[]> {
  if (import.meta.env.DEV) console.log('[messages][list] request', { roomId })
  const res = await http.get<Message[]>(`/rooms/${encodeURIComponent(roomId)}/messages`)
  if (import.meta.env.DEV) console.log('[messages][list] response', { status: res.status, data: res.data })
  return res.data
}

export async function uploadFile(roomId: string, file: File): Promise<FileUploadResponse> {
  if (import.meta.env.DEV) console.log('[upload] request', { roomId, fileName: file.name, fileSize: file.size })
  
  const formData = new FormData()
  formData.append('file', file)
  
  // The http interceptor automatically adds Authorization header with Bearer token
  // For FormData, axios automatically detects it and sets Content-Type with boundary
  // We need to ensure the default 'application/json' doesn't interfere
  
  // Log token before making request for debugging
  const token = getToken()
  if (import.meta.env.DEV) {
    console.log('[upload] Token check:', {
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'NO TOKEN',
    })
  }
  
  const res = await http.post<FileUploadResponse>(
    `/rooms/upload/${encodeURIComponent(roomId)}`,
    formData,
    {
      headers: {
        // Let axios set Content-Type automatically for FormData (it will include boundary)
        // The Authorization header is added by the http interceptor
      },
      // Override transformRequest to ensure FormData is sent correctly
      transformRequest: (data) => {
        // Return FormData as-is - axios will handle Content-Type automatically
        return data
      },
    }
  )
  
  if (import.meta.env.DEV) console.log('[upload] response', { status: res.status, data: res.data })
  return res.data
}

