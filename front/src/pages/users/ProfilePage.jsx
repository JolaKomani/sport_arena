import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/http'
import { useAuth } from '../../auth/AuthContext'

import '../../../css/users/profile.css'

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

export default function ProfilePage() {
  const { refreshMe } = useAuth()
  const navigate = useNavigate()

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    confirm_password: ''
  })
  const [formErrors, setFormErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/api/users/me/', { method: 'GET' })
      setUser(data)
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        email: data.email || '',
        phone: data.phone || '',
        password: '',
        confirm_password: ''
      })
    } catch (err) {
      if (err.status === 401) {
        navigate('/users/login/')
        return
      }
      setError(err.message || 'Failed to load user data')
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }))
    }
    if (successMessage) setSuccessMessage('')
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters'
      } else if (formData.password !== formData.confirm_password) {
        newErrors.confirm_password = 'Passwords do not match'
      }
    }
    if (formData.password && !formData.confirm_password) {
      newErrors.confirm_password = 'Please confirm your password'
    }

    setFormErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm() || !user) return

    setIsSubmitting(true)
    setSuccessMessage('')
    setError(null)

    try {
      const payload = {
        user_id: user.id,
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null
      }
      if (formData.password) {
        payload.password = formData.password
      }

      await apiFetch('/api/users/update/', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setSuccessMessage('Profile updated successfully!')
      setFormData((prev) => ({ ...prev, password: '', confirm_password: '' }))
      await loadUserData()
      await refreshMe()
    } catch (err) {
      setError(err.message || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading Profile...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error && !user) {
    return (
      <main className="profile-page">
        <div className="profile-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Profile</h3>
            <p>{error}</p>
            <button type="button" className="btn btn-primary" onClick={loadUserData}>
              Retry
            </button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1>
            Profile <span className="glow">Settings</span>
          </h1>
          <p>Update your personal information</p>
          {user?.roles?.length ? (
            <p style={{ marginTop: 8, color: 'var(--text-dim)', fontSize: '0.9rem' }}>
              Role: {user.roles.join(', ')}
            </p>
          ) : null}
        </div>

        <div className="profile-card">
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="first_name" className="form-label">
                <span className="label-icon">👤</span>
                First Name
              </label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className={`form-input ${formErrors.first_name ? 'error' : ''}`}
                placeholder="Enter your first name"
              />
              {formErrors.first_name ? <span className="form-error">{formErrors.first_name}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="last_name" className="form-label">
                <span className="label-icon">👤</span>
                Last Name
              </label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className={`form-input ${formErrors.last_name ? 'error' : ''}`}
                placeholder="Enter your last name"
              />
              {formErrors.last_name ? <span className="form-error">{formErrors.last_name}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">
                <span className="label-icon">📧</span>
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${formErrors.email ? 'error' : ''}`}
                placeholder="Enter your email"
              />
              {formErrors.email ? <span className="form-error">{formErrors.email}</span> : null}
            </div>

            <div className="form-group">
              <label htmlFor="phone" className="form-label">
                <span className="label-icon">📱</span>
                Phone
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
                placeholder="Optional phone number"
              />
            </div>

            <div className="password-section">
              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  <span className="label-icon">🔒</span>
                  New Password (Optional)
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`form-input ${formErrors.password ? 'error' : ''}`}
                  placeholder="Leave blank to keep current password"
                />
                {formErrors.password ? <span className="form-error">{formErrors.password}</span> : null}
                <p className="password-note">Leave blank if you don&apos;t want to change your password</p>
              </div>

              {formData.password ? (
                <div className="form-group">
                  <label htmlFor="confirm_password" className="form-label">
                    <span className="label-icon">🔒</span>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm_password"
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    className={`form-input ${formErrors.confirm_password ? 'error' : ''}`}
                    placeholder="Confirm your new password"
                  />
                  {formErrors.confirm_password ? (
                    <span className="form-error">{formErrors.confirm_password}</span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {error ? <div className="form-error">{error}</div> : null}
            {successMessage ? <div className="form-success">{successMessage}</div> : null}

            <button
              type="submit"
              className={`submit-button ${isSubmitting ? 'loading' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Profile'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
