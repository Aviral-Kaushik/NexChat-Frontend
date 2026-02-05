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

  const res = await http.post('/signup', payload)
  console.log('[auth][signup]', { status: res.status })
}

export async function login(body: LoginRequest): Promise<LoginResponse> {
  const payload = {
    userName: body.username,
    password: body.password,
  }

  const res = await http.post<LoginResponse>('/login', payload)
  console.log('[auth][login]', { status: res.status, token: tokenPreview(res.data?.token ?? '') })
  return res.data
}

/** POST /auth/forgot-password - sends reset link to email if user exists */
export async function forgotPassword(email: string): Promise<void> {
  await http.post('/auth/forgot-password', null, { params: { email: email.trim() } })
  console.log('[auth][forgot-password] success')
}

export type ResetPasswordRequest = {
  email: string
  token: string
  newPassword: string
}

/** POST /auth/reset-password - set new password using token from email link */
export async function resetPassword(body: ResetPasswordRequest): Promise<void> {
  await http.post('/auth/reset-password', body)
  console.log('[auth][reset-password] success')
}

