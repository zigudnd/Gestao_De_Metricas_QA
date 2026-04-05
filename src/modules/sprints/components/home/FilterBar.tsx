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
    <div className="card-sm flex items-center gap-4 flex-wrap mb-6">
      <div className="relative min-w-[200px]">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[var(--color-text-3)] pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Buscar sprint..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="input-field !pl-8 !py-1.5"
        />
      </div>

      <div className="w-px h-6 bg-[var(--color-border-md)]" />

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

      <div className="w-px h-6 bg-[var(--color-border-md)]" />

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
          <div className="w-px h-6 bg-[var(--color-border-md)]" />
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

      <div className="w-px h-6 bg-[var(--color-border-md)]" />

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
          className="btn btn-outline btn-sm ml-auto !rounded-full"
        >
          ✕ Limpar
        </button>
      )}

      <span className={`text-small text-muted ${hasFilters ? '' : 'ml-auto'}`}>
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
    <div className="flex items-center gap-1.5">
      <span className="section-label !mb-0 whitespace-nowrap">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="select-field !w-auto !py-0.5 !pl-2 !pr-6 text-xs font-medium !rounded-[6px]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          appearance: 'none',
        }}
      >
        {children}
      </select>
    </div>
  )
}
