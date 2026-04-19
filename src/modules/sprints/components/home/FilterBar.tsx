import { useEffect, useRef, useState } from 'react'

export interface Filters {
  squad: string
  status: 'all' | 'active' | 'completed' | 'favorite'
  year: string
  search: string
  tipo: 'all' | 'squad' | 'regressivo' | 'integrado'
}

export const DEFAULT_FILTERS: Filters = { squad: 'all', status: 'all', year: 'all', search: '', tipo: 'all' }

export interface FilterBarProps {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  squads: string[]
  years: string[]
  hasFilters: boolean
  filteredCount: number
  totalCount: number
}

const STATUS_LABELS: Record<Filters['status'], string> = {
  all: 'Todos',
  active: 'Em Andamento',
  completed: 'Concluída',
  favorite: 'Favoritas',
}

const TIPO_LABELS: Record<Filters['tipo'], string> = {
  all: 'Todos',
  squad: 'Sprint Squad',
  regressivo: 'Regressivo',
  integrado: 'Integrado',
}

// ─── Icons ───────────────────────────────────────────────────────────────────
function IconSearch() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function IconFunnel() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
}
function IconChevronDown() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.6, marginLeft: 2 }}><polyline points="6 9 12 15 18 9"/></svg>
}
function IconX({ size = 12 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
}

export function FilterBar({
  filters,
  setFilters,
  squads,
  years,
  hasFilters,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)

  // Close popover on outside click / Escape
  useEffect(() => {
    if (!filterOpen) return
    function onClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setFilterOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [filterOpen])

  // Focus search on "/" key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Active filter count (excluding search — that's always visible inline)
  const activeFiltersCount =
    (filters.squad !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.year !== 'all' ? 1 : 0) +
    (filters.tipo !== 'all' ? 1 : 0)

  function clearAll() {
    setFilters({ ...DEFAULT_FILTERS })
  }

  return (
    <div style={{ marginBottom: 18 }}>
      {/* Line 1: search + Filtros + counter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: hasFilters ? 10 : 0 }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-3)', display: 'inline-flex' }}>
            <IconSearch />
          </span>
          <input
            ref={searchRef}
            type="text"
            aria-label="Buscar sprint"
            placeholder="Buscar sprint..."
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            style={{
              width: '100%', height: 38, padding: '0 38px 0 38px',
              fontSize: 13, borderRadius: 8,
              border: '1px solid var(--color-border-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              outline: 'none',
              fontFamily: 'var(--font-family-sans)',
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
              background: 'var(--color-bg)', border: '1px solid var(--color-border)',
              borderBottomWidth: 2, borderRadius: 4, padding: '1px 5px',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            /
          </span>
        </div>

        {/* Filtros dropdown */}
        <div ref={filterRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setFilterOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={filterOpen}
            aria-label="Filtros"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              height: 38, padding: '0 14px',
              background: activeFiltersCount > 0 ? 'var(--color-blue-light)' : 'var(--color-surface)',
              color: activeFiltersCount > 0 ? 'var(--color-blue-text)' : 'var(--color-text)',
              border: `1px solid ${activeFiltersCount > 0 ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
              borderRadius: 8,
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
              transition: 'background 0.12s, border-color 0.12s, color 0.12s',
            }}
          >
            <IconFunnel />
            Filtros
            {activeFiltersCount > 0 && (
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: 18, height: 16, padding: '0 5px',
                  fontSize: 10, fontWeight: 700,
                  background: 'var(--color-blue)', color: '#fff',
                  borderRadius: 8,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {activeFiltersCount}
              </span>
            )}
            <IconChevronDown />
          </button>

          {filterOpen && (
            <div
              role="menu"
              aria-label="Opções de filtro"
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05)',
                minWidth: 260, padding: 14,
                zIndex: 500,
              }}
            >
              <FilterGroup label="Squad" value={filters.squad} onChange={(v) => setFilters((f) => ({ ...f, squad: v }))}>
                <option value="all">Todos</option>
                {squads.map((sq) => (<option key={sq} value={sq}>{sq}</option>))}
              </FilterGroup>
              <FilterGroup label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v as Filters['status'] }))}>
                <option value="all">Todos</option>
                <option value="active">Em Andamento</option>
                <option value="completed">Concluída</option>
                <option value="favorite">Favoritas</option>
              </FilterGroup>
              {years.length > 0 && (
                <FilterGroup label="Ano" value={filters.year} onChange={(v) => setFilters((f) => ({ ...f, year: v }))}>
                  <option value="all">Todos</option>
                  {years.map((y) => (<option key={y} value={y}>{y}</option>))}
                </FilterGroup>
              )}
              <FilterGroup label="Tipo" value={filters.tipo} onChange={(v) => setFilters((f) => ({ ...f, tipo: v as Filters['tipo'] }))}>
                <option value="all">Todos</option>
                <option value="squad">Sprint Squad</option>
                <option value="regressivo">Regressivo</option>
                <option value="integrado">Integrado</option>
              </FilterGroup>
            </div>
          )}
        </div>

        {/* Counter */}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-2)', fontWeight: 500 }}>
          {hasFilters ? (
            <>
              Mostrando{' '}
              <b style={{ color: 'var(--color-text)', fontWeight: 700 }}>{filteredCount}</b>
              {' '}de {totalCount} sprint{totalCount !== 1 ? 's' : ''}
            </>
          ) : (
            <>
              <b style={{ color: 'var(--color-text)', fontWeight: 700 }}>{totalCount}</b>
              {' '}sprint{totalCount !== 1 ? 's' : ''}
            </>
          )}
        </span>
      </div>

      {/* Line 2: active filter chips */}
      {hasFilters && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {filters.search && (
            <FilterChip
              label={`Busca: "${filters.search}"`}
              ariaLabel="Remover filtro de busca"
              onRemove={() => setFilters((f) => ({ ...f, search: '' }))}
            />
          )}
          {filters.squad !== 'all' && (
            <FilterChip
              label={`Squad: ${filters.squad}`}
              ariaLabel="Remover filtro Squad"
              onRemove={() => setFilters((f) => ({ ...f, squad: 'all' }))}
            />
          )}
          {filters.status !== 'all' && (
            <FilterChip
              label={`Status: ${STATUS_LABELS[filters.status]}`}
              ariaLabel="Remover filtro Status"
              onRemove={() => setFilters((f) => ({ ...f, status: 'all' }))}
            />
          )}
          {filters.year !== 'all' && (
            <FilterChip
              label={`Ano: ${filters.year}`}
              ariaLabel="Remover filtro Ano"
              onRemove={() => setFilters((f) => ({ ...f, year: 'all' }))}
            />
          )}
          {filters.tipo !== 'all' && (
            <FilterChip
              label={`Tipo: ${TIPO_LABELS[filters.tipo]}`}
              ariaLabel="Remover filtro Tipo"
              onRemove={() => setFilters((f) => ({ ...f, tipo: 'all' }))}
            />
          )}
          <button
            onClick={clearAll}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              height: 26, padding: '0 10px',
              background: 'transparent',
              color: 'var(--color-text-2)',
              border: 'none', borderRadius: 6,
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
              transition: 'background 0.12s',
            }}
            className="hp-clear-all-btn"
          >
            Limpar tudo
          </button>
          <style>{`.hp-clear-all-btn:hover { background: var(--color-bg); color: var(--color-text); }`}</style>
        </div>
      )}
    </div>
  )
}

// ─── Subcomponents ───────────────────────────────────────────────────────────

function FilterGroup({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label
        style={{
          display: 'block',
          fontSize: 10, fontWeight: 700,
          color: 'var(--color-text-3)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginBottom: 4,
          fontFamily: 'var(--font-family-sans)',
        }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', height: 32, padding: '0 28px 0 10px',
          border: '1px solid var(--color-border-md)',
          borderRadius: 6,
          background: 'var(--color-surface)',
          color: 'var(--color-text)',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'var(--font-family-sans)',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
        }}
      >
        {children}
      </select>
    </div>
  )
}

function FilterChip({ label, ariaLabel, onRemove }: { label: string; ariaLabel: string; onRemove: () => void }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '4px 6px 4px 10px',
        border: '1px solid var(--color-blue)',
        background: 'var(--color-blue-light)',
        color: 'var(--color-blue-text)',
        fontSize: 12, fontWeight: 600,
        borderRadius: 999,
        fontFamily: 'var(--font-family-sans)',
      }}
    >
      {label}
      <button
        onClick={onRemove}
        aria-label={ariaLabel}
        style={{
          background: 'transparent', border: 'none',
          color: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          padding: 2, borderRadius: 999,
          transition: 'background 0.12s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(37,99,235,.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <IconX />
      </button>
    </span>
  )
}
