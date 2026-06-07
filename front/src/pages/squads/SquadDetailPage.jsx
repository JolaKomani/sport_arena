import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../api/http'
import ModalOverlay from '../../components/ModalOverlay'

import '../../../css/squads/detail.css'

const squadEmojis = ['🦁', '🐺', '🦅', '🐉', '🦈', '🐍', '🦊', '🦇', '🔥', '⚡', '💎', '🌟', '👑', '🎯', '🏆', '💀']
const getSquadEmoji = (squadName, id) => {
  const hash = (squadName || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return squadEmojis[(hash + (id || 0)) % squadEmojis.length]
}
const getInitials = (name) => {
  if (!name) return '??'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.substring(0, 2).toUpperCase()
}

const PlayerCard = ({ player, index, isAdmin = false, avgRating = null }) => (
  <div className={`player-card ${isAdmin ? 'admin-card' : ''}`} style={{ animationDelay: `${index * 0.1}s` }}>
    <div className={`player-avatar-medium ${isAdmin ? 'admin-avatar' : ''}`}>{getInitials(player.name)}</div>
    <div className="player-info">
      <div className="player-name">{player.name}</div>
      <div className="player-role">{isAdmin ? '👑 Admin' : 'Team Member'}</div>
    </div>
    {avgRating !== null && avgRating !== undefined ? (
      <div className="player-rating-badge">{avgRating.toFixed(1)}</div>
    ) : (
      <div className={`player-status-indicator ${isAdmin ? 'admin-indicator' : ''}`}></div>
    )}
  </div>
)

const EmptyPlayersState = ({ squadId, onAddPlayers }) => (
  <div className="empty-players-state">
    <div className="empty-players-icon">👥</div>
    <h3 className="empty-players-title">No Players Yet</h3>
    <p className="empty-players-text">
      This squad doesn't have any players yet.
      <br />
      Add players to your team!
    </p>
    <button className="btn btn-primary" onClick={onAddPlayers}>
      Add Players
    </button>
  </div>
)

function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }) {
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
          <button type="button" className="btn btn-cancel" onClick={onClose}>
            {cancelText || 'Cancel'}
          </button>
          <button type="button" className="btn btn-danger" onClick={onConfirm}>
            {confirmText || 'Delete'}
          </button>
        </div>
      </div>
    </ModalOverlay>
  )
}

