import axios from 'axios'
import { getToken } from './token'

export const http = axios.create({
  baseURL: 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  
  // Log headers for debugging (especially for upload requests)
  if (import.meta.env.DEV) {
    const headersToLog: Record<string, string> = {}
    if (config.headers) {
      Object.keys(config.headers).forEach((key) => {
        const value = config.headers[key]
        if (key.toLowerCase() === 'authorization') {
          // Show partial token for debugging
          const authValue = String(value)
          headersToLog[key] = authValue ? `Bearer ${authValue.split(' ')[1]?.substring(0, 15)}...` : 'NOT SET'
        } else {
          headersToLog[key] = String(value)
        }
      })
    }
    
    console.log('[http] Request configuration:', {
      url: `${config.baseURL || ''}${config.url}`,
      method: config.method?.toUpperCase(),
      headers: headersToLog,
      hasFormData: config.data instanceof FormData,
      hasToken: !!token,
    })
    
    // Also log the actual Authorization header value (first 30 chars for debugging)
    if (config.headers?.Authorization) {
      console.log('[http] Authorization header:', {
        present: true,
        value: String(config.headers.Authorization).substring(0, 30) + '...',
        fullLength: String(config.headers.Authorization).length,
      })
    } else {
      console.warn('[http] Authorization header: NOT SET')
    }
  }
  
  return config
})

