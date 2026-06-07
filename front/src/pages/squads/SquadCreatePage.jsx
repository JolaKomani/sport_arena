import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/http'

import '../../../css/squads/create.css'

function mapUserRecord(user) {
  const name =
    user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
  return {
    id: user.id,
    name,
    email: user.email
  }
}

const getInitials = (name) => {
  if (!name) return '??'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

const PlayerChip = ({ player, onRemove }) => (
  <div className="new-player-chip">
    <div className="player-avatar-small">{getInitials(player.name)}</div>
    <span className="new-player-chip-name">{player.name}</span>
    <span className="new-player-chip-email">{player.email}</span>
    <button type="button" className="remove-player-btn" onClick={onRemove} title="Remove from list">
      ✕
    </button>
  </div>
)

const PlayerSelect = ({ players, excludedIds, onSelect }) => {
  const [value, setValue] = useState('')

  const available = useMemo(() => {
    const taken = new Set((excludedIds || []).map((id) => Number(id)))
    return (players || []).filter((p) => !taken.has(Number(p.id)))
  }, [players, excludedIds])

  if (!available.length) {
    return <p className="no-players-available">No other registered players available to invite.</p>
  }

  return (
    <select
      className="player-select"
      value={value}
      onChange={(e) => {
        const nextId = e.target.value
        if (!nextId) return
        const player = available.find((p) => String(p.id) === String(nextId))
        if (player) {
          onSelect(player)
          setValue('')
        }
      }}
    >
      <option value="">Choose a player to add…</option>
      {available.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name} ({p.email})
        </option>
      ))}
    </select>
  )
}

const LoadingOverlay = ({ text, subtext }) => (
  <div className="loading-overlay">
    <div className="loading-content">
      <div className="loading-spinner-large">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-text">{text}</p>
      {subtext ? <p className="loading-subtext">{subtext}</p> : null}
    </div>
  </div>
)

