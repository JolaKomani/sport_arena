import React, { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../api/http'
import { useAuth } from '../../auth/AuthContext'
import ExportMenu from '../../components/ExportMenu'
import ReportCharts from '../../components/ReportCharts'

import '../../../css/reports/reports.css'

const REPORT_TYPES = [
  { id: 'squad_activity', label: 'Squad activity' },
  { id: 'player_performance', label: 'Player performance' },
  { id: 'ratings_leaderboard', label: 'Ratings leaderboard' }
]

function formatHeader(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function SummaryCards({ summary, reportType }) {
  if (!summary) return null

  const entries = Object.entries(summary).filter(([, v]) => v !== null && v !== undefined)

  return (
    <div className="report-summary-grid">
      {entries.map(([key, value]) => (
        <div key={key} className="report-summary-card">
          <div className="report-summary-value">{value}</div>
          <div className="report-summary-label">{formatHeader(key)}</div>
        </div>
      ))}
    </div>
  )
}

function ReportTable({ headers, rows }) {
  if (!rows?.length) {
    return (
      <div className="empty-state">
        <p>No rows match your criteria.</p>
      </div>
    )
  }

  const cols = headers?.length ? headers : Object.keys(rows[0])

  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            {cols.map((h) => (
              <th key={h}>{formatHeader(h)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.match_id || row.player_id || row.rank || idx}>
              {cols.map((h) => (
                <td key={h}>{row[h] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [squads, setSquads] = useState([])
  const [reportType, setReportType] = useState('squad_activity')
  const [squadId, setSquadId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [limit, setLimit] = useState('20')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const squadRequired = reportType === 'squad_activity'
  const showSquadFilter =
    reportType === 'squad_activity' ||
    reportType === 'player_performance' ||
    reportType === 'ratings_leaderboard'

  useEffect(() => {
    const loadSquads = async () => {
      try {
        const data = await apiFetch('/api/squads/', { method: 'GET' })
        const list = [
          ...(data.my_squads || []),
          ...(data.member_squads || []),
          ...(data.public_squads || [])
        ]
        const seen = new Set()
        const unique = list.filter((s) => {
          if (seen.has(s.id)) return false
          seen.add(s.id)
          return true
        })
        setSquads(unique)
        if (unique.length && !squadId) {
          setSquadId(String(unique[0].id))
        }
      } catch {
        setSquads([])
      }
    }
    if (user) loadSquads()
  }, [user])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('report_type', reportType)
    if (squadId) {
      params.set('squad_id', squadId)
    }
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (reportType === 'ratings_leaderboard') {
      params.set('limit', limit)
    }
    return params.toString()
  }, [reportType, squadId, dateFrom, dateTo, limit])

  const generateReport = async () => {
    if (reportType === 'squad_activity' && !squadId) {
      setError('Please select a squad.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await apiFetch(`/api/reports/preview/?${queryString}`, { method: 'GET' })
      setReport(data)
    } catch (err) {
      setError(err.message || 'Failed to generate report')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }

  const getExportUrl = (format) => {
    const params = new URLSearchParams(queryString)
    params.set('format', format)
    return `/api/reports/export/?${params.toString()}`
  }

  return (
    <main className="reports-page">
      <section className="breadcrumb-section">
        <div className="container">
          <div className="breadcrumb-container">
            <div className="breadcrumb">
              <span className="breadcrumb-item active">REPORTS</span>
            </div>
          </div>
        </div>
      </section>

      <section className="reports-section">
        <div className="container">
          <p className="reports-intro">
            Build dynamic reports with date ranges and squad filters. Preview charts and tables, then
            export to CSV, Excel, or JSON.
          </p>

          <div className="report-builder">
            <div className="report-builder-grid">
              <div className="report-builder-field">
                <label htmlFor="report-type">Report type</label>
                <select
                  id="report-type"
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  {REPORT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {showSquadFilter ? (
                <div className="report-builder-field">
                  <label htmlFor="report-squad">
                    Squad {squadRequired ? '' : '(optional)'}
                  </label>
                  <select
                    id="report-squad"
                    value={squadId}
                    onChange={(e) => setSquadId(e.target.value)}
                    disabled={squadRequired && !squads.length}
                  >
                    {!squadRequired ? <option value="">All squads</option> : null}
                    {squads.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="report-builder-field">
                <label htmlFor="report-from">From date</label>
                <input
                  id="report-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="report-builder-field">
                <label htmlFor="report-to">To date</label>
                <input
                  id="report-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>

              {reportType === 'ratings_leaderboard' ? (
                <div className="report-builder-field">
                  <label htmlFor="report-limit">Top players</label>
                  <input
                    id="report-limit"
                    type="number"
                    min="1"
                    max="100"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                  />
                </div>
              ) : null}

              <div className="report-builder-field report-builder-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={generateReport}
                  disabled={loading}
                >
                  {loading ? 'Generating…' : 'Generate report'}
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : null}

          {report ? (
            <div className="report-preview">
              <div className="report-preview-header">
                <div>
                  <h2>{report.meta?.title || 'Report'}</h2>
                  <p className="report-preview-meta">
                    {report.rows?.length || 0} row(s)
                    {report.meta?.date_from || report.meta?.date_to
                      ? ` · ${report.meta.date_from || '…'} → ${report.meta.date_to || '…'}`
                      : ''}
                  </p>
                </div>
                <ExportMenu getExportUrl={getExportUrl} label="Export report" />
              </div>

              <SummaryCards summary={report.summary} reportType={report.meta?.report_type} />
              <ReportCharts report={report} />
              <ReportTable headers={report.export_headers} rows={report.rows} />
            </div>
          ) : !loading && !error ? (
            <div className="empty-state">
              <p>Choose criteria and click Generate report to see results.</p>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
