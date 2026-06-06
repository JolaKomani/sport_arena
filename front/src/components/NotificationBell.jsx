import React, { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '../api/http'
import { getAccessToken } from '../api/authTokens'
import { useAuth } from '../auth/AuthContext'

function resolveWsHost() {
  const explicit = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_URL
  if (explicit) {
    try {
      return new URL(explicit).host
    } catch {
      // ignore invalid URL
    }
  }
  // Vite dev: connect WebSocket directly to Django (more reliable than proxy alone).
  if (import.meta.env.DEV && window.location.port === '5173') {
    return '127.0.0.1:8000'
  }
  return window.location.host
}

function getWebSocketUrl() {
  const token = getAccessToken()
  if (!token) return null
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const params = new URLSearchParams({ token })
  return `${protocol}//${resolveWsHost()}/ws/notifications/?${params.toString()}`
}

export default function NotificationBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [liveConnected, setLiveConnected] = useState(false)
  const rootRef = useRef(null)
  const wsRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch('/api/notifications/?limit=20')
      setItems(data.notifications || [])
      setUnread(data.unread_count || 0)
    } catch {
      setItems([])
      setUnread(0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.id) load()
  }, [load, user?.id])

  useEffect(() => {
    if (!user?.id) {
      setLiveConnected(false)
      return undefined
    }

    let closed = false
    let reconnectTimer

    const connect = () => {
      if (closed) return

      const wsUrl = getWebSocketUrl()
      if (!wsUrl) {
        setLiveConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
        return
      }

      try {
        const ws = new WebSocket(wsUrl)
        wsRef.current = ws

        ws.onopen = () => setLiveConnected(true)
        ws.onclose = () => {
          setLiveConnected(false)
          if (!closed) reconnectTimer = setTimeout(connect, 5000)
        }
        ws.onerror = () => ws.close()

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            if (data.event === 'notification.created' && data.notification) {
              setItems((prev) => [data.notification, ...prev].slice(0, 20))
              if (typeof data.unread_count === 'number') {
                setUnread(data.unread_count)
              } else {
                setUnread((c) => c + 1)
              }
            } else if (
              data.event === 'notification.unread_count' ||
              data.event === 'notification.connected'
            ) {
              if (typeof data.unread_count === 'number') {
                setUnread(data.unread_count)
              }
            }
          } catch {
            // ignore malformed messages
          }
        }
      } catch {
        setLiveConnected(false)
        if (!closed) reconnectTimer = setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      closed = true
      clearTimeout(reconnectTimer)
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [user?.id])

  // If WebSocket is down, poll so new notifications still appear without refresh.
  useEffect(() => {
    if (!user?.id || liveConnected) return undefined

    const interval = setInterval(() => {
      load()
    }, 15000)

    const onFocus = () => load()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [user?.id, liveConnected, load])

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const markRead = async (id) => {
    await apiFetch('/api/notifications/mark-read/', {
      method: 'POST',
      body: JSON.stringify({ notification_id: id })
    })
    load()
  }

  const markAllRead = async () => {
    await apiFetch('/api/notifications/mark-read/', {
      method: 'POST',
      body: JSON.stringify({ mark_all: true })
    })
    load()
  }

  const removeNotification = async (id) => {
    try {
      await apiFetch('/api/notifications/delete/', {
        method: 'POST',
        body: JSON.stringify({ notification_id: id })
      })
      setItems((prev) => {
        const removed = prev.find((n) => n.id === id)
        if (removed && !removed.is_read) {
          setUnread((count) => Math.max(0, count - 1))
        }
        return prev.filter((n) => n.id !== id)
      })
    } catch {
      load()
    }
  }

  const toggleOpen = () => {
    setOpen((wasOpen) => {
      if (!wasOpen) load()
      return !wasOpen
    })
  }

  return (
    <div ref={rootRef} className="notification-bell" style={{ position: 'relative' }}>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={toggleOpen}
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        title={
          liveConnected
            ? 'Live notifications'
            : 'Notifications (polling — WebSocket not connected)'
        }
      >
        🔔{unread > 0 ? ` (${unread})` : ''}
        {liveConnected ? (
          <span style={{ fontSize: '0.65rem', marginLeft: 4, color: '#4ade80' }}>●</span>
        ) : null}
      </button>
      {open ? (
        <div
          className="notification-panel"
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            marginTop: 8,
            minWidth: 280,
            maxWidth: 360,
            maxHeight: 320,
            overflowY: 'auto',
            background: 'var(--card-bg, #1a1f2e)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            padding: 12,
            zIndex: 1000
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <strong>Notifications</strong>
            {unread > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={markAllRead}>
                Mark all read
              </button>
            ) : null}
          </div>
          {loading ? <p>Loading…</p> : null}
          {!loading && items.length === 0 ? <p>No notifications yet.</p> : null}
          {items.map((n) => (
            <div
              key={n.id}
              className="notification-item"
              style={{
                padding: '8px 0',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                opacity: n.is_read ? 0.7 : 1
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600 }}>{n.title}</div>
                  <div style={{ fontSize: '0.9em' }}>{n.message}</div>
                  {!n.is_read ? (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginTop: 4, padding: 0 }}
                      onClick={() => markRead(n.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="notification-delete-btn"
                  aria-label="Remove notification"
                  title="Remove notification"
                  onClick={() => removeNotification(n.id)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
