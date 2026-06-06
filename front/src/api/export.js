import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './authTokens'

async function refreshAccessToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch('/api/users/token/refresh/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ refresh_token: refreshToken })
  })

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    clearTokens()
    return null
  }
  if (body?.access_token) {
    setTokens({ access_token: body.access_token })
  }
  return body?.access_token
}

function filenameFromDisposition(header) {
  if (!header) return null
  const match = header.match(/filename="?([^";]+)"?/)
  return match ? match[1] : null
}

function defaultFilename(format) {
  if (format === 'json') return 'export.json'
  if (format === 'xlsx' || format === 'excel') return 'export.xlsx'
  if (format === 'pdf') return 'export.pdf'
  return 'export.csv'
}

async function fetchExport(url) {
  const headers = {}
  let token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`

  const doFetch = () =>
    fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers
    })

  let res = await doFetch()

  if (res.status === 401 && getRefreshToken()) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`
      res = await doFetch()
    }
  }

  return res
}

export async function downloadExport(url, format = 'csv') {
  const res = await fetchExport(url)

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    let message = text || `Export failed (${res.status})`
    try {
      const json = JSON.parse(text)
      message = json.detail || json.error || message
    } catch {
      // plain text error from Django
    }
    throw new Error(message)
  }

  const blob = await res.blob()
  if (!blob.size) {
    throw new Error('Export returned an empty file')
  }

  const disposition = res.headers.get('Content-Disposition')
  const filename = filenameFromDisposition(disposition) || defaultFilename(format)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
}
