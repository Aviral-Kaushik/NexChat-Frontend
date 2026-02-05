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

export type FileUploadResponse = {
  fileName: string
  mimeType: string
  size: number
  downloadUrl: string
}

export async function getRoomMessages(roomId: string): Promise<Message[]> {
  const res = await http.get<Message[]>(`/rooms/${encodeURIComponent(roomId)}/messages`)
  console.log('[messages][list]', { roomId, count: res.data?.length ?? 0 })
  return res.data
}

export async function uploadFile(roomId: string, file: File): Promise<FileUploadResponse> {
  const formData = new FormData()
  formData.append('file', file)

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
  console.log('[upload]', { roomId, fileName: file.name, status: res.status })
  return res.data
}

