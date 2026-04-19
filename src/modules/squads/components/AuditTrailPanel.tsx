import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { AuditEntry } from '@/lib/auditService'

// ─── Icons (SVG inline, Lucide paths) ────────────────────────────────────────

function Svg({ size = 14, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >{children}</svg>
  )
}
function IconTarget({ size = 14 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>
}
function IconFileText({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Svg>
}
function IconRocket({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /></Svg>
}
function IconUsers({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
}
function IconPackage({ size = 14 }: { size?: number }) {
  return <Svg size={size}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21" /><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Svg>
}
function IconClipboardList({ size = 26 }: { size?: number }) {
  return <Svg size={size}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></Svg>
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PAGE_SIZE = 30

const RESOURCE_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'sprint', label: 'Sprint' },
  { value: 'status_report', label: 'Status Report' },
  { value: 'release', label: 'Release' },
  { value: 'squad', label: 'Squad' },
] as const

const ACTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'create', label: 'Criar' },
  { value: 'update', label: 'Atualizar' },
  { value: 'delete', label: 'Excluir' },
] as const

type ResourceFilter = typeof RESOURCE_TYPES[number]['value']
type ActionFilter = typeof ACTIONS[number]['value']

interface Filters {
  resourceType: ResourceFilter
  action: ActionFilter
  from: string
  to: string
  search: string
}

const ACTION_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  create: { bg: 'var(--color-green-light)', color: 'var(--color-green-text)', label: 'Criar' },
  update: { bg: 'var(--color-blue-light)', color: 'var(--color-blue-text)', label: 'Atualizar' },
  delete: { bg: 'var(--color-red-light)', color: 'var(--color-red)', label: 'Excluir' },
}

