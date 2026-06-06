import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../../api/http'
import ModalOverlay from '../../components/ModalOverlay'
import AdvancedSearchPanel from '../../components/AdvancedSearchPanel'
import ExportMenu from '../../components/ExportMenu'
import { useAuth } from '../../auth/AuthContext'

import '../../../css/matches/list.css'

const formatDate = (dateStr) => {
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

function EmptyState({ icon, title, message, buttonText, onButtonClick }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
      {buttonText ? (
        <button className="btn btn-primary" onClick={onButtonClick}>
          {buttonText}
        </button>
      ) : null}
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

const MatchCard = ({ match, onDelete, canDelete = false }) => {
  const team1 = match.teams && match.teams[0] ? (typeof match.teams[0] === 'string' ? { name: match.teams[0], score: null } : match.teams[0]) : { name: 'Team 1', score: null }
  const team2 = match.teams && match.teams[1] ? (typeof match.teams[1] === 'string' ? { name: match.teams[1], score: null } : match.teams[1]) : { name: 'Team 2', score: null }
  const team1Name = team1.name || team1
  const team2Name = team2.name || team2
  const team1Score = team1.score !== null && team1.score !== undefined ? team1.score : null
  const team2Score = team2.score !== null && team2.score !== undefined ? team2.score : null

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    onDelete(match)
  }

  return (
    <div
      className="match-card clickable"
      onClick={() => (window.location.href = `/matches/${match.id}/`)}
    >
      <div className="match-card-header">
        <div className="match-id">
          <span className="match-id-label">Match</span>
          <span className="match-id-value">#{match.id}</span>
        </div>
        <div className="match-header-actions">
          <span className="match-status open">Open</span>
          {canDelete ? (
            <button type="button" className="match-delete-btn" onClick={handleDeleteClick} title="Delete match">
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {match.squad ? (
        <div className="match-squad-display">
          <span className="squad-icon">🛡️</span>
          <span className="squad-name">{match.squad.name}</span>
        </div>
      ) : null}

      <div className="match-content">
        <div className="match-teams-section">
          <div className="team-card-compact">
            <div className="team-name-compact">{team1Name}</div>
          </div>
          <div className="vs-container">
            {team1Score !== null && team2Score !== null ? (
              <div className="score-display">
                <span className="score-value">{team1Score}</span>
                <span className="score-separator">-</span>
                <span className="score-value">{team2Score}</span>
              </div>
            ) : (
              <span className="vs-divider">VS</span>
            )}
          </div>
          <div className="team-card-compact">
            <div className="team-name-compact">{team2Name}</div>
          </div>
        </div>

        <div className="match-details-section">
          <div className="detail-item">
            <div className="detail-icon">🏟️</div>
            <div className="detail-content">
              <div className="detail-label">Location</div>
              <div className="detail-value">{match.location}</div>
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-icon">📅</div>
            <div className="detail-content">
              <div className="detail-label">Date</div>
              <div className="detail-value">
                {match.datetime
                  ? (() => {
                      const [datePart] = match.datetime.split('T')
                      return formatDate(datePart)
                    })()
                  : 'N/A'}
              </div>
            </div>
          </div>
          <div className="detail-item">
            <div className="detail-icon">⏰</div>
            <div className="detail-content">
              <div className="detail-label">Time</div>
              <div className="detail-value">
                {match.datetime
                  ? (() => {
                      const [, timePart] = match.datetime.split('T')
                      return formatTime(timePart)
                    })()
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SquadMatchesPage() {
  const { squadId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [squadName, setSquadName] = useState(null)
  const [squadAdmins, setSquadAdmins] = useState([])
  const [matches, setMatches] = useState([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, match: null })
  const [searchMeta, setSearchMeta] = useState(null)
  const [filterQuery, setFilterQuery] = useState('')
  const hasLoadedRef = useRef(false)

  const buildMatchesQuery = (queryString = filterQuery, extra = {}) => {
    const params = new URLSearchParams(queryString)
    params.set('squad_id', String(squadId))
    Object.entries(extra).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value))
      }
    })
    return params.toString()
  }

  const isCurrentUserAdmin = useMemo(() => {
    if (!user?.id || !squadAdmins?.length) return false
    return squadAdmins.some((a) => a.id === user.id)
  }, [user, squadAdmins])

  const fetchSquadName = async () => {
    try {
      const data = await apiFetch(`/api/squads/${squadId}/`, { method: 'GET' })
      setSquadName(data.name)
      setSquadAdmins(data.admins || [])
    } catch {
      // ignore
    }
  }

  const fetchMatches = useCallback(
    async (queryString = '') => {
      try {
        if (hasLoadedRef.current) {
          setIsRefreshing(true)
        } else {
          setInitialLoading(true)
        }
        setError(null)
        setFilterQuery(queryString)
        const qs = buildMatchesQuery(queryString)
        const data = await apiFetch(`/api/matches/?${qs}`, { method: 'GET' })
        const list = Array.isArray(data) ? data : data.matches || []
        setMatches(list)
        setSearchMeta(data.meta || null)
      } catch (err) {
        setError(err.message || 'Failed to fetch matches')
      } finally {
        hasLoadedRef.current = true
        setInitialLoading(false)
        setIsRefreshing(false)
      }
    },
    [squadId]
  )

  useEffect(() => {
    hasLoadedRef.current = false
    fetchSquadName()
    setFilterQuery('')
    // Initial load is triggered by AdvancedSearchPanel (default sort/filter).
  }, [squadId])

  const handleSearch = useCallback(
    (params) => {
      const qs = params.toString()
      fetchMatches(qs)
    },
    [fetchMatches]
  )

  const handleDeleteClick = (match) => setDeleteModal({ isOpen: true, match })

  const handleDeleteConfirm = async () => {
    const match = deleteModal.match
    if (!match) return
    try {
      await apiFetch('/api/matches/delete/', {
        method: 'POST',
        body: JSON.stringify({ match_id: match.id })
      })
      await fetchMatches()
    } catch (err) {
      alert('Error deleting match: ' + (err.message || 'Unknown error'))
    } finally {
      setDeleteModal({ isOpen: false, match: null })
    }
  }

  return (
    <main className="matches-page">
      <section className="breadcrumb-section">
        <div className="container">
          <div className="breadcrumb-container">
            <div className="breadcrumb">
              <a href="/squads/" className="breadcrumb-item">
                SQUADS
              </a>
              <span className="breadcrumb-separator">→</span>
              <a href={`/squads/${squadId}/`} className="breadcrumb-item">
                {squadName || 'Loading...'}
              </a>
              <span className="breadcrumb-separator">→</span>
              <span className="breadcrumb-item active">Matches</span>
            </div>
            <div className="breadcrumb-actions">
              <ExportMenu
                getExportUrl={(format) => {
                  if (!squadId) return null
                  const qs = buildMatchesQuery(filterQuery, { format })
                  return `/api/matches/export/?${qs}`
                }}
              />
              {isCurrentUserAdmin ? (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    window.location.href = `/matches/create/?squad_id=${squadId}`
                  }}
                >
                  <span className="btn-icon">+</span>
                  Create Match
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="matches-section">
        <div className="container">
          <AdvancedSearchPanel key={squadId} variant="matches" onSearch={handleSearch} />

          {searchMeta?.total !== undefined ? (
            <p className="advanced-search-results-hint">
              Showing <strong>{searchMeta.total}</strong> match{searchMeta.total !== 1 ? 'es' : ''}
              {searchMeta.q ? (
                <>
                  {' '}
                  matching &quot;<strong>{searchMeta.q}</strong>&quot;
                </>
              ) : null}
            </p>
          ) : null}

          {initialLoading ? (
            <LoadingSpinner text="Loading Matches..." />
          ) : error ? (
            <ErrorState title="Error Loading Matches" message={error} onRetry={fetchMatches} />
          ) : matches.length === 0 ? (
            <EmptyState
              icon="🏟️"
              title={
                searchMeta?.q || searchMeta?.date_on || searchMeta?.date_from
                  ? 'No matches match your search'
                  : 'No Matches Found'
              }
              message={
                searchMeta?.q || searchMeta?.date_on || searchMeta?.date_from
                  ? 'Try adjusting date filters or clearing the search to see more results.'
                  : 'There are no scheduled matches for this squad. Create a new match to get started!'
              }
              buttonText={isCurrentUserAdmin ? 'Create Match' : null}
              onButtonClick={
                isCurrentUserAdmin
                  ? () => {
                      window.location.href = `/matches/create/?squad_id=${squadId}`
                    }
                  : null
              }
            />
          ) : (
            <div className={`matches-grid ${isRefreshing ? 'is-refreshing' : ''}`}>
              {matches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onDelete={handleDeleteClick}
                  canDelete={isCurrentUserAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, match: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Match"
        message={`Are you sure you want to delete Match #${deleteModal.match?.id}? This action cannot be undone and will also delete all associated teams.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </main>
  )
}

