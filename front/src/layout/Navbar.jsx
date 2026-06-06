import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import NotificationBell from '../components/NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async (e) => {
    e.preventDefault()
    await logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <div className="logo-icon">⚡</div>
          SportZone
        </Link>

        <ul className="nav-links">
          {user ? (
            <>
              <li>
                <Link to="/squads/">Squads</Link>
              </li>
              <li>
                <Link to="/users/performance/">Performance</Link>
              </li>
              <li>
                <Link to="/reports/">Reports</Link>
              </li>
            </>
          ) : null}
          <li>
            <Link to="/rankings/">Rankings</Link>
          </li>
        </ul>

        <div className="nav-actions" id="nav-actions">
          {user ? (
            <>
              <NotificationBell />
              <Link to="/users/profile/" className="user-name">
                {user.first_name} {user.last_name}
              </Link>
              <a href="#" className="btn btn-ghost" onClick={handleLogout}>
                Log Out
              </a>
            </>
          ) : (
            <>
              <Link to="/users/login/" className="btn btn-ghost">
                Log In
              </Link>
              <Link to="/users/create/" className="btn btn-primary">
                Join Now
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

