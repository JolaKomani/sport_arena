import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useLocation } from 'react-router-dom'

import { AuthProvider, useAuth } from './auth/AuthContext'
import Layout from './layout/Layout'

import HomePage from './pages/HomePage'
import LoginPage from './pages/users/LoginPage'
import RegisterPage from './pages/users/RegisterPage'
import ProfilePage from './pages/users/ProfilePage'
import PerformancePage from './pages/users/PerformancePage'

import MatchesListPage from './pages/matches/MatchesListPage'
import MatchCreatePage from './pages/matches/MatchCreatePage'
import MatchDetailPage from './pages/matches/MatchDetailPage'
import MatchEditPage from './pages/matches/MatchEditPage'
import SquadMatchesPage from './pages/matches/SquadMatchesPage'

import SquadsListPage from './pages/squads/SquadsListPage'
import SquadCreatePage from './pages/squads/SquadCreatePage'
import SquadDetailPage from './pages/squads/SquadDetailPage'
import SquadEditPage from './pages/squads/SquadEditPage'
import RankingsPage from './pages/rankings/RankingsPage'
import ReportsPage from './pages/reports/ReportsPage'

function ScrollToHash() {
  const location = useLocation()

  React.useEffect(() => {
    const hash = location.hash
    if (!hash) return

    // Wait for DOM paint (important for SPA routes)
    const id = hash.replace('#', '')
    const t = setTimeout(() => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
    return () => clearTimeout(t)
  }, [location.hash, location.pathname])

  return null
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/users/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Layout>
        <ScrollToHash />
        <Routes>
          <Route path="/" element={<HomePage />} />

          <Route path="/users/login" element={<LoginPage />} />
          <Route path="/users/create" element={<RegisterPage />} />
          <Route
            path="/users/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/users/profile/"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route
            path="/users/performance"
            element={
              <RequireAuth>
                <PerformancePage />
              </RequireAuth>
            }
          />
          <Route
            path="/users/performance/"
            element={
              <RequireAuth>
                <PerformancePage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports"
            element={
              <RequireAuth>
                <ReportsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/"
            element={
              <RequireAuth>
                <ReportsPage />
              </RequireAuth>
            }
          />

          <Route path="/matches" element={<MatchesListPage />} />
          <Route path="/matches/" element={<MatchesListPage />} />
          <Route
            path="/matches/create"
            element={
              <RequireAuth>
                <MatchCreatePage />
              </RequireAuth>
            }
          />
          <Route path="/matches/:matchId" element={<MatchDetailPage />} />
          <Route path="/matches/:matchId/" element={<MatchDetailPage />} />
          <Route
            path="/matches/:matchId/update"
            element={
              <RequireAuth>
                <MatchEditPage />
              </RequireAuth>
            }
          />
          <Route
            path="/matches/:matchId/update/"
            element={
              <RequireAuth>
                <MatchEditPage />
              </RequireAuth>
            }
          />

          {/* Squads (support trailing slashes like the old app) */}
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/rankings/" element={<RankingsPage />} />

          <Route path="/squads" element={<SquadsListPage />} />
          <Route path="/squads/" element={<SquadsListPage />} />
          <Route
            path="/squads/create"
            element={
              <RequireAuth>
                <SquadCreatePage />
              </RequireAuth>
            }
          />
          <Route
            path="/squads/create/"
            element={
              <RequireAuth>
                <SquadCreatePage />
              </RequireAuth>
            }
          />
          <Route path="/squads/:squadId" element={<SquadDetailPage />} />
          <Route path="/squads/:squadId/" element={<SquadDetailPage />} />
          <Route path="/squads/:squadId/matches" element={<SquadMatchesPage />} />
          <Route path="/squads/:squadId/matches/" element={<SquadMatchesPage />} />
          <Route
            path="/squads/:squadId/update"
            element={
              <RequireAuth>
                <SquadEditPage />
              </RequireAuth>
            }
          />
          <Route
            path="/squads/:squadId/update/"
            element={
              <RequireAuth>
                <SquadEditPage />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </AuthProvider>
  )
}

