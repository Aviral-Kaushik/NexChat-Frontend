export const TOKEN_STORAGE_KEY = 'nexchat_token'
export const USER_NAME_STORAGE_KEY = 'nexchat_userName'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  } catch {
    // ignore write failures (e.g. private mode / storage disabled)
  }
}

export function getUserName(): string | null {
  try {
    return localStorage.getItem(USER_NAME_STORAGE_KEY)
  } catch {
    return null
  }
}

export function setUserName(userName: string): void {
  try {
    localStorage.setItem(USER_NAME_STORAGE_KEY, userName)
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  } catch {
    // ignore
  }
}

export function clearUserName(): void {
  try {
    localStorage.removeItem(USER_NAME_STORAGE_KEY)
  } catch {
    // ignore
  }
}
