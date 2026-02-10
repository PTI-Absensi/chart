const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').trim()

const normalizeBaseUrl = (value: string) => {
  if (!value) return ''
  return value.endsWith('/') ? value.slice(0, -1) : value
}

const API_BASE_URL = normalizeBaseUrl(rawBaseUrl)

export const buildApiUrl = (path: string) => {
  if (!API_BASE_URL) return path
  if (/^https?:\/\//i.test(path) || path.startsWith('//')) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (API_BASE_URL.endsWith('/api') && normalizedPath.startsWith('/api/')) {
    return `${API_BASE_URL}${normalizedPath.slice(4)}`
  }
  return `${API_BASE_URL}${normalizedPath}`
}

export const apiFetch = (input: RequestInfo | URL, init: RequestInit = {}) => {
  const resolvedInput =
    typeof input === 'string'
      ? buildApiUrl(input)
      : input instanceof URL
        ? buildApiUrl(input.toString())
        : input

  return fetch(resolvedInput, init)
}
