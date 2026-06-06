import React from 'react'

/**
 * Full-screen modal shell. Clicking the dimmed backdrop (outside the dialog) calls onClose.
 */
export default function ModalOverlay({ onClose, children, className = '' }) {
  return (
    <div className={`modal-overlay${className ? ` ${className}` : ''}`} role="presentation">
      <button type="button" className="modal-backdrop" aria-label="Close dialog" onClick={onClose} />
      {children}
    </div>
  )
}
