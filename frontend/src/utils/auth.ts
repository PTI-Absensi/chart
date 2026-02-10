import { buildApiUrl } from './api'

export function getToken(): string | null {
  return localStorage.getItem('auth_token')
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token)
  } else {
    localStorage.removeItem('auth_token')
  }
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const token = getToken()
  const headers = new Headers(init.headers || {})
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const resolvedInput =
    typeof input === 'string'
      ? buildApiUrl(input)
      : input instanceof URL
        ? buildApiUrl(input.toString())
        : input
  const res = await fetch(resolvedInput, { ...init, headers })
  if (res.status === 401) {
    setToken(null)
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }
  return res
}

export function isAuthed() {
  return Boolean(getToken())
}
