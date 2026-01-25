import axios from 'axios'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data

    if (typeof data === 'string' && data.trim().length > 0) return data

    if (isRecord(data)) {
      const message =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        (typeof data.detail === 'string' && data.detail)

      if (message && message.trim().length > 0) return message

      try {
        const serialized = JSON.stringify(data)
        if (serialized && serialized !== '{}' && serialized !== '""') return serialized
      } catch {
        // ignore JSON errors
      }
    }

    if (error.message && error.message.trim().length > 0) return error.message
    return 'Request failed. Please try again.'
  }

  if (error instanceof Error && error.message.trim().length > 0) return error.message
  return 'Something went wrong. Please try again.'
}
