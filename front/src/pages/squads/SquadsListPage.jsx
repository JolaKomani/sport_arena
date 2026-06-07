import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../../api/http'
import ModalOverlay from '../../components/ModalOverlay'
import AdvancedSearchPanel from '../../components/AdvancedSearchPanel'
import ExportMenu from '../../components/ExportMenu'

import '../../../css/squads/list.css'

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

function LoadingSpinner({ text }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      <p className="loading-text">{text}</p>
    </div>
  )
}

function ErrorState({ title, message, onRetry }) {
  return (
    <div className="error-state">
      <div className="error-icon">⚠️</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {onRetry ? (
        <button className="btn btn-primary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  )
}

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

const PlayerItem = ({ player }) => (
  <div className="player-item">
    <div className="player-avatar">{getInitials(player.name)}</div>
    <span className="player-name">{player.name}</span>
    <div className="player-status"></div>
  </div>
)

const SectionTitle = ({ icon, iconClass, title, count }) => (
  <div className="section-title-row">
    <h2>
      <div className={`section-icon ${iconClass}`}>{icon}</div>
      {title}
    </h2>
    <div className="section-line"></div>
    <div className="squad-count">
      {count} Squad{count !== 1 ? 's' : ''}
    </div>
  </div>
)

const SquadCard = ({ squad, isUserSquad, onDelete, onMatches, onDetails }) => {
  const emoji = getSquadEmoji(squad.name, squad.id)
  const playerCount = squad.players ? squad.players.length : 0

  return (
    <div className={`squad-card ${isUserSquad ? 'user-squad' : ''}`}>
      <div className="squad-header">
        <div className="squad-identity">
          <div className="squad-avatar">{emoji}</div>
          <div className="squad-info">
            <div className="squad-info-top">
              <span className="squad-id">Squad #{squad.id}</span>
              {squad.is_public !== undefined ? (
                <span className={`squad-visibility ${squad.is_public ? 'public' : 'private'}`}>
                  {squad.is_public ? '🌐 Public' : '🔒 Private'}
                </span>
              ) : null}
            </div>
            <h3 className="squad-name">{squad.name}</h3>
          </div>
        </div>
        <div className="squad-header-actions">
          {isUserSquad ? (
            <button type="button" className="squad-delete-btn" onClick={() => onDelete?.(squad)} title="Delete squad">
              ✕
            </button>
          ) : null}
        </div>
      </div>

      <div className="squad-players">
        <div className="players-label">
          <span className="players-label-icon">👥</span>
          <span>Roster ({playerCount} Players)</span>
        </div>

        {playerCount > 0 ? (
          <div className="players-list">
            {squad.players.map((player) => (
              <PlayerItem key={player.id} player={player} />
            ))}
          </div>
        ) : (
          <div className="empty-players">
            <div className="empty-players-icon">👤</div>
            <p className="empty-players-text">No players yet</p>
          </div>
        )}
      </div>

      <div className="squad-actions">
        <button className="btn btn-primary" onClick={() => onMatches?.(squad)}>
          Matches
        </button>
        <button className="btn btn-primary" onClick={() => onDetails?.(squad)}>
          Details
        </button>
      </div>
    </div>
  )
}

export default function SquadsListPage() {
  const navigate = useNavigate()

  const [mySquads, setMySquads] = useState([])
  const [adminSquadIds, setAdminSquadIds] = useState([])
  const [publicSquads, setPublicSquads] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, squad: null })
  const [searchMeta, setSearchMeta] = useState(null)
  const [searchParams, setSearchParams] = useState(new URLSearchParams())
  const hasLoadedRef = useRef(false)

  const fetchSquads = async (params = searchParams) => {
    try {
      if (hasLoadedRef.current) {
        setIsRefreshing(true)
      } else {
        setInitialLoading(true)
      }
      setError(null)
      const qs = params.toString()
      const url = qs ? `/api/squads/?${qs}` : '/api/squads/'
      const data = await apiFetch(url, { method: 'GET' })
      setMySquads(
        data.my_squads || [...(data.user_squads || []), ...(data.member_squads || [])]
      )
      setAdminSquadIds(
        data.admin_squad_ids || (data.user_squads || []).map((s) => s.id)
      )
      setPublicSquads(data.public_squads || [])
      setSearchMeta(data.meta || null)
    } catch (err) {
      setError(err.message || 'Failed to fetch squads')
    } finally {
      hasLoadedRef.current = true
      setInitialLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchSquads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (params) => {
    setSearchParams(params)
    fetchSquads(params)
  }

  const handleDeleteClick = (squad) => setDeleteModal({ isOpen: true, squad })

  const handleDeleteConfirm = async () => {
    const squad = deleteModal.squad
    if (!squad) return
    try {
      await apiFetch('/api/squads/delete/', {
        method: 'POST',
        body: JSON.stringify({ squad_id: squad.id })
      })
      setMySquads((prev) => prev.filter((s) => s.id !== squad.id))
      setAdminSquadIds((prev) => prev.filter((id) => id !== squad.id))
      setPublicSquads((prev) => prev.filter((s) => s.id !== squad.id))
    } catch (err) {
      alert('Error deleting squad: ' + (err.message || 'Unknown error'))
    } finally {
      setDeleteModal({ isOpen: false, squad: null })
    }
  }

  return (
    <main className="squads-page">
      <section className="breadcrumb-section">
        <div className="container">
          <div className="breadcrumb-container">
            <div className="breadcrumb">
              <span className="breadcrumb-item">SQUADS</span>
            </div>
            <div className="breadcrumb-actions">
              <ExportMenu
                getExportUrl={(format) => {
                  const params = new URLSearchParams(searchParams)
                  params.set('format', format)
                  const qs = params.toString()
                  return qs ? `/api/squads/export/?${qs}` : `/api/squads/export/?format=${format}`
                }}
              />
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/squads/create/')}>
                <span className="btn-icon">+</span>
                Create Squad
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="squads-section">
        <div className="container">
          <AdvancedSearchPanel variant="squads" onSearch={handleSearch} />

          {searchMeta?.total !== undefined ? (
            <p className="advanced-search-results-hint">
              Showing <strong>{searchMeta.total}</strong> squad{searchMeta.total !== 1 ? 's' : ''}
              {searchMeta.q ? (
                <>
                  {' '}
                  matching &quot;<strong>{searchMeta.q}</strong>&quot;
                </>
              ) : null}
            </p>
          ) : null}

          {initialLoading ? (
            <LoadingSpinner text="Loading Squads..." />
          ) : error ? (
            <ErrorState title="Error Loading Squads" message={error} onRetry={fetchSquads} />
          ) : (
            <>
              <SectionTitle icon="⚡" iconClass="user-icon" title="MY SQUADS" count={mySquads.length} />
              {mySquads.length > 0 ? (
                <div className={`squads-grid ${isRefreshing ? 'is-refreshing' : ''}`}>
                  {mySquads.map((squad) => {
                    const isUserSquad = adminSquadIds.includes(squad.id)
                    return (
                      <SquadCard
                        key={squad.id}
                        squad={squad}
                        isUserSquad={isUserSquad}
                        onDelete={isUserSquad ? handleDeleteClick : null}
                        onMatches={(s) => (window.location.href = `/squads/${s.id}/matches/`)}
                        onDetails={(s) => navigate(`/squads/${s.id}/`)}
                      />
                    )
                  })}
                </div>
              ) : (
                <div className="empty-section">
                  <p className="empty-section-text">
                    {searchMeta?.q
                      ? 'No squads match your search in this section.'
                      : "You don't have any squads yet. Create one to get started!"}
                  </p>
                </div>
              )}

              <SectionTitle icon="🌐" iconClass="other-icon" title="PUBLIC SQUADS" count={publicSquads.length} />
              {publicSquads.length > 0 ? (
                <div className={`squads-grid ${isRefreshing ? 'is-refreshing' : ''}`}>
                  {publicSquads.map((squad) => (
                    <SquadCard
                      key={squad.id}
                      squad={squad}
                      isUserSquad={false}
                      onMatches={(s) => (window.location.href = `/squads/${s.id}/matches/`)}
                      onDetails={(s) => navigate(`/squads/${s.id}/`)}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-section">
                  <p className="empty-section-text">
                    {searchMeta?.q
                      ? 'No public squads match your search.'
                      : 'No public squads available at the moment.'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, squad: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Squad"
        message={`Are you sure you want to delete "${deleteModal.squad?.name}"? This action cannot be undone and will also delete all associated matches.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </main>
  )
}

