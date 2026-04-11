import { useState, useMemo, memo } from 'react'
import { REVIEW_STATUS_CONFIG, CHANGE_TYPE_CONFIG, BADGE_RADIUS } from '../../constants/pr-constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PR {
  id: string
  pr_link: string
  repository: string
  description: string
  change_type: string
  review_status: string
  user_email?: string
  squad_name?: string
  created_at: string
  review_observation?: string | null
}

interface Squad {
  id: string
  name: string
}

interface PRListTableProps {
  prs: PR[]
  squads: Squad[]
  onFilterChange: (filters: { squad_id?: string; review_status?: string; change_type?: string }) => void
  onPRClick: (prId: string) => void
  onExportCSV: () => void
  isFoundation?: boolean
  onReview?: (prId: string, status: 'approved' | 'rejected', observation?: string) => void
}

type StatusFilter = 'todos' | 'pending' | 'approved' | 'rejected'
type ChangeTypeFilter = 'todos' | 'feature' | 'fix' | 'refactor' | 'hotfix'

// ─── Constants (derived from shared pr-constants) ───────────────────────────

const STATUS_LABELS = Object.fromEntries(
  Object.entries(REVIEW_STATUS_CONFIG).map(([k, v]) => [k, v.label]),
) as Record<string, string>

const STATUS_COLORS = Object.fromEntries(
  Object.entries(REVIEW_STATUS_CONFIG).map(([k, v]) => [k, { bg: v.bg, text: v.color }]),
) as Record<string, { bg: string; text: string }>

const CHANGE_TYPE_LABELS = Object.fromEntries(
  Object.entries(CHANGE_TYPE_CONFIG).map(([k, v]) => [k, v.label]),
) as Record<string, string>

const CHANGE_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  feature: { bg: 'var(--color-blue-light)', text: CHANGE_TYPE_CONFIG.feature.color },
  fix: { bg: 'var(--color-red-light)', text: CHANGE_TYPE_CONFIG.fix.color },
  refactor: { bg: '#8b5cf618', text: CHANGE_TYPE_CONFIG.refactor.color },
  hotfix: { bg: 'var(--color-amber-light)', text: CHANGE_TYPE_CONFIG.hotfix.color },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  if (!iso) return '--'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '--'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

// ─── Sub-components ─────────────────────────────────────────────────────────

const FilterPill = memo(function FilterPill({ label, active, onClick }: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: '4px 12px',
        borderRadius: 16,
        border: active ? '1.5px solid var(--color-blue)' : '1px solid var(--color-border-md)',
        background: active ? 'var(--color-blue-light)' : 'var(--color-surface)',
        color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        cursor: 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-family-sans)',
      }}
    >
      {label}
    </button>
  )
})

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] ?? { bg: 'var(--color-surface-2)', text: 'var(--color-text-2)' }
  const label = STATUS_LABELS[status] ?? status
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: BADGE_RADIUS,
      fontSize: 11,
      fontWeight: 600,
      background: colors.bg,
      color: colors.text,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
})

const ChangeTypeBadge = memo(function ChangeTypeBadge({ type }: { type: string }) {
  const normalized = type.toLowerCase()
  const colors = CHANGE_TYPE_COLORS[normalized] ?? { bg: 'var(--color-surface-2)', text: 'var(--color-text-2)' }
  const label = CHANGE_TYPE_LABELS[normalized] ?? type
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: BADGE_RADIUS,
      fontSize: 11,
      fontWeight: 600,
      background: colors.bg,
      color: colors.text,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
})

// ─── Main Component ─────────────────────────────────────────────────────────

