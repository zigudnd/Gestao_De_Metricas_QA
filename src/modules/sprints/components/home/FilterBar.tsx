export interface Filters {
  squad: string
  status: 'all' | 'active' | 'completed' | 'favorite'
  year: string
  search: string
  tipo: 'all' | 'squad' | 'regressivo' | 'integrado'
}

export interface FilterBarProps {
  filters: Filters
  setFilters: React.Dispatch<React.SetStateAction<Filters>>
  squads: string[]
  years: string[]
  hasFilters: boolean
  filteredCount: number
  totalCount: number
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
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        padding: '10px 14px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        marginBottom: 18,
      }}
    >
      <div style={{ position: 'relative', minWidth: 200 }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--color-text-3)', pointerEvents: 'none' }}>🔍</span>
        <input
          type="text"
          placeholder="Buscar sprint..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          style={{
            width: '100%',
            padding: '6px 10px 6px 32px',
            fontSize: 13,
            borderRadius: 8,
            border: '1px solid var(--color-border-md)',
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />

      <FilterGroup
        label="Squad"
        value={filters.squad}
        onChange={(v) => setFilters((f) => ({ ...f, squad: v }))}
      >
        <option value="all">Todos</option>
        {squads.map((sq) => (
          <option key={sq} value={sq}>{sq}</option>
        ))}
      </FilterGroup>

      <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />

      <FilterGroup
        label="Status"
        value={filters.status}
        onChange={(v) => setFilters((f) => ({ ...f, status: v as Filters['status'] }))}
      >
        <option value="all">Todos</option>
        <option value="active">Em Andamento</option>
        <option value="completed">Concluída</option>
        <option value="favorite">⭐ Favoritas</option>
      </FilterGroup>

      {years.length > 0 && (
        <>
          <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />
          <FilterGroup
            label="Ano"
            value={filters.year}
            onChange={(v) => setFilters((f) => ({ ...f, year: v }))}
          >
            <option value="all">Todos</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </FilterGroup>
        </>
      )}

      <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />

      <FilterGroup
        label="Tipo"
        value={filters.tipo}
        onChange={(v) => setFilters((f) => ({ ...f, tipo: v as Filters['tipo'] }))}
      >
        <option value="all">Todos</option>
        <option value="squad">🎯 Sprint Squad</option>
        <option value="regressivo">🔄 Regressivo</option>
        <option value="integrado">🔗 Integrado</option>
      </FilterGroup>

      {hasFilters && (
        <button
          onClick={() => setFilters({ squad: 'all', status: 'all', year: 'all', search: '', tipo: 'all' })}
          aria-label="Limpar filtros"
          style={{
            marginLeft: 'auto',
            fontSize: 12,
            fontWeight: 600,
            padding: '4px 10px',
            borderRadius: 20,
            border: '1px solid var(--color-border-md)',
            background: 'transparent',
            color: 'var(--color-text-2)',
            cursor: 'pointer',
          }}
        >
          ✕ Limpar
        </button>
      )}

      <span
        style={{
          marginLeft: hasFilters ? 0 : 'auto',
          fontSize: 12,
          color: 'var(--color-text-3)',
        }}
      >
        {hasFilters
          ? `${filteredCount} de ${totalCount} sprints`
          : `${totalCount} sprint${totalCount !== 1 ? 's' : ''}`}
      </span>
    </div>
  )
}

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: 'var(--color-text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--color-text)',
          background: 'var(--color-bg)',
          border: '1px solid var(--color-border-md)',
          borderRadius: 6,
          padding: '3px 24px 3px 8px',
          cursor: 'pointer',
          fontFamily: 'var(--font-family-sans)',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
        }}
      >
        {children}
      </select>
    </div>
  )
}
