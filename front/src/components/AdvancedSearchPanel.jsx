import React, { useCallback, useEffect, useRef, useState } from 'react'

import '../../css/components/advanced-search.css'

const SQUAD_FIELDS = ['q', 'sort', 'order']
const MATCH_FIELDS = ['q', 'date_from', 'date_to', 'date_on', 'time_hour', 'sort', 'order']

const squadDefaults = {
  q: '',
  sort: 'name',
  order: 'asc'
}

const matchDefaults = {
  q: '',
  date_from: '',
  date_to: '',
  date_on: '',
  time_hour: '',
  sort: 'datetime',
  order: 'desc'
}

function buildQueryParams(values, fields) {
  const params = new URLSearchParams()
  fields.forEach((key) => {
    const v = values[key]
    if (v === undefined || v === null || v === '') return
    params.set(key, String(v))
  })
  return params
}

export default function AdvancedSearchPanel({
  variant = 'squads',
  onSearch,
  debounceMs = 400,
  className = ''
}) {
  const isSquads = variant === 'squads'
  const isMatches = variant === 'matches'

  const [expanded, setExpanded] = useState(false)
  const [values, setValues] = useState(() => (isSquads ? { ...squadDefaults } : { ...matchDefaults }))

  const fields = isSquads ? SQUAD_FIELDS : MATCH_FIELDS
  const onSearchRef = useRef(onSearch)
  const lastQueryRef = useRef(null)

  useEffect(() => {
    onSearchRef.current = onSearch
  }, [onSearch])

  const emitSearch = useCallback(
    (nextValues) => {
      const params = buildQueryParams(nextValues, fields)
      const qs = params.toString()
      if (qs === lastQueryRef.current) {
        return
      }
      lastQueryRef.current = qs
      onSearchRef.current?.(params, nextValues)
    },
    [fields]
  )

  useEffect(() => {
    const timer = setTimeout(() => emitSearch(values), debounceMs)
    return () => clearTimeout(timer)
  }, [values, debounceMs, emitSearch])

  const update = (key, value) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value }
      if (isMatches) {
        if (key === 'date_on' && value) {
          next.date_from = ''
          next.date_to = ''
        }
        if ((key === 'date_from' || key === 'date_to') && value) {
          next.date_on = ''
        }
      }
      return next
    })
  }

  const handleReset = () => {
    setValues(isSquads ? { ...squadDefaults } : { ...matchDefaults })
  }

  const hasActiveSearch = Boolean(values.q)
  const hasAdvancedFilters = Boolean(
    values.date_from || values.date_to || values.date_on || values.time_hour !== ''
  )
  const hasActiveFilters = isSquads ? hasActiveSearch : hasActiveSearch || hasAdvancedFilters

  const rootClass = `advanced-search ${isSquads ? 'advanced-search--squads' : 'advanced-search--matches'} ${className}`.trim()

  if (isSquads) {
    return (
      <div className={rootClass}>
        <div className="advanced-search-bar advanced-search-bar--inline">
          <span className="advanced-search-icon" aria-hidden="true">
            🔍
          </span>
          <input
            type="search"
            className="advanced-search-input"
            placeholder="Search by squad name or player name…"
            value={values.q}
            onChange={(e) => update('q', e.target.value)}
            aria-label="Search squads"
          />
          <div className="advanced-search-inline-field">
            <label htmlFor="as-sort-squads">Sort by</label>
            <select
              id="as-sort-squads"
              value={values.sort}
              onChange={(e) => update('sort', e.target.value)}
            >
              <option value="name">Squad name</option>
              <option value="created_at">Created date</option>
            </select>
          </div>
          <div className="advanced-search-inline-field">
            <label htmlFor="as-order-squads">Order</label>
            <select
              id="as-order-squads"
              value={values.order}
              onChange={(e) => update('order', e.target.value)}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
          {hasActiveFilters ? (
            <button type="button" className="advanced-search-clear" onClick={handleReset}>
              Clear
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <div className="advanced-search-bar advanced-search-bar--matches">
        <span className="advanced-search-icon" aria-hidden="true">
          🔍
        </span>
        <input
          type="search"
          className="advanced-search-input"
          placeholder="Search by player name or location…"
          value={values.q}
          onChange={(e) => update('q', e.target.value)}
          aria-label="Search matches"
        />
        <button
          type="button"
          className={`advanced-search-toggle ${expanded ? 'active' : ''}`}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls="advanced-filters-matches"
        >
          Advanced filters
          {hasAdvancedFilters ? <span className="advanced-search-badge" /> : null}
        </button>
        {hasActiveFilters ? (
          <button type="button" className="advanced-search-clear" onClick={handleReset}>
            Clear all
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div id="advanced-filters-matches" className="advanced-search-filters advanced-search-filters--matches">
          <p className="advanced-search-filters-title">Date, hour &amp; sort</p>
          <div className="advanced-search-field advanced-search-field-wide">
            <label htmlFor="as-date-from">From date</label>
            <input
              id="as-date-from"
              type="date"
              value={values.date_from}
              onChange={(e) => update('date_from', e.target.value)}
            />
          </div>
          <div className="advanced-search-field advanced-search-field-wide">
            <label htmlFor="as-date-to">To date</label>
            <input
              id="as-date-to"
              type="date"
              value={values.date_to}
              onChange={(e) => update('date_to', e.target.value)}
            />
          </div>
          <div className="advanced-search-field advanced-search-field-wide">
            <label htmlFor="as-date-on">Specific date</label>
            <input
              id="as-date-on"
              type="date"
              value={values.date_on}
              onChange={(e) => update('date_on', e.target.value)}
            />
          </div>
          <div className="advanced-search-field">
            <label htmlFor="as-time-hour">Specific hour</label>
            <input
              id="as-time-hour"
              type="time"
              value={values.time_hour}
              onChange={(e) => update('time_hour', e.target.value)}
              title="Filter matches at this hour (use with a specific date for one day)"
            />
          </div>
          <div className="advanced-search-field">
            <label htmlFor="as-order-matches">Sort by datetime</label>
            <select
              id="as-order-matches"
              value={values.order}
              onChange={(e) => update('order', e.target.value)}
            >
              <option value="asc">Ascending (earliest first)</option>
              <option value="desc">Descending (latest first)</option>
            </select>
          </div>
          <p className="advanced-search-hint">
            Use a date range, or one specific date. Set an hour to filter matches at that time (best with a
            specific date).
          </p>
        </div>
      ) : null}
    </div>
  )
}
