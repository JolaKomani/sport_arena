import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../api/http'

import '../../../css/matches/edit.css'

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
  const parts = String(name).trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatTime = (timeStr) => {
  if (!timeStr) return 'N/A'
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
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

const PlayerChip = ({ player, onRemove }) => (
  <div className="player-chip">
    <div className="player-chip-avatar">{getInitials(player?.name)}</div>
    <span className="player-chip-name">{player?.name || 'Unknown'}</span>
    <button type="button" className="player-chip-remove" onClick={onRemove} aria-label="Remove player" title="Remove player">
      ✕
    </button>
  </div>
)

const PlayerSelect = ({ players, selectedIds, onSelect, placeholder }) => {
  const [value, setValue] = useState('')

  const availablePlayers = useMemo(() => {
    const set = new Set((selectedIds || []).map((id) => Number(id)))
    return (players || []).filter((p) => !set.has(Number(p.id)))
  }, [players, selectedIds])

  if (!availablePlayers.length) {
    return <div className="no-players-available">No more players available</div>
  }

  return (
    <select
      className="player-select"
      value={value}
      onChange={(e) => {
        const nextId = e.target.value
        setValue(nextId)
        const player = availablePlayers.find((p) => String(p.id) === String(nextId))
        if (player) {
          onSelect(player)
          setTimeout(() => setValue(''), 0)
        }
      }}
    >
      <option value="">{placeholder || 'Select a player...'}</option>
      {availablePlayers.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  )
}

const SquadDisplay = ({ squadName, loading }) => (
  <div className="squad-display">
    <label className="form-label">
      <span className="label-icon">🛡️</span>
      Squad
    </label>
    {loading ? (
      <div className="squad-loading">Loading squad...</div>
    ) : (
      <div className="squad-name-display">
        <span className="squad-name-value">{squadName || 'No squad assigned'}</span>
      </div>
    )}
  </div>
)

const TeamSection = ({
  teamNumber,
  teamName,
  onNameChange,
  score,
  onScoreChange,
  players,
  allSquadPlayers,
  allSelectedPlayerIds,
  onAddPlayer,
  onRemovePlayer,
  error,
  onErrorClear
}) => (
  <div className="team-section">
    <div className="team-header">
      <div className="team-number">Team {teamNumber}</div>
      <div className="team-name-input-wrapper">
        <input
          type="text"
          className={`team-name-input ${error ? 'error' : ''}`}
          value={teamName}
          onChange={(e) => {
            onNameChange(e.target.value)
            if (error && onErrorClear) onErrorClear()
          }}
          placeholder={`Team ${teamNumber} Name`}
        />
        {error ? <span className="form-error">{error}</span> : null}
      </div>
    </div>

    <div className="team-score-wrapper">
      <label className="team-score-label">
        <span>⚽</span>
        <span>Score (optional)</span>
      </label>
      <input
        type="number"
        className="team-score-input"
        value={score ?? ''}
        onChange={(e) => onScoreChange(e.target.value === '' ? null : e.target.value)}
        placeholder="Goals"
        min="0"
      />
    </div>

    <div className="team-players">
      <div className="team-players-label">
        <span>👥</span>
        <span>Players ({players.length})</span>
      </div>

      {players.length ? (
        <div className="team-players-list">
          {players.map((player) => (
            <PlayerChip key={player.id} player={player} onRemove={() => onRemovePlayer(player.id)} />
          ))}
        </div>
      ) : (
        <div className="team-players-empty">No players added yet</div>
      )}

      <PlayerSelect
        players={allSquadPlayers}
        selectedIds={allSelectedPlayerIds}
        onSelect={onAddPlayer}
        placeholder="+ Add player from squad..."
      />
    </div>
  </div>
)

const emptyTeam = (n) => ({ id: null, name: `Team ${n}`, score: null, players: [] })

export default function MatchEditPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()

  const [location, setLocation] = useState('')
  const [datetime, setDatetime] = useState('')
  const [teams, setTeams] = useState([emptyTeam(1), emptyTeam(2)])
  const [matchSquadId, setMatchSquadId] = useState(null)
  const [matchSquadName, setMatchSquadName] = useState('')
  const [squadPlayers, setSquadPlayers] = useState([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [datetimeError, setDatetimeError] = useState(null)
  const [teamErrors, setTeamErrors] = useState([null, null])
  const [successMessage, setSuccessMessage] = useState(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const loadSquadPlayers = async (squadId) => {
    try {
      setLoadingPlayers(true)
      const data = await apiFetch(`/api/squads/${squadId}/players/`, { method: 'GET' })
      const list = data?.players || data || []
      setSquadPlayers(Array.isArray(list) ? list : [])
    } catch {
      setSquadPlayers([])
    } finally {
      setLoadingPlayers(false)
    }
  }

  const loadMatchData = async () => {
    try {
      setLoading(true)
      setLoadFailed(false)
      setError(null)
      const data = await apiFetch(`/api/matches/${matchId}/`, { method: 'GET' })
      setLocation(data.location || '')
      setDatetime(data.datetime ? String(data.datetime).slice(0, 16) : '')

      if (data.squad) {
        setMatchSquadId(data.squad.id)
        setMatchSquadName(data.squad.name)
        loadSquadPlayers(data.squad.id)
      }

      if (data.teams?.length) {
        const teamsData = data.teams.map((team) => ({
          id: team.id,
          name: team.name,
          score: team.score !== null && team.score !== undefined ? team.score : null,
          players: team.members || []
        }))
        while (teamsData.length < 2) {
          teamsData.push(emptyTeam(teamsData.length + 1))
        }
        setTeams(teamsData.slice(0, 2))
      } else {
        setTeams([emptyTeam(1), emptyTeam(2)])
      }
    } catch (err) {
      setLoadFailed(true)
      setError(err.message || 'Failed to load match details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMatchData()
  }, [matchId])

  const allSelectedPlayerIds = useMemo(() => teams.flatMap((team) => team.players.map((p) => p.id)), [teams])

  const matchDateTime = datetime
    ? (() => {
        const [datePart, timePart] = datetime.split('T')
        return `${formatDate(datePart)} ${formatTime(timePart)}`
      })()
    : null

  const scrollToError = (errorType) => {
    setTimeout(() => {
      let element = null
      if (errorType === 'location') {
        const labels = Array.from(document.querySelectorAll('.form-label'))
        const locationLabel = labels.find((label) => label.textContent.includes('Location'))
        if (locationLabel) {
          element = locationLabel.closest('.form-group')?.querySelector('input[type="text"]')
        }
      } else if (errorType === 'datetime') {
        element = document.querySelector('input[type="datetime-local"]')
      } else if (errorType === 'team') {
        element = document.querySelector('.team-name-input')
      } else if (errorType === 'general') {
        element = document.querySelector('.server-error')
      }
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        if (element.tagName === 'INPUT' || element.tagName === 'SELECT') element.focus()
      }
    }, 100)
  }

  const validateForm = () => {
    let isValid = true
    let firstError = null
    const newTeamErrors = [null, null]

    setLocationError(null)
    setDatetimeError(null)
    setTeamErrors([null, null])
    setError(null)

    if (!location.trim()) {
      setLocationError('Location is required')
      if (!firstError) firstError = 'location'
      isValid = false
    }
    if (!datetime) {
      setDatetimeError('Date and time are required')
      if (!firstError) firstError = 'datetime'
      isValid = false
    }
    if (teams.length !== 2) {
      setError('Two teams are required')
      if (!firstError) firstError = 'team'
      isValid = false
    }
    for (let i = 0; i < 2; i++) {
      if (!teams[i]?.name?.trim()) {
        newTeamErrors[i] = `Team ${i + 1} name is required`
        if (!firstError) firstError = 'team'
        isValid = false
      }
    }
    setTeamErrors(newTeamErrors)
    if (!isValid && firstError) scrollToError(firstError)
    return isValid
  }

  const updateTeamName = (index, name) => {
    const updated = [...teams]
    updated[index] = { ...updated[index], name }
    setTeams(updated)
    if (error) setError(null)
    if (successMessage) setSuccessMessage(null)
    if (teamErrors[index]) {
      const next = [...teamErrors]
      next[index] = null
      setTeamErrors(next)
    }
  }

  const updateTeamScore = (index, score) => {
    const updated = [...teams]
    updated[index] = { ...updated[index], score }
    setTeams(updated)
    if (error) setError(null)
    if (successMessage) setSuccessMessage(null)
  }

  const addPlayerToTeam = (index, player) => {
    const updated = [...teams]
    if (!updated[index].players.find((p) => p.id === player.id)) {
      updated[index] = { ...updated[index], players: [...updated[index].players, player] }
      setTeams(updated)
    }
  }

  const removePlayerFromTeam = (index, playerId) => {
    const updated = [...teams]
    updated[index] = {
      ...updated[index],
      players: updated[index].players.filter((p) => p.id !== playerId)
    }
    setTeams(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const teamsPayload = teams.map((team) => ({
        id: team.id,
        name: team.name.trim(),
        score: team.score !== null && team.score !== undefined ? parseInt(team.score, 10) : null,
        player_ids: team.players.map((p) => p.id)
      }))

      await apiFetch('/api/matches/update/', {
        method: 'POST',
        body: JSON.stringify({
          match_id: parseInt(matchId, 10),
          location: location.trim(),
          datetime,
          teams: teamsPayload
        })
      })

      setSuccessMessage('Match updated successfully!')
      setTimeout(() => navigate(`/matches/${matchId}/`), 1000)
    } catch (err) {
      setIsSubmitting(false)
      setError(err.message || 'Failed to update match')
      scrollToError('general')
    }
  }

  const handleCancel = () => {
    if (matchSquadId) navigate(`/squads/${matchSquadId}/matches/`)
    else navigate(`/matches/${matchId}/`)
  }

  const goBackOnError = () => {
    if (matchSquadId) navigate(`/squads/${matchSquadId}/matches/`)
    else navigate('/squads/')
  }

  if (loading) {
    return (
      <main className="edit-match-page">
        <section className="page-hero">
          <div style={CENTER_COLUMN_STYLE}>
            <div className="hero-content">
              <h1>
                Edit <span className="glow">Match</span>
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
              <p className="loading-text">Loading Match...</p>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (loadFailed) {
    return (
      <main className="edit-match-page">
        <section className="page-hero">
          <div style={CENTER_COLUMN_STYLE}>
            <div className="hero-content">
              <h1>
                Edit <span className="glow">Match</span>
              </h1>
            </div>
          </div>
        </section>
        <section className="edit-section">
          <div style={CENTER_COLUMN_STYLE}>
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Error Loading Match</h3>
              <p>{error}</p>
              <button type="button" className="btn btn-primary" onClick={goBackOnError}>
                Back to Matches
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="edit-match-page">
      {isSubmitting ? <LoadingOverlay text="Saving Changes..." subtext="Please wait, this may take a moment" /> : null}

      {matchSquadId && matchSquadName ? (
        <section className="breadcrumb-section" style={{ justifyContent: 'center' }}>
          <div style={CENTER_COLUMN_STYLE}>
            <div className="breadcrumb">
              <a href="/squads/" className="breadcrumb-item">
                SQUADS
              </a>
              <span className="breadcrumb-separator">→</span>
              <a href={`/squads/${matchSquadId}/`} className="breadcrumb-item">
                {matchSquadName}
              </a>
              <span className="breadcrumb-separator">→</span>
              <a href={`/squads/${matchSquadId}/matches/`} className="breadcrumb-item">
                Matches
              </a>
              {matchDateTime ? (
                <>
                  <span className="breadcrumb-separator">→</span>
                  <a href={`/matches/${matchId}/`} className="breadcrumb-item">
                    {matchDateTime}
                  </a>
                </>
              ) : null}
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-item active">Edit</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="page-hero">
        <div style={CENTER_COLUMN_STYLE}>
          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-icon">✏️</span>
              Edit Mode
            </div>
            <h1>
              Edit <span className="glow">Match</span>
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
              <div className="form-section-icon">📍</div>
              <span className="form-section-title">Match Details</span>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">🏟️</span>
                  Location
                </label>
                <input
                  type="text"
                  className={`form-input ${locationError ? 'error' : ''}`}
                  placeholder="Enter venue/location..."
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value)
                    if (locationError) setLocationError(null)
                    if (error) setError(null)
                    if (successMessage) setSuccessMessage(null)
                  }}
                  maxLength={120}
                />
                {locationError ? <span className="form-error">{locationError}</span> : null}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span className="label-icon">📅</span>
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  className={`form-input ${datetimeError ? 'error' : ''}`}
                  value={datetime}
                  onChange={(e) => {
                    setDatetime(e.target.value)
                    if (datetimeError) setDatetimeError(null)
                    if (error) setError(null)
                    if (successMessage) setSuccessMessage(null)
                  }}
                />
                {datetimeError ? <span className="form-error">{datetimeError}</span> : null}
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">🛡️</div>
              <span className="form-section-title">Squad</span>
            </div>

            <SquadDisplay squadName={matchSquadName} loading={loadingPlayers} />
            {loadingPlayers ? <div className="loading-players">Loading squad players...</div> : null}
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <div className="form-section-icon">⚔️</div>
              <span className="form-section-title">Teams</span>
            </div>

            <div className="teams-container">
              {[0, 1].map((index) => {
                const team = teams[index] || emptyTeam(index + 1)
                return (
                  <React.Fragment key={team.id || `team-${index}`}>
                    <TeamSection
                      teamNumber={index + 1}
                      teamName={team.name}
                      score={team.score}
                      onScoreChange={(score) => updateTeamScore(index, score)}
                      onNameChange={(name) => updateTeamName(index, name)}
                      players={team.players || []}
                      allSquadPlayers={squadPlayers}
                      allSelectedPlayerIds={allSelectedPlayerIds}
                      onAddPlayer={(player) => addPlayerToTeam(index, player)}
                      onRemovePlayer={(playerId) => removePlayerFromTeam(index, playerId)}
                      error={teamErrors[index]}
                      onErrorClear={() => {
                        const next = [...teamErrors]
                        next[index] = null
                        setTeamErrors(next)
                      }}
                    />
                    {index === 0 ? <div className="teams-vs">VS</div> : null}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-cancel btn-lg" onClick={handleCancel}>
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
