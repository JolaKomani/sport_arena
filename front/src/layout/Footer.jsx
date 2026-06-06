import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              <div className="logo-icon">⚡</div>
              SportZone
            </Link>
            <p>Next-generation sports platform for competitive players and teams.</p>
          </div>

          <div>
            <h4 className="footer-title">Platform</h4>
            <ul className="footer-links">
              <li>
                <a href="#">Find Squads</a>
              </li>
              <li>
                <a href="#">Book Arenas</a>
              </li>
              <li>
                <a href="#">Rankings</a>
              </li>
              <li>
                <a href="#">Tournaments</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-title">For Venues</h4>
            <ul className="footer-links">
              <li>
                <a href="#">List Your Arena</a>
              </li>
              <li>
                <a href="#">Venue Dashboard</a>
              </li>
              <li>
                <a href="#">Pricing</a>
              </li>
              <li>
                <a href="#">Partners</a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li>
                <a href="#">About</a>
              </li>
              <li>
                <a href="#">Careers</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
              <li>
                <a href="#">Contact</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">© 2026 SportZone. All rights reserved.</p>
          <div className="footer-social">
            <a href="#" className="social-link">
              𝕏
            </a>
            <a href="#" className="social-link">
              📷
            </a>
            <a href="#" className="social-link">
              ▶
            </a>
            <a href="#" className="social-link">
              💬
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

