import { http } from './http'

export type SignupRequest = {
  username: string
  password: string
  email: string
}

export type LoginRequest = {
  username: string
  password: string
}

export type LoginResponse = {
  token: string
}

function redacted(value: string): string {
  if (value.length === 0) return ''
  return '•'.repeat(Math.min(value.length, 12))
}

function tokenPreview(token: string): string {
  if (token.length <= 12) return redacted(token)
  return `${token.slice(0, 6)}…${token.slice(-4)}`
}

export async function signup(body: SignupRequest): Promise<void> {
  const payload = {
    userName: body.username,
    password: body.password,
    email: body.email,
  }

  if (import.meta.env.DEV) {
    console.log('[auth][signup] request', { ...payload, password: redacted(payload.password) })
  }

  const res = await http.post('/signup', payload)
  if (import.meta.env.DEV) {
    console.log('[auth][signup] response', { status: res.status, data: res.data })
  }
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const payload = {
    userName: body.username,
    password: body.password,
  }

  if (import.meta.env.DEV) {
    console.log('[auth][login] request', { ...payload, password: redacted(payload.password) })
  }

  const res = await http.post<LoginResponse>('/login', payload)
  if (import.meta.env.DEV) {
    console.log('[auth][login] response', {
      status: res.status,
      data: { ...res.data, token: tokenPreview(res.data?.token ?? '') },
    })
  }
  return res.data
}

