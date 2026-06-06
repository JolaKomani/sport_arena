import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../api/http'
import { clearTokens, setTokens } from '../api/authTokens'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiFetch('/api/users/me/', { method: 'GET' })
      setUser(me)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshMe()
  }, [refreshMe])

  const applyAuthResponse = useCallback((payload) => {
    if (payload?.access_token) {
      setTokens({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token
      })
    }
    const nextUser = payload?.user || payload
    if (nextUser?.id) setUser(nextUser)
    return payload
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const payload = await apiFetch('/api/users/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    return applyAuthResponse(payload)
  }, [applyAuthResponse])

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/users/logout/', { method: 'POST', body: JSON.stringify({}) })
    } finally {
      clearTokens()
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshMe, applyAuthResponse }),
    [user, loading, login, logout, refreshMe, applyAuthResponse]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