const RESOURCE_ICON_COMP: Record<string, React.ComponentType<{ size?: number }>> = {
  sprint: IconTarget,
  status_report: IconFileText,
  release: IconRocket,
  squad: IconUsers,
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `há ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `há ${days}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function getInitial(email: string | null): string {
  if (!email) return '?'
  return email.charAt(0).toUpperCase()
}

function truncateId(id: string): string {
  if (id.length <= 12) return id
  return id.slice(0, 8) + '...'
}

// ─── Fetch ──────────────────────────────────────────────────────────────────

async function fetchLogs(filters: Filters, page: number) {
  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

  if (filters.resourceType !== 'all') query = query.eq('resource_type', filters.resourceType)
  if (filters.action !== 'all') query = query.eq('action', filters.action)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', filters.to + 'T23:59:59')
  if (filters.search) query = query.ilike('user_email', `%${filters.search}%`)

  return query
}

// ─── DiffViewer ─────────────────────────────────────────────────────────────

function DiffViewer({ changes }: { changes: Record<string, { old: unknown; new: unknown }> }) {
  const entries = Object.entries(changes)
  if (entries.length === 0) return null

  return (
    <div
      className="mt-2 rounded-lg p-3 text-[12px]"
      style={{ background: 'var(--color-surface-2)', border: '0.5px solid var(--color-border)' }}
      role="region"
      aria-label="Detalhes das alterações"
    >
      {entries.map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="flex items-baseline gap-2 mb-1 last:mb-0 flex-wrap">
          <span className="font-medium" style={{ color: 'var(--color-text-2)' }}>{field}:</span>
          <span className="line-through" style={{ color: 'var(--color-red)' }}>
            {formatValue(oldVal)}
          </span>
          <span style={{ color: 'var(--color-text-3)' }}>→</span>
          <span style={{ color: 'var(--color-green-text)' }}>
            {formatValue(newVal)}
          </span>
        </div>
      ))}
    </div>
  )
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(vazio)'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditTrailPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({
    resourceType: 'all',
    action: 'all',
    from: '',
    to: '',
    search: '',
  })

  const loadLogs = useCallback(async (currentFilters: Filters, currentPage: number, append: boolean) => {
    try {
      if (!append) setLoading(true)
      const { data, count, error } = await fetchLogs(currentFilters, currentPage)
      if (error) throw error
      const rows = (data ?? []) as AuditEntry[]
      setEntries((prev) => append ? [...prev, ...rows] : rows)
      setTotalCount(count ?? 0)
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[AuditTrail] Erro ao carregar logs:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load + reload on filter change
  useEffect(() => {
    setPage(1)
    loadLogs(filters, 1, false)
  }, [filters, loadLogs])

  async function handleLoadMore() {
    const nextPage = page + 1
    setPage(nextPage)
    setLoadingMore(true)
    try {
      await loadLogs(filters, nextPage, true)
    } finally {
      setLoadingMore(false)
    }
  }

  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const hasMore = entries.length < totalCount

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div>

      {/* ── Filter bar ───────────────────────────────────────────────────────── */}
      <div
        className="rounded-xl mb-5 flex flex-col"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '16px 20px', gap: 14 }}
        role="search"
        aria-label="Filtros de auditoria"
      >
        {/* Row 1: Resource type + Action pills */}
        <div className="flex flex-wrap items-center" style={{ gap: 16 }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>Recurso</span>
            <div className="flex flex-wrap" style={{ gap: 6 }} role="group" aria-label="Filtrar por tipo de recurso">
              {RESOURCE_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateFilter('resourceType', value)}
                  aria-pressed={filters.resourceType === value}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    background: filters.resourceType === value ? 'var(--color-blue)' : 'var(--color-surface-2)',
                    color: filters.resourceType === value ? '#fff' : 'var(--color-text-2)',
                    border: '1px solid ' + (filters.resourceType === value ? 'var(--color-blue)' : 'var(--color-border-md)'),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />

          <div className="flex items-center" style={{ gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>Ação</span>
            <div className="flex flex-wrap" style={{ gap: 6 }} role="group" aria-label="Filtrar por ação">
              {ACTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => updateFilter('action', value)}
                  aria-pressed={filters.action === value}
                  style={{
                    fontSize: 12, fontWeight: 600, padding: '6px 14px', borderRadius: 20,
                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                    background: filters.action === value ? 'var(--color-blue)' : 'var(--color-surface-2)',
                    color: filters.action === value ? '#fff' : 'var(--color-text-2)',
                    border: '1px solid ' + (filters.action === value ? 'var(--color-blue)' : 'var(--color-border-md)'),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Date range + Search */}
        <div className="flex flex-wrap items-center" style={{ gap: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-3)' }}>De</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => updateFilter('from', e.target.value)}
              style={{ ...inputStyle, width: 140, padding: '7px 10px', fontSize: 13 }}
              aria-label="Data inicial"
            />
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--color-text-3)' }}>Até</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => updateFilter('to', e.target.value)}
              style={{ ...inputStyle, width: 140, padding: '7px 10px', fontSize: 13 }}
              aria-label="Data final"
            />
          </div>
          <div className="relative flex-1" style={{ minWidth: 180 }}>
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--color-text-3)' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>
            </span>
            <input
              type="text"
              placeholder="Buscar por email..."
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              style={{ ...inputStyle, width: '100%', paddingLeft: 32, padding: '7px 10px 7px 32px', fontSize: 13 }}
              aria-label="Buscar por email do usuário"
            />
          </div>
        </div>
      </div>

      {/* ── Loading state ────────────────────────────────────────────────────── */}
      {loading && (
        <p className="text-[13px] py-8 text-center" style={{ color: 'var(--color-text-3)' }}>
          Carregando...
        </p>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!loading && entries.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '44px 20px',
            background: 'var(--color-surface)',
            border: '1px dashed var(--color-border-md)',
            borderRadius: 14,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: 56, height: 56, margin: '0 auto 14px',
              borderRadius: 14,
              background: 'var(--color-blue-light)',
              color: 'var(--color-blue)',
              display: 'grid', placeItems: 'center',
            }}
          >
            <IconClipboardList size={26} />
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
            Nenhum log de auditoria
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            Ações realizadas na plataforma aparecerão aqui.
          </p>
        </div>
      )}

      {/* ── Timeline ─────────────────────────────────────────────────────────── */}
      {!loading && entries.length > 0 && (
        <div className="relative" role="log" aria-label="Timeline de auditoria">
          {/* Vertical timeline line */}
          <div
            className="absolute top-0 bottom-0 w-px"
            style={{ left: 16, background: 'var(--color-border)' }}
            aria-hidden="true"
          />

          {entries.map((entry) => {
            const badge = ACTION_BADGE[entry.action] ?? ACTION_BADGE.update
            const RIcon = RESOURCE_ICON_COMP[entry.resource_type] ?? IconPackage
            const hasChanges = entry.changes && Object.keys(entry.changes).length > 0
            const isExpanded = expandedIds.has(entry.id)

            return (
              <div key={entry.id} className="relative flex gap-3 pb-4" role="article" aria-label={`Ação de ${entry.user_email ?? 'usuário desconhecido'}`}>
                {/* Avatar */}
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold z-10"
                  style={{
                    background: badge.bg,
                    color: badge.color,
                    border: '2px solid var(--color-bg)',
                  }}
                  aria-hidden="true"
                >
                  {getInitial(entry.user_email)}
                </div>

                {/* Content — compact card */}
                <div className="flex-1 min-w-0">
                  <div
                    className="rounded-lg"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: '12px 16px' }}
                  >
                    {/* Single line: email + badge + resource + time */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
                      <span className="font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                        {entry.user_email ?? 'Desconhecido'}
                      </span>
                      <span
                        className="text-[9px] font-bold px-1.5 py-px rounded shrink-0 uppercase"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {badge.label}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-3)' }}>
                        <RIcon size={12} /> {entry.resource_type}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--color-text-3)' }}>
                        {truncateId(entry.resource_id)}
                      </span>
                      <span className="ml-auto text-[10px] shrink-0" style={{ color: 'var(--color-text-3)' }}>
                        {timeAgo(entry.created_at)}
                      </span>
                    </div>

                    {/* Expandable diff — only if changes exist */}
                    {hasChanges && (
                      <div className="mt-1">
                        <button
                          onClick={() => toggleExpanded(entry.id)}
                          className="text-[10px] font-semibold cursor-pointer rounded px-1.5 py-0.5 transition-all duration-150"
                          style={{
                            background: isExpanded ? 'var(--color-blue-light)' : 'transparent',
                            color: 'var(--color-blue)',
                            border: 'none',
                          }}
                          aria-expanded={isExpanded}
                          aria-controls={`diff-${entry.id}`}
                          aria-label={isExpanded ? 'Ocultar alterações' : 'Ver alterações'}
                        >
                          {isExpanded ? '▾ Ocultar' : '▸ Ver alterações'}
                        </button>
                        {isExpanded && (
                          <div id={`diff-${entry.id}`} className="mt-1">
                            <DiffViewer changes={entry.changes} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Load more ────────────────────────────────────────────────────────── */}
      {!loading && hasMore && (
        <div className="flex justify-center pt-2 pb-4">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-[13px] font-medium px-5 py-2 rounded-lg cursor-pointer border-none"
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-blue)',
              border: '0.5px solid var(--color-border)',
              opacity: loadingMore ? 0.6 : 1,
              cursor: loadingMore ? 'not-allowed' : 'pointer',
            }}
            aria-label="Carregar mais logs de auditoria"
          >
            {loadingMore ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Styles (matching SquadsPage / ApiKeysPanel pattern) ────────────────────

const inputStyle: React.CSSProperties = {
  boxSizing: 'border-box', padding: '8px 12px',
  background: 'var(--color-bg)', border: '0.5px solid var(--color-border)',
  borderRadius: 8, fontSize: 13, color: 'var(--color-text)', outline: 'none',
}