export default function SquadDetailPage() {
  const { squadId } = useParams()
  const navigate = useNavigate()

  const [squad, setSquad] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [playerRatings, setPlayerRatings] = useState({})

  useEffect(() => {
    ;(async () => {
      try {
        const me = await apiFetch('/api/users/me/', { method: 'GET' })
        setCurrentUserId(me.id)
      } catch {
        setCurrentUserId(null)
      }
    })()
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await apiFetch(`/api/squads/${squadId}/`, { method: 'GET' })
        setSquad(data)
      } catch (err) {
        setError(err.message || 'Failed to load squad details')
      } finally {
        setLoading(false)
      }
    })()
  }, [squadId])

  useEffect(() => {
    ;(async () => {
      if (!squad?.players?.length || !squad?.id) return
      try {
        const playerIds = squad.players.map((p) => p.id).join(',')
        const data = await apiFetch(`/api/users/avg-ratings/?player_ids=${playerIds}&squad_id=${squad.id}`, { method: 'GET' })
        setPlayerRatings(data || {})
      } catch {
        // ignore
      }
    })()
  }, [squad])

  const playerCount = squad?.players?.length || 0
  const adminCount = squad?.admins?.length || 0
  const emoji = squad ? getSquadEmoji(squad.name, squad.id) : '🛡️'

  const isCurrentUserAdmin = useMemo(() => {
    if (!currentUserId || !squad?.admins) return false
    return squad.admins.some((a) => a.id === currentUserId)
  }, [currentUserId, squad])

  const handleDelete = async () => {
    if (!squad) return
    setIsDeleting(true)
    try {
      await apiFetch('/api/squads/delete/', {
        method: 'POST',
        body: JSON.stringify({ squad_id: squad.id })
      })
      window.location.href = '/squads/'
    } catch (err) {
      alert('Error deleting squad: ' + (err.message || 'Unknown error'))
      setIsDeleting(false)
      setDeleteModal(false)
    }
  }

  return (
    <main className="squad-detail-page">
      <section className="breadcrumb-section">
        <div className="container">
          <div className="breadcrumb">
            <a href="/squads/" className="breadcrumb-item">
              SQUADS
            </a>
            <span className="breadcrumb-separator">→</span>
            <span className="breadcrumb-item active">{squad?.name || 'Loading...'}</span>
          </div>
        </div>
      </section>

      <section className="page-hero">
        <div className="container">
          <div className="hero-content">
            <h1>
              Squad <span className="glow">Profile</span>
            </h1>
          </div>
        </div>
      </section>

      <section className="squad-detail-section">
        <div className="container">
          <div className="detail-container">
            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner">
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                  <div className="spinner-ring"></div>
                </div>
                <p className="loading-text">Loading Squad...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <div className="error-icon">⚠️</div>
                <h3>Error Loading Squad</h3>
                <p>{error}</p>
                <button className="btn btn-primary" onClick={() => (window.location.href = '/squads/')}>
                  Back to Squads
                </button>
              </div>
            ) : squad ? (
              <>
                <div className="squad-profile-card">
                  <div className="squad-profile-header">
                    <div className="squad-avatar-large">{emoji}</div>
                    <div className="squad-header-info">
                      <div className="squad-info-top">
                        {squad.id ? <div className="squad-id-badge">Squad #{squad.id}</div> : null}
                        {squad.is_public !== undefined ? (
                          <span className={`squad-visibility ${squad.is_public ? 'public' : 'private'}`}>
                            {squad.is_public ? '🌐 Public' : '🔒 Private'}
                          </span>
                        ) : null}
                      </div>
                      <h1 className="squad-profile-name">{squad.name}</h1>
                      <div className="squad-created-date">
                        <span>📅</span>
                        <span>Created Recently</span>
                      </div>
                    </div>

                    {isCurrentUserAdmin ? (
                      <div className="squad-header-actions">
                        <button className="btn btn-primary" onClick={() => navigate(`/squads/${squad.id}/update/`)}>
                          Edit Squad
                        </button>
                        <button className="btn btn-danger" onClick={() => setDeleteModal(true)}>
                          ✕ Delete
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="squad-stats-bar">
                    <div className="squad-stat">
                      <span className="squad-stat-icon">👑</span>
                      <span className="squad-stat-value accent">{adminCount}</span>
                      <span className="squad-stat-label">Admin{adminCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="squad-stat">
                      <span className="squad-stat-icon">👥</span>
                      <span className="squad-stat-value accent">{playerCount}</span>
                      <span className="squad-stat-label">Player{playerCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="squad-stat">
                      <span className="squad-stat-icon">⚔️</span>
                      <span className="squad-stat-value accent">{squad.match_count || 0}</span>
                      <span className="squad-stat-label">Match{(squad.match_count || 0) !== 1 ? 'es' : ''}</span>
                    </div>
                  </div>

                  {adminCount > 0 ? (
                    <div className="squad-profile-content">
                      <div className="players-section-header">
                        <div className="players-title">
                          <div className="players-title-icon">👑</div>
                          Squad Admins
                        </div>
                        <div className="players-count-badge admin-badge">
                          {adminCount} Admin{adminCount !== 1 ? 's' : ''}
                        </div>
                      </div>

                      <div className="players-grid">
                        {squad.admins.map((admin, index) => (
                          <PlayerCard key={`admin-${admin.id}`} player={admin} index={index} isAdmin={true} />
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="squad-profile-content">
                    <div className="players-section-header">
                      <div className="players-title">
                        <div className="players-title-icon">👥</div>
                        Team Players
                      </div>
                      <div className="players-count-badge">
                        {playerCount} Player{playerCount !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {playerCount > 0 ? (
                      <div className="players-list">
                        {squad.players
                          .map((player) => {
                            const ratingData = playerRatings[player.id]
                            const avgRating = ratingData?.average_rating
                            return { player, avgRating: avgRating !== null && avgRating !== undefined ? avgRating : -1 }
                          })
                          .sort((a, b) => {
                            if (a.avgRating === -1 && b.avgRating === -1) return 0
                            if (a.avgRating === -1) return 1
                            if (b.avgRating === -1) return -1
                            return b.avgRating - a.avgRating
                          })
                          .map(({ player, avgRating }, index) => (
                            <PlayerCard
                              key={`player-${player.id}`}
                              player={player}
                              index={index}
                              avgRating={avgRating === -1 ? null : avgRating}
                            />
                          ))}
                      </div>
                    ) : (
                      <EmptyPlayersState squadId={squad.id} onAddPlayers={() => navigate(`/squads/${squad.id}/update/`)} />
                    )}
                  </div>
                </div>

                <div className="squad-actions-bar">
                  <button className="btn btn-ghost btn-lg" onClick={() => (window.location.href = '/squads/')}>
                    ← Back to Squads
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {squad ? (
        <ConfirmationModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Squad"
          message={`Are you sure you want to delete "${squad.name}"? This action cannot be undone and will also delete all associated matches.`}
          confirmText={isDeleting ? 'Deleting...' : 'Delete'}
          cancelText="Cancel"
        />
      ) : null}
    </main>
  )
}

