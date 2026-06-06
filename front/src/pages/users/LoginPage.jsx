import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../auth/AuthContext'

import '../../../css/users/login.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login({ email, password })
      navigate('/')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-section">
        <div className="container">
          <div className="form-container">
            <div className="form-card">
              <div className="form-header">
                <div className="form-icon">🔐</div>
                <h1>
                  Welcome <span className="glow">Back</span>
                </h1>
                <p>Sign in to continue to the arena</p>
              </div>

              {error ? <div className="server-error">{error}</div> : null}

              <form onSubmit={onSubmit}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <span className="label-icon">📧</span>Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-input"
                    placeholder="player@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    <span className="label-icon">🔒</span>Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={submitting}>
                  {submitting ? 'Signing In...' : 'Enter The Arena'}
                </button>

                <p className="form-footer">
                  Don&apos;t have an account? <a href="/users/create/">Join Now</a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

