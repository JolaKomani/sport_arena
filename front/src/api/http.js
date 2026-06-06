import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authTokens'

let refreshPromise = null

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch('/api/users/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refresh_token: refreshToken })
  })

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) {
    clearTokens()
    return null
  }

  if (body?.access_token) {
    setTokens({ access_token: body.access_token })
  }
  return body?.access_token
}

export async function apiFetch(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  }

  const accessToken = getAccessToken()
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const doFetch = () =>
    fetch(path, {
      credentials: 'include',
      ...options,
      headers
    })

  let res = await doFetch()

  if (res.status === 401 && getRefreshToken() && !path.includes('/token/refresh/')) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }
    const newAccess = await refreshPromise
    if (newAccess) {
      headers.Authorization = `Bearer ${newAccess}`
      res = await doFetch()
    }
  }

  const contentType = res.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null)

  if (!res.ok) {
    const message =
      (body && typeof body === 'object' && (body.detail || body.error)) ||
      (typeof body === 'string' && body) ||
      `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.body = body
    throw err
  }

  return body
}
