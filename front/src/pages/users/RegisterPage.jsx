import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/http'
import { useAuth } from '../../auth/AuthContext'

import '../../../css/users/create.css'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { applyAuthResponse } = useAuth()

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: ''
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    setServerError('')
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.first_name.trim()) newErrors.first_name = 'First name is required'
    if (!formData.last_name.trim()) newErrors.last_name = 'Last name is required'

    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!isValidEmail(formData.email)) newErrors.email = 'Please enter a valid email'

    if (!formData.password) newErrors.password = 'Password is required'
    else if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters'

    if (!formData.confirm_password) newErrors.confirm_password = 'Please confirm your password'
    else if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setServerError('')
    setSubmitting(true)
    try {
      const payload = await apiFetch('/api/users/create/', {
        method: 'POST',
        body: JSON.stringify({
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          phone: formData.phone || null,
          password: formData.password
        })
      })

      applyAuthResponse(payload)
      setSuccess(true)
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="register-page">
        <section className="register-section">
          <div className="container">
            <div className="success-container">
              <div className="success-card">
                <div className="success-icon">✓</div>
                <h2>Welcome to the Arena!</h2>
                <p>Your account has been created successfully.</p>
                <p className="redirect-text">Redirecting to home page...</p>
                <div className="loading-bar"></div>
              </div>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="register-page">
      <section className="register-section">
        <div className="container">
          <div className="form-container">
            <div className="form-card">
              <div className="form-header">
                <div className="form-icon">🎮</div>
                <h1>
                  Join The <span className="glow">Arena</span>
                </h1>
                <p>Create your player profile and start competing</p>
              </div>

              <form onSubmit={onSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="first_name" className="form-label">
                      <span className="label-icon">👤</span>First Name
                    </label>
                    <input
                      id="first_name"
                      name="first_name"
                      type="text"
                      value={formData.first_name}
                      onChange={handleChange}
                      placeholder="Enter your first name"
                      className={`form-input ${errors.first_name ? 'error' : ''}`}
                      autoComplete="given-name"
                    />
                    {errors.first_name ? <span className="form-error">{errors.first_name}</span> : null}
                  </div>

                  <div className="form-group">
                    <label htmlFor="last_name" className="form-label">
                      <span className="label-icon">👤</span>Last Name
                    </label>
                    <input
                      id="last_name"
                      name="last_name"
                      type="text"
                      value={formData.last_name}
                      onChange={handleChange}
                      placeholder="Enter your last name"
                      className={`form-input ${errors.last_name ? 'error' : ''}`}
                      autoComplete="family-name"
                    />
                    {errors.last_name ? <span className="form-error">{errors.last_name}</span> : null}
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    <span className="label-icon">📧</span>Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="player@example.com"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    autoComplete="email"
                  />
                  {errors.email ? <span className="form-error">{errors.email}</span> : null}
                </div>

                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    <span className="label-icon">📱</span>Phone Number (Optional)
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+383 49 111 222"
                    className={`form-input ${errors.phone ? 'error' : ''}`}
                    autoComplete="tel"
                  />
                  {errors.phone ? <span className="form-error">{errors.phone}</span> : null}
                </div>

                <div className="form-group">
                  <label htmlFor="password" className="form-label">
                    <span className="label-icon">🔒</span>Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    autoComplete="new-password"
                  />
                  {errors.password ? <span className="form-error">{errors.password}</span> : null}
                </div>

                <div className="form-group">
                  <label htmlFor="confirm_password" className="form-label">
                    <span className="label-icon">🔐</span>Confirm Password
                  </label>
                  <input
                    id="confirm_password"
                    name="confirm_password"
                    type="password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    className={`form-input ${errors.confirm_password ? 'error' : ''}`}
                    autoComplete="new-password"
                  />
                  {errors.confirm_password ? <span className="form-error">{errors.confirm_password}</span> : null}
                </div>

                {serverError ? <div className="server-error">⚠️ {serverError}</div> : null}

                <button type="submit" className={`btn btn-primary btn-lg btn-full ${submitting ? 'loading' : ''}`} disabled={submitting}>
                  {submitting ? 'Creating Account...' : 'Enter The Arena'}
                </button>

                <p className="form-footer">
                  Already have an account? <a href="/users/login/">Log In</a>
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

