const ACCESS_KEY = 'sportz_access_token'
const REFRESH_KEY = 'sportz_refresh_token'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  const raw = localStorage.getItem(REFRESH_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    return parsed.token || parsed
  } catch {
    return raw
  }
}

export function setTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem(ACCESS_KEY, access_token)
  if (refresh_token) {
    localStorage.setItem(
      REFRESH_KEY,
      typeof refresh_token === 'string' ? refresh_token : JSON.stringify(refresh_token)
    )
  }
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