export default function SquadCreatePage() {
  const navigate = useNavigate()
  const [squadName, setSquadName] = useState('')
  const [playersToAdd, setPlayersToAdd] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(true)
  const [error, setError] = useState(null)
  const [nameError, setNameError] = useState(null)
  const [playersLoadError, setPlayersLoadError] = useState(null)

  const excludedPlayerIds = useMemo(
    () => playersToAdd.map((p) => Number(p.id)),
    [playersToAdd]
  )

  useEffect(() => {
    const load = async () => {
      setLoadingPlayers(true)
      setPlayersLoadError(null)
      try {
        const users = await apiFetch('/api/squads/invite-players/', { method: 'GET' })
        setAllUsers(Array.isArray(users) ? users.map(mapUserRecord) : [])
      } catch (err) {
        setAllUsers([])
        setPlayersLoadError(err.message || 'Could not load players')
      } finally {
        setLoadingPlayers(false)
      }
    }
    load()
  }, [])

  const handleNameChange = (e) => {
    setSquadName(e.target.value)
    if (nameError) setNameError(null)
    if (error) setError(null)
  }

  const addPlayerToList = (player) => {
    if (excludedPlayerIds.includes(Number(player.id))) return
    setPlayersToAdd((prev) => [...prev, player])
    if (error) setError(null)
  }

  const removePendingPlayer = (playerId) => {
    setPlayersToAdd((prev) => prev.filter((p) => p.id !== playerId))
  }

  const scrollToError = (errorType) => {
    setTimeout(() => {
      let element = null
      if (errorType === 'name') element = document.querySelector('.squad-name-input')
      else if (errorType === 'general') element = document.querySelector('.server-error')
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (element.tagName === 'INPUT') element.focus()
      }
    }, 100)
  }

  const validateForm = () => {
    if (!squadName.trim()) {
      setNameError('Squad name is required')
      scrollToError('name')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)
    try {
      const squadData = await apiFetch('/api/squads/create/', {
        method: 'POST',
        body: JSON.stringify({
          name: squadName.trim(),
          member_ids: playersToAdd.map((p) => p.id),
          is_public: isPublic
        })
      })

      sessionStorage.setItem('createdSquad', JSON.stringify(squadData))
      const newId = squadData.id || 'new'
      setTimeout(() => navigate(`/squads/${newId}/`), 500)
    } catch (err) {
      setIsSubmitting(false)
      setError(err.message || 'Failed to create squad')
      scrollToError('general')
    }
  }

  return (
    <main className="create-squad-page">
      {isSubmitting ? <LoadingOverlay text="Creating Squad..." subtext="Please wait, this may take a moment" /> : null}

      <section className="page-hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-icon">🛡️</span>
              New Squad
            </div>
            <h1>
              Create Your <span className="glow">Squad</span>
            </h1>
            <p className="hero-description">
              Name your squad, set visibility, and invite players from the platform.
            </p>
          </div>
        </div>
      </section>

      <section className="create-section">
        <div className="create-form-container">
          <form className="form-card" onSubmit={handleSubmit}>
            {error ? (
              <div className="server-error">
                <span className="error-icon">⚠️</span>
                {error}
              </div>
            ) : null}

            <div className="form-section">
              <div className="form-section-header">
                <div className="form-section-icon">🏷️</div>
                <span className="form-section-title">Squad Name</span>
                <span className="form-section-subtitle required-badge">Required</span>
              </div>
              <input
                type="text"
                className={`squad-name-input ${nameError ? 'error' : ''}`}
                placeholder="Enter your squad name..."
                value={squadName}
                onChange={handleNameChange}
                maxLength={50}
              />
              {nameError ? (
                <span className="form-error" style={{ color: 'var(--error-red)', marginTop: '8px', display: 'block' }}>
                  {nameError}
                </span>
              ) : null}
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <div className="form-section-icon">🔒</div>
                <span className="form-section-title">Visibility</span>
              </div>
              <div className="visibility-options">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="visibility"
                    value="private"
                    checked={!isPublic}
                    onChange={() => setIsPublic(false)}
                  />
                  <div className="radio-content">
                    <span className="radio-title">Private</span>
                    <span className="radio-description">
                      Only squad members can view this squad, its matches, and results
                    </span>
                  </div>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="visibility"
                    value="public"
                    checked={isPublic}
                    onChange={() => setIsPublic(true)}
                  />
                  <div className="radio-content">
                    <span className="radio-title">Public</span>
                    <span className="radio-description">
                      Anyone can view this squad, its matches, and results
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <div className="form-section-icon">👥</div>
                <span className="form-section-title">Team Players</span>
                <span className="form-section-subtitle optional-badge">Optional</span>
              </div>

              <div className="players-input-section">
                <div className="players-header">
                  <div className="players-count">
                    <span>Players to invite:</span>
                    <span className="players-count-value">{playersToAdd.length}</span>
                  </div>
                </div>

                {playersToAdd.length > 0 ? (
                  <div className="new-players-pending-list">
                    {playersToAdd.map((player) => (
                      <PlayerChip
                        key={player.id}
                        player={player}
                        onRemove={() => removePendingPlayer(player.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="empty-players-hint-text" style={{ marginBottom: 12 }}>
                    {loadingPlayers
                      ? 'Loading players…'
                      : 'Pick players from the list below. You can add more later from squad settings.'}
                  </p>
                )}

                {playersLoadError ? (
                  <p className="form-error" style={{ marginTop: 8 }}>
                    {playersLoadError}
                  </p>
                ) : null}

                {!loadingPlayers ? (
                  <PlayerSelect
                    players={allUsers}
                    excludedIds={excludedPlayerIds}
                    onSelect={addPlayerToList}
                  />
                ) : null}
              </div>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-cancel btn-lg" onClick={() => navigate('/squads/')}>
                Cancel
              </button>
              <button
                type="submit"
                className={`btn btn-primary btn-lg ${isSubmitting ? 'btn-loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="btn-spinner"></span>
                    Creating...
                  </>
                ) : (
                  'Create Squad'
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}
