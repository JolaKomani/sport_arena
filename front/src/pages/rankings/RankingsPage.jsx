import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api/http'
import ExportMenu from '../../components/ExportMenu'

import '../../../css/rankings/list.css'

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

export default function RankingsPage() {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadRankings = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch('/api/users/rankings/?all=1', { method: 'GET' })
      setRankings(data.rankings || [])
    } catch (err) {
      setError(err.message || 'Failed to load rankings')
      setRankings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRankings()
  }, [])

  const getExportUrl = (format) => `/api/users/rankings/export/?format=${encodeURIComponent(format)}`

  return (
    <main className="rankings-page">
      <section className="breadcrumb-section">
        <div className="container">
          <div className="breadcrumb-container">
            <div className="breadcrumb">
              <span className="breadcrumb-item active">PLAYER RANKINGS</span>
            </div>
            <ExportMenu getExportUrl={getExportUrl} label="Export" />
          </div>
        </div>
      </section>

      <section className="rankings-section">
        <div className="container">
          <p className="rankings-intro">
            All players with ratings, sorted by average score (highest first).
          </p>

          {loading ? (
            <LoadingSpinner text="Loading rankings…" />
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
              <button type="button" className="btn btn-primary" onClick={loadRankings}>
                Retry
              </button>
            </div>
          ) : rankings.length === 0 ? (
            <div className="empty-state">
              <p>No rated players yet. Play matches and submit ratings to appear here.</p>
            </div>
          ) : (
            <div className="rankings-table-wrap">
              <table className="rankings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th>Email</th>
                    <th>Avg rating</th>
                    <th>Ratings</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((row) => (
                    <tr key={row.player_id} className={row.rank <= 3 ? `rank-top rank-${row.rank}` : ''}>
                      <td className="rank-cell">#{row.rank}</td>
                      <td className="name-cell">{row.name}</td>
                      <td className="email-cell">{row.email}</td>
                      <td className="rating-cell">
                        <span className="rating-badge">{Number(row.average_rating).toFixed(2)}</span>
                      </td>
                      <td className="count-cell">{row.rating_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
