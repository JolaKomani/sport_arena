import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../api/http'

export default function MatchesListPage() {
  const [matches, setMatches] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    ;(async () => {
      setError('')
      try {
        const data = await apiFetch('/api/matches/', { method: 'GET' })
        setMatches(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message || 'Failed to load matches')
      }
    })()
  }, [])

  return (
    <main className="page">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <h1>Matches</h1>
          <Link className="btn btn-primary" to="/matches/create">
            Create
          </Link>
        </div>

        {error ? <div className="server-error">{error}</div> : null}

        <ul>
          {matches.map((m) => (
            <li key={m.id}>
              <Link to={`/matches/${m.id}`}>{m.location || `Match #${m.id}`}</Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

