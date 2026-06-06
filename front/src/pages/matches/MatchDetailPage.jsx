import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../api/http'
import { useAuth } from '../../auth/AuthContext'
import ModalOverlay from '../../components/ModalOverlay'

import '../../../css/matches/detail.css'

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

const locationEmojis = ['🐉', '🦊', '🐺', '🦈', '🔥', '⚡', '🌟', '💫', '🦁', '🦅', '🐍', '🦇']

const getLocationEmoji = (location, id) => {
  const hash = (location || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return locationEmojis[(hash + (id || 0)) % locationEmojis.length]
}

const getInitials = (name) => {
  if (!name) return '??'
  const parts = String(name).trim().split(' ').filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

const formatDateLong = (dateStr) => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatTime = (timeStr) => {
  if (!timeStr) return 'N/A'
  const [hours, minutes] = timeStr.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

const getPlayerAverage = (averages, playerId) => {
  if (!averages) return null
  return averages[playerId] ?? averages[String(playerId)] ?? null
}

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, isLoading }) {
  if (!isOpen) return null
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-icon">⚠️</div>
          <h3 className="modal-title">{title}</h3>
        </div>
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-cancel" onClick={onClose} disabled={isLoading}>
            {cancelText || 'Cancel'}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={isLoading}>
            {confirmText || 'Delete'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

function RatingModal({ isOpen, onClose, players, currentUserId, ratings, onSubmit }) {
  const [playerRatings, setPlayerRatings] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const initialRatings = {}
    players.forEach((player) => {
      const rating = ratings.find((r) => r.rater_user.id === currentUserId && r.rated_user.id === player.id)
      if (rating) initialRatings[player.id] = rating.rating
    })
    setPlayerRatings(initialRatings)
  }, [isOpen, players, ratings, currentUserId])

  if (!isOpen) return null

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      for (const [playerId, score] of Object.entries(playerRatings)) {
        if (score !== null && score !== undefined) {
          await onSubmit(parseInt(playerId, 10), parseInt(score, 10))
        }
      }
      onClose()
    } catch (err) {
      console.error('Error submitting ratings:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal-content rating-modal">
        <div className="modal-header">
          <h2>⭐ Rate Players</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <p className="rating-instructions">Rate each player from 1 to 10 based on their performance in this match.</p>
          <div className="players-rating-list">
            {players.length === 0 ? (
              <p className="no-players">No other players to rate in this match.</p>
            ) : (
              players.map((player) => (
                <div key={player.id} className="player-rating-item">
                  <div className="player-rating-info">
                    <div className="player-rating-avatar">
                      {getInitials(player.name || player.full_name || player.email || '')}
                    </div>
                    <div className="player-rating-name">
                      {player.name || player.full_name || player.email || 'Unknown Player'}
                    </div>
                  </div>
                  <div className="rating-stars">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                      <button
                        key={score}
                        type="button"
                        className={`rating-star ${playerRatings[player.id] === score ? 'active' : ''}`}
                        onClick={() => setPlayerRatings((prev) => ({ ...prev, [player.id]: score }))}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-cancel" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={submitting || players.length === 0}
          >
            {submitting ? 'Submitting...' : 'Submit Ratings'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

const PlayerCard = ({ player, index, rating = null }) => (
  <div className="player-card" style={{ animationDelay: `${index * 0.1}s` }}>
    <div className="player-avatar-medium">{getInitials(player.name)}</div>
    <div className="player-info">
      <div className="player-name">{player.name}</div>
      <div className="player-role">Player</div>
    </div>
    {rating !== null && rating !== undefined ? (
      <div className="player-rating-badge">{Number(rating).toFixed(1)}</div>
    ) : (
      <div className="player-status-indicator"></div>
    )}
  </div>
)

const TeamCard = ({ team, index, playerAverages = {} }) => (
  <div className="team-card" style={{ animationDelay: `${index * 0.1}s` }}>
    <div className="team-header">
      <div className="team-name">{team.name}</div>
      <div className="team-header-right">
        {team.score !== null && team.score !== undefined ? (
          <div className="team-score">⚽ {team.score}</div>
        ) : null}
        <div className="team-count">
          {team.members.length} player{team.members.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
    <div className="team-players">
      {team.members.length > 0 ? (
        <div className="players-grid">
          {[...team.members]
            .map((player) => {
              const avgData = getPlayerAverage(playerAverages, player.id)
              const avgRating = avgData?.average_rating
              return {
                player,
                avgRating: avgRating !== null && avgRating !== undefined ? avgRating : -1
              }
            })
            .sort((a, b) => {
              if (a.avgRating === -1 && b.avgRating === -1) return 0
              if (a.avgRating === -1) return 1
              if (b.avgRating === -1) return -1
              return b.avgRating - a.avgRating
            })
            .map(({ player, avgRating }, idx) => (
              <PlayerCard
                key={player.id}
                player={player}
                index={idx}
                rating={avgRating === -1 ? null : avgRating}
              />
            ))}
        </div>
      ) : (
        <div className="empty-players-state">
          <div className="empty-players-icon">👥</div>
          <p className="empty-players-text">No players in this team</p>
        </div>
      )}
    </div>
  </div>
)

export default function MatchDetailPage() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const currentUserId = user?.id ?? null

  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [ratingModal, setRatingModal] = useState(false)
  const [ratings, setRatings] = useState([])
  const [matchPlayers, setMatchPlayers] = useState([])
  const [playerAverages, setPlayerAverages] = useState({})

  const loadMatchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch(`/api/matches/${matchId}/`, { method: 'GET' })
      setMatch(data)
    } catch (err) {
      setError(err.message || 'Failed to load match details')
    } finally {
      setLoading(false)
    }
  }

  const loadRatings = async (matchData) => {
    if (!matchData?.id) return
    try {
      const data = await apiFetch(`/api/ratings/match/${matchData.id}/`, { method: 'GET' })
      setRatings(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading ratings:', err)
    }
  }

  const loadPlayerAverages = async (matchData) => {
    if (!matchData?.id) return
    try {
      const data = await apiFetch(`/api/ratings/match/${matchData.id}/?averages=true`, { method: 'GET' })
      setPlayerAverages(data && typeof data === 'object' ? data : {})
    } catch (err) {
      console.error('Error loading player averages:', err)
    }
  }

  useEffect(() => {
    loadMatchData()
  }, [matchId])

  useEffect(() => {
    if (!match) return

    const allPlayers = []
    const playerIds = new Set()
    match.teams?.forEach((team) => {
      team.members?.forEach((player) => {
        if (!playerIds.has(player.id)) {
          playerIds.add(player.id)
          allPlayers.push(player)
        }
      })
    })
    setMatchPlayers(allPlayers)
    loadRatings(match)
    loadPlayerAverages(match)
  }, [match])

  const handleRatingSubmit = async (ratedUserId, score) => {
    if (!match) return
    await apiFetch('/api/ratings/create/', {
      method: 'POST',
      body: JSON.stringify({
        match_id: match.id,
        rated_user_id: ratedUserId,
        score
      })
    })
    await loadRatings(match)
    await loadPlayerAverages(match)
  }

  const handleDelete = async () => {
    if (!match) return
    setIsDeleting(true)
    try {
      await apiFetch('/api/matches/delete/', {
        method: 'POST',
        body: JSON.stringify({ match_id: match.id })
      })
      if (match.squad?.id) navigate(`/squads/${match.squad.id}/matches/`)
      else navigate('/squads/')
    } catch (err) {
      alert('Error deleting match: ' + (err.message || 'Unknown error'))
      setIsDeleting(false)
      setDeleteModal(false)
    }
  }

  const isCurrentUserPlayer = useMemo(() => {
    if (!currentUserId || !match?.teams) return false
    return match.teams.some((team) => team.members?.some((player) => player.id === currentUserId))
  }, [currentUserId, match])

  const isCurrentUserAdmin = useMemo(() => {
    if (!currentUserId || !match?.squad?.admins) return false
    return match.squad.admins.some((admin) => admin.id === currentUserId)
  }, [currentUserId, match])

  const playersToRate = useMemo(
    () => matchPlayers.filter((p) => p.id !== currentUserId),
    [matchPlayers, currentUserId]
  )

  const emoji = match ? getLocationEmoji(match.location, match.id) : '🏟️'
  const playerCount = match?.players?.length ?? 0
  const teamCount = match?.teams?.length ?? 0
  const squad = match?.squad

  const matchDateTime = match?.datetime
    ? (() => {
        const [datePart, timePart] = match.datetime.split('T')
        return `${formatDateLong(datePart)} ${formatTime(timePart)}`
      })()
    : null

  const goBackToMatches = () => {
    if (match?.squad?.id) navigate(`/squads/${match.squad.id}/matches/`)
    else navigate('/squads/')
  }

  return (
    <main className="match-detail-page">
      {squad ? (
        <section className="breadcrumb-section" style={{ justifyContent: 'center' }}>
          <div style={CENTER_COLUMN_STYLE}>
            <div className="breadcrumb">
              <a href="/squads/" className="breadcrumb-item">
                SQUADS
              </a>
              <span className="breadcrumb-separator">→</span>
              <a href={`/squads/${squad.id}/`} className="breadcrumb-item">
                {squad.name}
              </a>
              <span className="breadcrumb-separator">→</span>
              <a href={`/squads/${squad.id}/matches/`} className="breadcrumb-item">
                MATCHES
              </a>
              {matchDateTime ? (
                <>
                  <span className="breadcrumb-separator">→</span>
                  <span className="breadcrumb-item active">{matchDateTime}</span>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="page-hero">
        <div style={CENTER_COLUMN_STYLE}>
          <div className="hero-content">
            <h1>
              Match <span className="glow">Details</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="match-detail-section">
        <div className="match-detail-center" style={CENTER_COLUMN_STYLE}>
          <div className="detail-container">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                </div>
                <p className="loading-text">Loading Match...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <div className="error-icon">⚠️</div>
                <h3>Error Loading Match</h3>
                <p>{error}</p>
                <button type="button" className="btn btn-primary" onClick={goBackToMatches}>
                  Back to Matches
                </button>
              </div>
            ) : match ? (
              <>
                <div className="match-profile-card">
                  <div className="match-profile-header">
                    <div className="match-avatar-large">{emoji}</div>
                    <div className="match-header-info">
                      {match.id ? <div className="match-id-badge">Match #{match.id}</div> : null}
                      <h1 className="match-profile-location">{match.location}</h1>
                      <div className="match-datetime-info">
                        {match.datetime ? (
                          (() => {
                            const [datePart, timePart] = match.datetime.split('T')
                            return (
                              <>
                                <span>📅</span>
                                <span>{formatDateLong(datePart)}</span>
                                <span>•</span>
                                <span>⏰</span>
                                <span>{formatTime(timePart)}</span>
                              </>
                            )
                          })()
                        ) : (
                          <>
                            <span>📅</span>
                            <span>N/A</span>
                            <span>•</span>
                            <span>⏰</span>
                            <span>N/A</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="match-header-actions">
                      {isCurrentUserPlayer ? (
                        <button type="button" className="btn btn-primary" onClick={() => setRatingModal(true)}>
                          ⭐ Rate Players
                        </button>
                      ) : null}
                      {isCurrentUserAdmin ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => navigate(`/matches/${match.id}/update`)}
                          >
                            Edit Match
                          </button>
                          <button type="button" className="btn btn-danger" onClick={() => setDeleteModal(true)}>
                            ✕ Delete
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="match-stats-bar">
                    <div className="match-stat">
                      <span className="match-stat-icon">⚔️</span>
                      <span className="match-stat-value accent">{teamCount}</span>
                      <span className="match-stat-label">Team{teamCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="match-stat">
                      <span className="match-stat-icon">👥</span>
                      <span className="match-stat-value accent">{playerCount}</span>
                      <span className="match-stat-label">Player{playerCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="match-stat">
                      <span className="match-stat-icon">🛡️</span>
                      <span className="match-stat-value">{squad?.name}</span>
                      <span className="match-stat-label">Squad</span>
                    </div>
                  </div>

                  {teamCount > 0 ? (
                    <div className="match-profile-content">
                      <div className="teams-section-header">
                        <div className="teams-title">
                          <div className="teams-title-icon">⚔️</div>
                          Teams
                        </div>
                        <div className="teams-count-badge">
                          {teamCount} Team{teamCount !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="teams-container">
                        {match.teams.map((team, index) => (
                          <TeamCard key={team.id} team={team} index={index} playerAverages={playerAverages} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="match-actions-bar">
                  <button type="button" className="btn btn-ghost btn-lg" onClick={goBackToMatches}>
                    ← Back to Matches
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {ratingModal ? (
        <RatingModal
          isOpen={ratingModal}
          onClose={() => setRatingModal(false)}
          players={playersToRate}
          currentUserId={currentUserId}
          ratings={ratings}
          onSubmit={handleRatingSubmit}
        />
      ) : null}

      <ConfirmationModal
        isOpen={deleteModal}
        onClose={() => !isDeleting && setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Match"
        message={`Are you sure you want to delete Match #${match?.id}? This action cannot be undone and will also delete all associated teams.`}
        confirmText={isDeleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        isLoading={isDeleting}
      />
    </main>
  )
}
