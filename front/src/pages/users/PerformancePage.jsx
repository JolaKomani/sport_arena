import React, { useEffect, useRef, useState } from 'react'
import { Chart } from 'chart.js/auto'
import { apiFetch } from '../../api/http'

import '../../../css/users/performance.css'

export default function PerformancePage() {
  const [performanceData, setPerformanceData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const ratingChartRef = useRef(null)
  const selfRatingChartRef = useRef(null)
  const ratingChartInstance = useRef(null)
  const selfRatingChartInstance = useRef(null)

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiFetch('/api/users/performance/', { method: 'GET' })
      setPerformanceData(data)
    } catch (err) {
      setError(err.message || 'Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  const createCharts = () => {
    if (!performanceData?.matches?.length) return

    const matches = performanceData.matches

    const ratingLabels = matches
      .filter((m) => m.average_rating_by_others !== null)
      .map((m) => new Date(m.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    const ratingData = matches
      .filter((m) => m.average_rating_by_others !== null)
      .map((m) => m.average_rating_by_others)

    const selfRatingLabels = matches
      .filter((m) => m.self_rating !== null)
      .map((m) => new Date(m.datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    const selfRatingData = matches.filter((m) => m.self_rating !== null).map((m) => m.self_rating)

    const chartConfig = {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(0, 212, 255, 0.5)',
            borderWidth: 1,
            padding: 12,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            min: 0,
            max: 10,
            ticks: { color: '#888', stepSize: 1 },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          x: {
            ticks: { color: '#888' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        }
      }
    }

    if (ratingChartInstance.current) ratingChartInstance.current.destroy()
    if (selfRatingChartInstance.current) selfRatingChartInstance.current.destroy()

    if (ratingChartRef.current && ratingData.length > 0) {
      ratingChartInstance.current = new Chart(ratingChartRef.current, {
        ...chartConfig,
        data: {
          labels: ratingLabels,
          datasets: [
            {
              label: 'Average Rating by Others',
              data: ratingData,
              borderColor: 'rgb(0, 212, 255)',
              backgroundColor: 'rgba(0, 212, 255, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgb(0, 212, 255)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }
          ]
        }
      })
    }

    if (selfRatingChartRef.current && selfRatingData.length > 0) {
      selfRatingChartInstance.current = new Chart(selfRatingChartRef.current, {
        ...chartConfig,
        data: {
          labels: selfRatingLabels,
          datasets: [
            {
              label: 'Self Rating',
              data: selfRatingData,
              borderColor: 'rgb(147, 51, 234)',
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBackgroundColor: 'rgb(147, 51, 234)',
              pointBorderColor: '#fff',
              pointBorderWidth: 2
            }
          ]
        }
      })
    }
  }

  useEffect(() => {
    loadPerformanceData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (performanceData && performanceData.matches?.length > 0) createCharts()

    return () => {
      if (ratingChartInstance.current) ratingChartInstance.current.destroy()
      if (selfRatingChartInstance.current) selfRatingChartInstance.current.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [performanceData])

  if (loading) {
    return (
      <main className="performance-page">
        <div className="performance-container">
          <div className="loading-container">
            <div className="loading-spinner">
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
              <div className="spinner-ring"></div>
            </div>
            <p className="loading-text">Loading Performance Data...</p>
          </div>
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="performance-page">
        <div className="performance-container">
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Performance</h3>
            <p>{error}</p>
            <button className="btn btn-primary" onClick={loadPerformanceData}>
              Retry
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!performanceData || performanceData.total_matches === 0) {
    return (
      <main className="performance-page">
        <div className="performance-container">
          <div className="performance-header">
            <h1>
              Performance <span className="glow">Statistics</span>
            </h1>
            <p>Track your progress and improve your game</p>
          </div>
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Performance Data</h3>
            <p>You haven't played any matches yet. Join a squad and start playing to see your statistics!</p>
            <a href="/squads/" className="btn btn-primary" style={{ marginTop: '24px' }}>
              Browse Squads
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="performance-page">
      <div className="performance-container">
        <div className="performance-header">
          <h1>
            Performance <span className="glow">Statistics</span>
          </h1>
          <p>Track your progress and improve your game</p>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-icon">⚔️</span>
            <div className="stat-value">{performanceData.total_matches}</div>
            <div className="stat-label">Matches Played</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🏆</span>
            <div className="stat-value">{performanceData.wins}</div>
            <div className="stat-label">Matches Won</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">😔</span>
            <div className="stat-value">{performanceData.losses}</div>
            <div className="stat-label">Matches Lost</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">🤝</span>
            <div className="stat-value">{performanceData.draws}</div>
            <div className="stat-label">Draws</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">⭐</span>
            <div className="stat-value">
              {performanceData.overall_avg_rating_by_others !== null
                ? performanceData.overall_avg_rating_by_others.toFixed(1)
                : 'N/A'}
            </div>
            <div className="stat-label">Avg Rating by Others</div>
          </div>
          <div className="stat-card">
            <span className="stat-icon">💫</span>
            <div className="stat-value">
              {performanceData.overall_avg_self_rating !== null ? performanceData.overall_avg_self_rating.toFixed(1) : 'N/A'}
            </div>
            <div className="stat-label">Self Rating</div>
          </div>
        </div>

        <div className="charts-section">
          <div className="section-title">
            <div className="section-title-icon">📈</div>
            Performance Charts
          </div>

          <div className="charts-grid">
            {performanceData.matches.filter((m) => m.average_rating_by_others !== null).length > 0 ? (
              <div className="chart-card">
                <div className="chart-title">Rating Over Time (by Others)</div>
                <div className="chart-container">
                  <canvas ref={ratingChartRef}></canvas>
                </div>
              </div>
            ) : null}

            {performanceData.matches.filter((m) => m.self_rating !== null).length > 0 ? (
              <div className="chart-card">
                <div className="chart-title">Self Rating Over Time</div>
                <div className="chart-container">
                  <canvas ref={selfRatingChartRef}></canvas>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}

