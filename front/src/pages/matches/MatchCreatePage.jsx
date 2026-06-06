import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/http'

import '../../../css/matches/create.css'

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

export default function MatchCreatePage() {
  const navigate = useNavigate()
  const locationObj = useLocation()

  const searchParams = useMemo(() => new URLSearchParams(locationObj.search), [locationObj.search])
  const initialSquadId = useMemo(() => {
    const raw = searchParams.get('squad_id')
    const id = raw ? parseInt(raw, 10) : null
    return id && !Number.isNaN(id) && id > 0 ? id : null
  }, [searchParams])

  const [location, setLocation] = useState('')
  const [datetime, setDatetime] = useState('')
  const [team1Name, setTeam1Name] = useState('Team 1')
  const [team2Name, setTeam2Name] = useState('Team 2')
  const [team1Score, setTeam1Score] = useState(null)
  const [team2Score, setTeam2Score] = useState(null)
  const [team1Players, setTeam1Players] = useState([])
  const [team2Players, setTeam2Players] = useState([])

  const [squadId] = useState(initialSquadId)
  const [squadName, setSquadName] = useState(null)
  const [squadPlayers, setSquadPlayers] = useState([])
  const [loadingSquad, setLoadingSquad] = useState(true)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [locationError, setLocationError] = useState(null)
  const [datetimeError, setDatetimeError] = useState(null)
  const [team1Error, setTeam1Error] = useState(null)
  const [team2Error, setTeam2Error] = useState(null)

  useEffect(() => {
    if (!initialSquadId) {
      navigate('/squads/', { replace: true })
      return
    }

    const loadSquadData = async () => {
      try {
        setLoadingSquad(true)
        const data = await apiFetch(`/api/squads/${initialSquadId}/`, { method: 'GET' })
        setSquadName(data?.name || null)
      } catch (err) {
        setError(err.message || 'Failed to load squad')
      }
    }

    const loadSquadPlayers = async () => {
      try {
        setLoadingPlayers(true)
        const data = await apiFetch(`/api/squads/${initialSquadId}/players/`, { method: 'GET' })
        const list = data?.players || data || []
        setSquadPlayers(Array.isArray(list) ? list : [])
      } catch {
        setSquadPlayers([])
      } finally {
        setLoadingPlayers(false)
        setLoadingSquad(false)
      }
    }

    loadSquadData().then(loadSquadPlayers)
  }, [initialSquadId, navigate])

  const allSelectedPlayerIds = useMemo(() => [...team1Players.map((p) => p.id), ...team2Players.map((p) => p.id)], [team1Players, team2Players])

  const scrollToError = (errorType) => {
    setTimeout(() => {
      let element = null
      if (errorType === 'location') {
        const labels = Array.from(document.querySelectorAll('.form-label'))
        const locationLabel = labels.find((label) => label.textContent.includes('Location'))
        if (locationLabel) {
          const formGroup = locationLabel.closest('.form-group')
          element = formGroup?.querySelector('input[type="text"]')
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
    setLocationError(null)
    setDatetimeError(null)
    setTeam1Error(null)
    setTeam2Error(null)
    setError(null)

    if (!location.trim()) {
      setLocationError('Location is required')
      if (isValid) scrollToError('location')
      isValid = false
    }
    if (!datetime) {
      setDatetimeError('Date and time are required')
      if (isValid) scrollToError('datetime')
      isValid = false
    }
    if (!squadId) {
      setError('Squad ID is required')
      isValid = false
    }
    if (!team1Name.trim()) {
      setTeam1Error('Team 1 name is required')
      if (isValid) scrollToError('team')
      isValid = false
    }
    if (!team2Name.trim()) {
      setTeam2Error('Team 2 name is required')
      if (isValid) scrollToError('team')
      isValid = false
    }

    return isValid
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        location: location.trim(),
        datetime,
        squad_id: squadId,
        teams: [
          {
            name: team1Name.trim(),
            members_ids: team1Players.map((p) => p.id),
            score: team1Score !== null ? parseInt(team1Score, 10) : null
          },
          {
            name: team2Name.trim(),
            members_ids: team2Players.map((p) => p.id),
            score: team2Score !== null ? parseInt(team2Score, 10) : null
          }
        ]
      }

      await apiFetch('/api/matches/create/', {
        method: 'POST',
        body: JSON.stringify(payload)
      })

      setTimeout(() => {
        navigate(`/squads/${squadId}/matches/`)
      }, 500)
    } catch (err) {
      setIsSubmitting(false)
      setError(err.message || 'Failed to create match')
      scrollToError('general')
    }
  }

  const handleCancel = () => {
    if (squadId) navigate(`/squads/${squadId}/matches/`)
    else navigate('/squads/')
  }

  if (loadingSquad) {
    return (
      <main className="create-match-page">
        <section className="page-hero">
          <div style={CENTER_COLUMN_STYLE}>
            <div className="hero-content">
              <h1>
                <span className="glow">NEW MATCH</span>
              </h1>
            </div>
          </div>
        </section>
        <section className="create-section">
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

  if (!squadId && !loadingSquad) return null

  return (
    <main className="create-match-page">
      {isSubmitting ? <LoadingOverlay text="Creating Match..." subtext="Please wait, this may take a moment" /> : null}

      {squadId && squadName ? (
        <section className="breadcrumb-section" style={{ justifyContent: 'center' }}>
          <div style={CENTER_COLUMN_STYLE}>
            <div className="breadcrumb">
              <a href="/squads/" className="breadcrumb-item">
                SQUADS
              </a>
              <span className="breadcrumb-separator">→</span>
              <a href={`/squads/${squadId}/`} className="breadcrumb-item">
                {squadName}
              </a>
              <span className="breadcrumb-separator">→</span>
              <a href={`/squads/${squadId}/matches/`} className="breadcrumb-item">
                Matches
              </a>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-item active">Create new match</span>
            </div>
          </div>
        </section>
      ) : null}

      <section className="page-hero">
        <div style={CENTER_COLUMN_STYLE}>
          <div className="hero-content">
            <h1>
              <span className="glow">NEW MATCH</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="create-section">
          <form className="form-card" style={FORM_CARD_STYLE} onSubmit={handleSubmit}>
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
                      }}
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
                      }}
                    />
                    {datetimeError ? <span className="form-error">{datetimeError}</span> : null}
                  </div>
                </div>
              </div>

              <div className="form-section">
                <div className="form-section-header">
                  <div className="form-section-icon">⚔️</div>
                  <span className="form-section-title">Teams</span>
                </div>

                <div className="teams-container">
                  <TeamSection
                    teamNumber={1}
                    teamName={team1Name}
                    onNameChange={setTeam1Name}
                    score={team1Score}
                    onScoreChange={setTeam1Score}
                    players={team1Players}
                    allSquadPlayers={squadPlayers}
                    allSelectedPlayerIds={allSelectedPlayerIds}
                    onAddPlayer={(player) => setTeam1Players((prev) => [...prev, player])}
                    onRemovePlayer={(playerId) => setTeam1Players((prev) => prev.filter((p) => p.id !== playerId))}
                    error={team1Error}
                    onErrorClear={() => setTeam1Error(null)}
                  />

                  <div className="teams-vs">VS</div>

                  <TeamSection
                    teamNumber={2}
                    teamName={team2Name}
                    onNameChange={setTeam2Name}
                    score={team2Score}
                    onScoreChange={setTeam2Score}
                    players={team2Players}
                    allSquadPlayers={squadPlayers}
                    allSelectedPlayerIds={allSelectedPlayerIds}
                    onAddPlayer={(player) => setTeam2Players((prev) => [...prev, player])}
                    onRemovePlayer={(playerId) => setTeam2Players((prev) => prev.filter((p) => p.id !== playerId))}
                    error={team2Error}
                    onErrorClear={() => setTeam2Error(null)}
                  />
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
                      Creating...
                    </>
                  ) : (
                    'Create Match'
                  )}
                </button>
              </div>
          </form>
      </section>
    </main>
  )
}
