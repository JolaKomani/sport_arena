import React, { useEffect, useRef } from 'react'
import { Chart } from 'chart.js/auto'

const chartColors = [
  'rgba(0, 212, 255, 0.8)',
  'rgba(147, 51, 234, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(0, 255, 136, 0.8)',
  'rgba(255, 193, 7, 0.8)'
]

function destroyChart(ref) {
  if (ref.current) {
    ref.current.destroy()
    ref.current = null
  }
}

function SingleChart({ id, type, labels, values, label, colorIndex = 0 }) {
  const canvasRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    destroyChart(instanceRef)
    if (!canvasRef.current || !labels?.length || !values?.length) return undefined

    const color = chartColors[colorIndex % chartColors.length]
    instanceRef.current = new Chart(canvasRef.current, {
      type,
      data: {
        labels,
        datasets: [
          {
            label,
            data: values,
            backgroundColor: type === 'line' ? color.replace('0.8', '0.15') : color,
            borderColor: type === 'line' ? color : undefined,
            borderWidth: type === 'line' ? 2 : 1,
            fill: type === 'line',
            tension: 0.35
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales:
          type === 'pie' || type === 'doughnut'
            ? {}
            : {
                y: {
                  beginAtZero: true,
                  ticks: { color: '#888' },
                  grid: { color: 'rgba(255,255,255,0.08)' }
                },
                x: {
                  ticks: { color: '#888', maxRotation: 45 },
                  grid: { color: 'rgba(255,255,255,0.05)' }
                }
              }
      }
    })

    return () => destroyChart(instanceRef)
  }, [type, labels, values, label, colorIndex])

  if (!labels?.length) {
    return <p className="report-chart-empty">No chart data for selected criteria.</p>
  }

  return (
    <div className="report-chart-box">
      <h4 className="report-chart-title">{label}</h4>
      <div className="report-chart-canvas-wrap">
        <canvas ref={canvasRef} id={id} />
      </div>
    </div>
  )
}

export default function ReportCharts({ report }) {
  if (!report?.charts) return null

  const { charts, meta } = report
  const type = meta?.report_type

  if (type === 'squad_activity' && charts.matches_by_month) {
    return (
      <div className="report-charts-grid">
        <SingleChart
          id="matches-by-month"
          type="bar"
          labels={charts.matches_by_month.labels}
          values={charts.matches_by_month.values}
          label="Matches per month"
        />
      </div>
    )
  }

  if (type === 'player_performance') {
    return (
      <div className="report-charts-grid report-charts-grid--two">
        {charts.rating_trend ? (
          <SingleChart
            id="rating-trend"
            type="line"
            labels={charts.rating_trend.labels}
            values={charts.rating_trend.values}
            label="Average rating by others"
            colorIndex={0}
          />
        ) : null}
        {charts.match_results ? (
          <SingleChart
            id="match-results"
            type="doughnut"
            labels={charts.match_results.labels}
            values={charts.match_results.values}
            label="Match results"
            colorIndex={1}
          />
        ) : null}
      </div>
    )
  }

  if (type === 'ratings_leaderboard' && charts.top_players) {
    return (
      <div className="report-charts-grid">
        <SingleChart
          id="top-players"
          type="bar"
          labels={charts.top_players.labels}
          values={charts.top_players.values}
          label="Top players by average rating"
          colorIndex={2}
        />
      </div>
    )
  }

  return null
}
