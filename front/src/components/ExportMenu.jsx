import React, { useEffect, useRef, useState } from 'react'
import { downloadExport } from '../api/export'

import '../../css/components/export-menu.css'

const FORMATS = [
  { id: 'csv', label: 'CSV' },
  { id: 'xlsx', label: 'Excel' },
  { id: 'pdf', label: 'PDF' },
  { id: 'json', label: 'JSON' }
]

export default function ExportMenu({ getExportUrl, label = 'Export', className = '' }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onDocClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const handleExport = async (format) => {
    setOpen(false)
    setBusy(true)
    try {
      const url = getExportUrl(format)
      if (!url) {
        throw new Error('Export URL is not available')
      }
      await downloadExport(url, format)
    } catch (err) {
      alert(err.message || 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`export-menu ${className}`.trim()} ref={rootRef}>
      <button
        type="button"
        className="btn btn-ghost btn-sm export-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {busy ? 'Exporting…' : label}
        <span className="export-menu-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div className="export-menu-dropdown" role="menu">
          {FORMATS.map((fmt) => (
            <button
              key={fmt.id}
              type="button"
              role="menuitem"
              className="export-menu-item"
              onClick={() => handleExport(fmt.id)}
            >
              {fmt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
