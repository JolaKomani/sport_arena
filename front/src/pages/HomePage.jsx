import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/http'

import '../../css/home/home.css'

function formatStat(value) {
  if (value == null) return '—'
  return value.toLocaleString()
}

function formatMatchDate(datetime) {
  if (!datetime) return '—'
  const [datePart, timePart] = datetime.split('T')
  const date = new Date(`${datePart}T${timePart || '00:00'}`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatMatchTime(datetime) {
  if (!datetime) return '—'
  const [, timePart] = datetime.split('T')
  if (!timePart) return '—'
  const [h, m] = timePart.split(':')
  const hour = parseInt(h, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${m} ${ampm}`
}

function statusLabel(status) {
  if (status === 'live') return 'Live'
  if (status === 'upcoming') return 'Upcoming'
  if (status === 'latest') return 'Latest'
  return 'Match'
}

function teamInitial(name) {
  return (name || '?').trim().charAt(0).toUpperCase()
}

export default function HomePage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const payload = await apiFetch('/api/home/', { method: 'GET' })
        setData(payload)
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const stats = data?.stats || {}
  const featured = data?.featured_match
  const arenas = data?.arenas || []

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge">Season 2026 Active</div>
            <h1>
              Enter The
              <br />
              <span className="glow">Arena</span>
            </h1>
            <p className="hero-description">
              Connect with players, join squads, schedule matches, and track rankings on Sport Z.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <div className="stat-value">{loading ? '…' : formatStat(stats.players)}</div>
                <div className="stat-label">Registered Players</div>
              </div>
              <div className="stat">
                <div className="stat-value">{loading ? '…' : formatStat(stats.active_squads)}</div>
                <div className="stat-label">Active Squads</div>
              </div>
              <div className="stat">
                <div className="stat-value">{loading ? '…' : formatStat(stats.arenas)}</div>
                <div className="stat-label">Arenas</div>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-card">
              <div className="hero-card-inner">
                {featured ? (
                  <>
                    <div className="hero-card-header">
                      <h3 className="hero-card-title">Featured Match</h3>
                      <div
                        className={`live-badge ${featured.status === 'live' ? '' : 'live-badge--muted'}`}
                      >
                        {statusLabel(featured.status)}
                      </div>
                    </div>
                    <div className="match-preview">
                      <div className="team-display">
                        <div className="team-avatar">{teamInitial(featured.team_1?.name)}</div>
                        <span className="team-name">{featured.team_1?.name}</span>
                      </div>
                      <span className="vs-badge">
                        {featured.team_1?.score != null && featured.team_2?.score != null
                          ? `${featured.team_1.score} - ${featured.team_2.score}`
                          : 'VS'}
                      </span>
                      <div className="team-display">
                        <div className="team-avatar pink">{teamInitial(featured.team_2?.name)}</div>
                        <span className="team-name">{featured.team_2?.name}</span>
                      </div>
                    </div>
                    <div className="match-details">
                      <div className="match-detail">
                        <div className="match-detail-label">Date</div>
                        <div className="match-detail-value">{formatMatchDate(featured.datetime)}</div>
                      </div>
                      <div className="match-detail">
                        <div className="match-detail-label">Time</div>
                        <div className="match-detail-value">{formatMatchTime(featured.datetime)}</div>
                      </div>
                      <div className="match-detail">
                        <div className="match-detail-label">Arena</div>
                        <div className="match-detail-value">{featured.location}</div>
                      </div>
                    </div>
                    {featured.squad_name ? (
                      <p className="hero-card-squad">
                        Squad: <strong>{featured.squad_name}</strong>
                      </p>
                    ) : null}
                    <Link to={`/matches/${featured.id}/`} className="btn btn-primary btn-sm hero-card-link">
                      View match
                    </Link>
                  </>
                ) : (
                  <div className="hero-card-empty">
                    <h3 className="hero-card-title">Featured Match</h3>
                    <p>{loading ? 'Loading…' : 'No matches scheduled yet.'}</p>
                    <Link to="/squads/" className="btn btn-ghost btn-sm">
                      Browse squads
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <span className="section-label">System Features</span>
            <h2 className="section-title">Power Your Game</h2>
            <p className="section-description">Tools for squads, matches, ratings, and reports.</p>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">⭐</div>
              <h3 className="feature-title">Player Ratings</h3>
              <p className="feature-description">
                Rate teammates after each match and build your reputation on the platform.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🎯</div>
              <h3 className="feature-title">Squads</h3>
              <p className="feature-description">
                Create private or public squads and invite players by email.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🏟️</div>
              <h3 className="feature-title">Matches</h3>
              <p className="feature-description">
                Schedule matches with teams, locations, and live notifications for players.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3 className="feature-title">Reports</h3>
              <p className="feature-description">
                Dynamic reports with charts and export to CSV, Excel, JSON, or PDF.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">🏆</div>
              <h3 className="feature-title">Rankings</h3>
              <p className="feature-description">
                Global leaderboard based on average ratings from other players.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">💬</div>
              <h3 className="feature-title">Notifications</h3>
              <p className="feature-description">
                Real-time alerts when you are added to a squad or match.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Getting Started</span>
            <h2 className="section-title">Join The Arena</h2>
            <p className="section-description">Four steps to start competing.</p>
          </div>

          <div className="steps-container">
            <div className="step-card">
              <div className="step-number">01</div>
              <div className="step-icon">🔐</div>
              <h3 className="step-title">Create Profile</h3>
              <p className="step-description">
                <Link to="/users/create/">Register</Link> and sign in.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">02</div>
              <div className="step-icon">👥</div>
              <h3 className="step-title">Build Squad</h3>
              <p className="step-description">
                <Link to="/squads/">Join or create</Link> a squad.
              </p>
            </div>

            <div className="step-card">
              <div className="step-number">03</div>
              <div className="step-icon">📍</div>
              <h3 className="step-title">Schedule Match</h3>
              <p className="step-description">Pick a location and invite players.</p>
            </div>

            <div className="step-card">
              <div className="step-number">04</div>
              <div className="step-icon">🎮</div>
              <h3 className="step-title">Compete</h3>
              <p className="step-description">
                <Link to="/rankings/">Climb the rankings</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="fields" id="fields">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Venues</span>
            <h2 className="section-title">Arenas</h2>
            <p className="section-description">
              {loading
                ? 'Loading venues…'
                : `${formatStat(stats.arenas)} locations used across the platform.`}
            </p>
          </div>

          {arenas.length === 0 && !loading ? (
            <p className="fields-empty">No arenas yet. Locations appear when matches are created.</p>
          ) : (
            <div className="fields-grid">
              {arenas.map((arena, index) => (
                <div key={`${arena.source}-${arena.id}`} className="field-card">
                  <div
                    className="field-image"
                    style={
                      index % 3 === 1
                        ? { background: 'linear-gradient(135deg, #ff00aa, #030712)' }
                        : index % 3 === 2
                          ? { background: 'linear-gradient(135deg, #00ff88, #030712)' }
                          : undefined
                    }
                  >
                    🏟️
                  </div>
                  <div className="field-content">
                    <h3 className="field-name">{arena.name}</h3>
                    <div className="field-location">
                      📍 {[arena.address, arena.city].filter(Boolean).join(', ') || 'Match venue'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  )
}