export function PRListTable({
  prs,
  squads,
  onFilterChange,
  onPRClick,
  onExportCSV,
  isFoundation = false,
  onReview,
}: PRListTableProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [changeTypeFilter, setChangeTypeFilter] = useState<ChangeTypeFilter>('todos')
  const [squadFilter, setSquadFilter] = useState<string>('')
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected'>('approved')
  const [observation, setObservation] = useState('')

  // Notify parent of filter changes
  function applyFilters(
    newStatus?: StatusFilter,
    newType?: ChangeTypeFilter,
    newSquad?: string,
  ) {
    const status = newStatus ?? statusFilter
    const type = newType ?? changeTypeFilter
    const squad = newSquad ?? squadFilter

    onFilterChange({
      squad_id: squad || undefined,
      review_status: status === 'todos' ? undefined : status,
      change_type: type === 'todos' ? undefined : type,
    })
  }

  // Local filtering for display
  const filtered = useMemo(() => {
    let list = prs
    if (statusFilter !== 'todos') {
      list = list.filter((pr) => pr.review_status === statusFilter)
    }
    if (changeTypeFilter !== 'todos') {
      list = list.filter((pr) => pr.change_type.toLowerCase() === changeTypeFilter)
    }
    if (squadFilter) {
      list = list.filter((pr) => pr.squad_name === squads.find((s) => s.id === squadFilter)?.name)
    }
    return list
  }, [prs, statusFilter, changeTypeFilter, squadFilter, squads])

  function handleStatusFilter(f: StatusFilter) {
    setStatusFilter(f)
    applyFilters(f, undefined, undefined)
  }

  function handleTypeFilter(f: ChangeTypeFilter) {
    setChangeTypeFilter(f)
    applyFilters(undefined, f, undefined)
  }

  function handleSquadFilter(squadId: string) {
    setSquadFilter(squadId)
    applyFilters(undefined, undefined, squadId)
  }

  function handleReview(prId: string, status: 'approved' | 'rejected') {
    if (!onReview) return
    if (reviewingId === prId && reviewAction === status) {
      onReview(prId, status, observation || undefined)
      setReviewingId(null)
      setReviewAction('approved')
      setObservation('')
    } else {
      setReviewingId(prId)
      setReviewAction(status)
      setObservation('')
    }
  }

  function cancelReview() {
    setReviewingId(null)
    setReviewAction('approved')
    setObservation('')
  }

  return (
    <div style={{ maxWidth: 1200 }}>
      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap',
      }}>
        {/* Squad select */}
        <select
          value={squadFilter}
          onChange={(e) => handleSquadFilter(e.target.value)}
          style={{
            padding: '5px 10px',
            borderRadius: 8,
            border: '1px solid var(--color-border-md)',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            fontSize: 12,
            fontFamily: 'var(--font-family-sans)',
            cursor: 'pointer',
            minWidth: 140,
          }}
        >
          <option value="">Todas as Squads</option>
          {squads.map((sq) => (
            <option key={sq.id} value={sq.id}>{sq.name}</option>
          ))}
        </select>

        {/* Status pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 4,
          }}>
            Status:
          </span>
          {(['todos', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((f) => (
            <FilterPill
              key={f}
              label={f === 'todos' ? 'Todos' : STATUS_LABELS[f]}
              active={statusFilter === f}
              onClick={() => handleStatusFilter(f)}
            />
          ))}
        </div>

        {/* Change type pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
            textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: 4,
          }}>
            Tipo:
          </span>
          {(['todos', 'feature', 'fix', 'refactor', 'hotfix'] as ChangeTypeFilter[]).map((f) => (
            <FilterPill
              key={f}
              label={f === 'todos' ? 'Todos' : CHANGE_TYPE_LABELS[f]}
              active={changeTypeFilter === f}
              onClick={() => handleTypeFilter(f)}
            />
          ))}
        </div>

        {/* Export CSV */}
        <button
          onClick={onExportCSV}
          style={{
            marginLeft: 'auto',
            padding: '5px 14px',
            borderRadius: 8,
            border: '1px solid var(--color-border-md)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-2)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
            transition: 'all 0.15s',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          Exportar CSV
        </button>
      </div>

      {/* ── Empty State ───────────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-3)',
          background: 'var(--color-surface)', border: '1px solid var(--color-border)',
          borderRadius: 10,
        }}>
          <p style={{
            fontSize: 14, fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 4px',
          }}>
            Nenhum PR cadastrado nesta release.
          </p>
          <p style={{ fontSize: 13, margin: 0 }}>
            {prs.length > 0
              ? 'Nenhum resultado para os filtros aplicados.'
              : 'Cadastre PRs para acompanhar as entregas da release.'}
          </p>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 10,
          overflowX: 'auto',
        }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isFoundation
              ? '100px 120px 1fr 130px 80px 80px 70px 130px'
              : '100px 120px 1fr 130px 80px 80px 70px',
            padding: '10px 14px',
            background: 'var(--color-surface-2)',
            minWidth: isFoundation ? 900 : 780,
            borderBottom: '1px solid var(--color-border)',
            fontSize: 11,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.35px',
            color: 'var(--color-text-2)',
          }}>
            <span>Squad</span>
            <span>Dev</span>
            <span>Link do PR</span>
            <span>Repositorio</span>
            <span>Tipo</span>
            <span>Status</span>
            <span>Data</span>
            {isFoundation && <span>Acoes</span>}
          </div>

          {/* Rows */}
          {filtered.map((pr) => (
            <div key={pr.id}>
              <div
                onClick={() => onPRClick(pr.id)}
                className="pr-list-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: isFoundation
                    ? '100px 120px 1fr 130px 80px 80px 70px 130px'
                    : '100px 120px 1fr 130px 80px 80px 70px',
                  padding: '11px 14px',
                  borderBottom: '1px solid var(--color-border)',
                  minWidth: isFoundation ? 900 : 780,
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  alignItems: 'center',
                  background: 'var(--color-surface)',
                  fontSize: 13,
                }}
              >
                {/* Squad */}
                <span style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pr.squad_name || '--'}
                </span>

                {/* Dev */}
                <span style={{
                  fontSize: 12, color: 'var(--color-text-2)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pr.user_email?.split('@')[0] || '--'}
                </span>

                {/* Link do PR */}
                <a
                  href={pr.pr_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    fontSize: 12, color: 'var(--color-blue-text)',
                    textDecoration: 'none', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    paddingRight: 8,
                  }}
                  title={pr.description || pr.pr_link}
                >
                  {pr.description || pr.pr_link}
                </a>

                {/* Repositorio */}
                <span style={{
                  fontSize: 11, color: 'var(--color-text-3)', fontFamily: 'var(--font-family-mono)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pr.repository}
                </span>

                {/* Tipo */}
                <ChangeTypeBadge type={pr.change_type} />

                {/* Status */}
                <StatusBadge status={pr.review_status} />

                {/* Data */}
                <span style={{
                  fontSize: 12, color: 'var(--color-text-2)',
                }}>
                  {fmtDate(pr.created_at)}
                </span>

                {/* Actions (Foundation only) */}
                {isFoundation && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: 'flex', gap: 4 }}
                  >
                    {pr.review_status === 'pending' ? (
                      <>
                        <button
                          onClick={() => handleReview(pr.id, 'approved')}
                          style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: '1px solid var(--color-green)', background: 'var(--color-green-light)',
                            color: 'var(--color-green)', cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                            transition: 'all 0.15s',
                          }}
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleReview(pr.id, 'rejected')}
                          style={{
                            padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            border: '1px solid var(--color-red)', background: 'var(--color-red-light)',
                            color: 'var(--color-red)', cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                            transition: 'all 0.15s',
                          }}
                        >
                          Rejeitar
                        </button>
                      </>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontStyle: 'italic' }}>
                        {STATUS_LABELS[pr.review_status] ?? pr.review_status}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Observation input row (when reviewing) */}
              {reviewingId === pr.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    padding: '10px 14px',
                    background: 'var(--color-surface-2)',
                    borderBottom: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    animation: 'fadeUp 0.2s ease both',
                  }}
                >
                  <input
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Observacao (opcional)..."
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 6,
                      border: '1px solid var(--color-border-md)',
                      background: 'var(--color-surface)', color: 'var(--color-text)',
                      fontSize: 12, fontFamily: 'var(--font-family-sans)',
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onReview?.(pr.id, reviewAction, observation || undefined)
                        setReviewingId(null)
                        setReviewAction('approved')
                        setObservation('')
                      }
                      if (e.key === 'Escape') cancelReview()
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      onReview?.(pr.id, reviewAction, observation || undefined)
                      setReviewingId(null)
                      setReviewAction('approved')
                      setObservation('')
                    }}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                      border: `1px solid ${reviewAction === 'rejected' ? 'var(--color-red)' : 'var(--color-green)'}`,
                      background: reviewAction === 'rejected' ? 'var(--color-red-light)' : 'var(--color-green-light)',
                      color: reviewAction === 'rejected' ? 'var(--color-red)' : 'var(--color-green)',
                      cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                    }}
                  >
                    {reviewAction === 'rejected' ? 'Confirmar Rejeicao' : 'Confirmar Aprovacao'}
                  </button>
                  <button
                    onClick={cancelReview}
                    style={{
                      padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      border: '1px solid var(--color-border-md)', background: 'var(--color-surface)',
                      color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
