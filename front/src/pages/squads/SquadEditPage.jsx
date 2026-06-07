import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../api/http'

import '../../../css/squads/edit.css'

const FORM_CARD_STYLE = {
  display: 'block',
  width: '100%',
  maxWidth: '1140px',
  marginLeft: 'auto',
  marginRight: 'auto',
  boxSizing: 'border-box'
}

const CENTER_COLUMN_STYLE = {
  display: 'block',
  width: '100%',
  maxWidth: '1140px',
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: '24px',
  paddingRight: '24px',
  boxSizing: 'border-box'
}

const getInitials = (name) => {
  if (!name) return '??'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

function mapUserRecord(user) {
  const name =
    user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email
  return {
    id: user.id,
    name,
    email: user.email
  }
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
    return <p className="no-players-available">All registered players are already in this squad.</p>
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

const ExistingPlayerCard = ({ player, onRemove, isRemoving }) => (
  <div className={`existing-player-card ${isRemoving ? 'removing' : ''}`}>
    <div className="player-avatar-small">{getInitials(player.name)}</div>
    <span className="player-name">{player.name}</span>
    <button type="button" className="remove-player-btn" onClick={onRemove} title="Remove player" disabled={isRemoving}>
      {isRemoving ? '...' : '✕'}
    </button>
  </div>
)

export default function SquadEditPage() {
  const { squadId } = useParams()
  const navigate = useNavigate()

  const [squadName, setSquadName] = useState('')
  const [originalName, setOriginalName] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [existingPlayers, setExistingPlayers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [newPlayersToAdd, setNewPlayersToAdd] = useState([])

  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [removingPlayerId, setRemovingPlayerId] = useState(null)
  const [error, setError] = useState(null)
  const [nameError, setNameError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [playersLoadError, setPlayersLoadError] = useState(null)

  const excludedPlayerIds = useMemo(() => {
    const ids = new Set()
    existingPlayers.forEach((p) => ids.add(Number(p.id)))
    newPlayersToAdd.forEach((p) => ids.add(Number(p.id)))
    return Array.from(ids)
  }, [existingPlayers, newPlayersToAdd])

  const loadSquadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch(`/api/squads/${squadId}/`, { method: 'GET' })
      setSquadName(data.name || '')
      setOriginalName(data.name || '')
      setIsPublic(Boolean(data.is_public))
      setExistingPlayers(data.players || [])
    } catch (err) {
      setError(err.message || 'Failed to load squad details')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailablePlayers = async () => {
    setPlayersLoadError(null)
    try {
      const users = await apiFetch(`/api/squads/${squadId}/available-players/`, { method: 'GET' })
      setAllUsers(Array.isArray(users) ? users.map(mapUserRecord) : [])
    } catch (err) {
      setAllUsers([])
      setPlayersLoadError(err.message || 'Could not load players')
    }
  }

  useEffect(() => {
    const load = async () => {
      await loadSquadData()
      await loadAvailablePlayers()
    }
    load()
  }, [squadId])

  const handleNameChange = (e) => {
    setSquadName(e.target.value)
    if (nameError) setNameError(null)
    if (error) setError(null)
    if (successMessage) setSuccessMessage(null)
  }

  const addPlayerToList = (player) => {
    if (excludedPlayerIds.includes(Number(player.id))) return
    setNewPlayersToAdd((prev) => [...prev, player])
    if (error) setError(null)
    if (successMessage) setSuccessMessage(null)
  }

  const removePendingPlayer = (playerId) => {
    setNewPlayersToAdd((prev) => prev.filter((p) => p.id !== playerId))
  }

  const removeExistingPlayer = async (player) => {
    if (removingPlayerId) return
    setRemovingPlayerId(player.id)
    setError(null)
    if (successMessage) setSuccessMessage(null)
    try {
      await apiFetch('/api/squads/remove-player/', {
        method: 'POST',
        body: JSON.stringify({ squad_id: parseInt(squadId, 10), user_id: player.id })
      })
      setExistingPlayers((prev) => prev.filter((p) => p.id !== player.id))
      setSuccessMessage(`${player.name} removed from squad`)
      await loadAvailablePlayers()
    } catch (err) {
      setError(err.message || 'Failed to remove player')
    } finally {
      setRemovingPlayerId(null)
    }
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
    setSuccessMessage(null)
    try {
      await apiFetch('/api/squads/update/', {
        method: 'POST',
        body: JSON.stringify({
          squad_id: parseInt(squadId, 10),
          name: squadName.trim(),
          player_ids: newPlayersToAdd.map((p) => p.id),
          is_public: isPublic
        })
      })

      setSuccessMessage('Squad updated successfully!')
      setOriginalName(squadName.trim())
      setNewPlayersToAdd([])
      await loadSquadData()
      setTimeout(() => navigate(`/squads/${squadId}/`), 1000)
    } catch (err) {
      setIsSubmitting(false)
      setError(err.message || 'Failed to update squad')
      scrollToError('general')
    }
  }

  if (loading) {
    return (
      <main className="edit-squad-page">
        <section className="page-hero">
          <div style={CENTER_COLUMN_STYLE}>
            <div className="hero-content">
              <h1>
                Edit <span className="glow">Squad</span>
              </h1>
            </div>
          </div>
        </section>
        <section className="edit-section">
          <div style={CENTER_COLUMN_STYLE}>
            <div className="loading-container">
              <div className="loading-spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
              <p className="loading-text">Loading Squad...</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="edit-squad-page">
      {isSubmitting ? <LoadingOverlay text="Saving Changes..." subtext="Please wait, this may take a moment" /> : null}

      <section className="page-hero">
        <div style={CENTER_COLUMN_STYLE}>
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-icon">✏️</span>
              Edit Mode
            </div>
            <h1>
              Edit <span className="glow">Squad</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="edit-section">
            <form className="form-card" style={FORM_CARD_STYLE} onSubmit={handleSubmit}>
              {successMessage ? (
                <div className="success-message">
                  <span className="success-icon">✓</span>
                  {successMessage}
                </div>
              ) : null}

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
                </div>
                <input
                  type="text"
                  className={`squad-name-input ${nameError ? 'error' : ''}`}
                  placeholder="Enter squad name..."
                  value={squadName}
                  onChange={handleNameChange}
                  maxLength={50}
                />
                {nameError ? <span className="form-error">{nameError}</span> : null}
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <div className="form-section-icon">🔒</div>
                  <span className="form-section-title">Visibility</span>
                </div>
                <div className="visibility-options">
                  <label className="radio-option">
                    <input type="radio" name="visibility" value="private" checked={!isPublic} onChange={() => setIsPublic(false)} />
                    <div className="radio-content">
                      <span className="radio-title">Private</span>
                      <span className="radio-description">Only squad members can view this squad, its matches, and results</span>
                    </div>
                  </label>
                  <label className="radio-option">
                    <input type="radio" name="visibility" value="public" checked={isPublic} onChange={() => setIsPublic(true)} />
                    <div className="radio-content">
                      <span className="radio-title">Public</span>
                      <span className="radio-description">Anyone can view this squad, its matches, and results</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <div className="form-section-icon">👥</div>
                  <span className="form-section-title">Current Players</span>
                  <span className="form-section-subtitle">
                    {existingPlayers.length} player{existingPlayers.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="current-players-section">
                  {existingPlayers.length > 0 ? (
                    <div className="existing-players-list">
                      {existingPlayers.map((player) => (
                        <ExistingPlayerCard
                          key={player.id}
                          player={player}
                          onRemove={() => removeExistingPlayer(player)}
                          isRemoving={removingPlayerId === player.id}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-players-hint">
                      <div className="empty-players-hint-icon">👤</div>
                      <p className="empty-players-hint-text">No players in this squad yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <div className="form-section-icon add-icon">➕</div>
                  <span className="form-section-title">Add New Players</span>
                  <span className="form-section-subtitle optional-badge">Optional</span>
                </div>

                <div className="players-input-section">
                  <div className="players-header">
                    <div className="players-count">
                      <span>Selected to add:</span>
                      <span className="players-count-value">{newPlayersToAdd.length}</span>
                    </div>
                  </div>

                  {newPlayersToAdd.length > 0 ? (
                    <div className="new-players-pending-list">
                      {newPlayersToAdd.map((player) => (
                        <PlayerChip
                          key={player.id}
                          player={player}
                          onRemove={() => removePendingPlayer(player.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="empty-players-hint-text" style={{ marginBottom: 12 }}>
                      Pick players from the list below, then save changes.
                    </p>
                  )}

                  {playersLoadError ? (
                    <p className="form-error" style={{ marginTop: 8 }}>
                      {playersLoadError}
                    </p>
                  ) : null}

                  <PlayerSelect
                    players={allUsers}
                    excludedIds={excludedPlayerIds}
                    onSelect={addPlayerToList}
                  />

                  {!playersLoadError && allUsers.length === 0 ? (
                    <p className="no-players-available">
                      No more players to add (everyone is already in this squad or you are not logged in as
                      squad admin).
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-cancel btn-lg" onClick={() => navigate(`/squads/${squadId}/`)}>
                  Cancel
                </button>
                <button type="submit" className={`btn btn-primary btn-lg ${isSubmitting ? 'btn-loading' : ''}`} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <span className="btn-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
      </section>
    </main>
  )
}

