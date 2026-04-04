import { useState, useMemo } from 'react'
import { showToast } from '@/app/components/Toast'
import type { Release, ReleaseStatus } from '../../types/release.types'

// ─── Props ──────────────────────────────────────────────────────────────────

interface CheckpointTabProps {
  releases: Release[]
  onReleaseClick: (id: string) => void
  onDeleteRelease: (id: string) => void
  onConcludeRelease: (id: string) => void
}

// ─── Constants ──────────────────────────────────────────────────────────────

type FilterValue = 'todos' | 'Publicado' | 'Em Regressivo' | 'Previsto' | Platform

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'Publicado', label: '✔ Publicado' },
  { value: 'Em Regressivo', label: '◉ Em Regressivo' },
  { value: 'Previsto', label: '○ Previsto' },
  { value: 'iOS', label: '🍎 iOS' },
  { value: 'Android', label: '🤖 Android' },
  { value: 'Front', label: '🌐 Front' },
  { value: 'BFF', label: '🔗 BFF' },
  { value: 'Back', label: '🖥 Back' },
  { value: 'Infra', label: '☁️ Infra' },
]

const PHASE_LABELS = ['CORTE', 'GERACAO', 'HOMOLOG.', 'BETA', 'PRODUCAO'] as const

const DOT_COLORS = {
  done: 'var(--color-green-mid)',
  active: 'var(--color-amber-mid)',
  pending: 'var(--color-border-md)',
} as const

const STATUS_FILTER_MAP: Record<string, ReleaseStatus[]> = {
  Publicado: ['concluida'],
  'Em Regressivo': ['em_regressivo', 'em_homologacao'],
  Previsto: ['planejada', 'em_desenvolvimento'],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractReleaseNumber(version: string): string {
  const match = version.replace(/^v/i, '').match(/^(\d+\.\d+)/)
  return match ? match[1] : version
}

function statusLabel(status: ReleaseStatus): string {
  const map: Record<ReleaseStatus, string> = {
    planejada: 'Previsto',
    em_desenvolvimento: 'Previsto',
    corte: 'Em Regressivo',
    em_homologacao: 'Em Regressivo',
    em_regressivo: 'Em Regressivo',
    aprovada: 'Publicado',
    em_producao: 'Publicado',
    concluida: 'Publicado',
    uniu_escopo: 'Uniu Escopo',
  }
  return map[status]
}

function statusBadgeStyle(status: ReleaseStatus): React.CSSProperties {
  const label = statusLabel(status)
  const base: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: 20,
    whiteSpace: 'nowrap',
    letterSpacing: 0.3,
  }
  switch (label) {
    case 'Publicado':
      return { ...base, background: 'var(--color-green-light)', color: 'var(--color-green)', border: '1px solid var(--color-green-mid)' }
    case 'Em Regressivo':
      return { ...base, background: 'var(--color-amber-light)', color: 'var(--color-amber)', border: '1px solid var(--color-amber-mid)' }
    case 'Previsto':
      return { ...base, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border-md)' }
    case 'Uniu Escopo':
      return { ...base, background: '#8b5cf618', color: '#8b5cf6', border: '1px solid #8b5cf640' }
    default:
      return { ...base, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', border: '1px solid var(--color-border-md)' }
  }
}

function overallStatus(statuses: ReleaseStatus[]): ReleaseStatus {
  if (statuses.some((s) => s === 'em_regressivo' || s === 'em_homologacao')) return 'em_regressivo'
  if (statuses.some((s) => s === 'uniu_escopo')) return 'uniu_escopo'
  if (statuses.some((s) => s === 'planejada' || s === 'em_desenvolvimento')) return 'planejada'
  return 'concluida'
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '\u2014'
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

type PhaseState = 'done' | 'active' | 'pending'

function getPhaseStates(status: ReleaseStatus): PhaseState[] {
  // Phases: Corte, Geracao, Homolog, Beta, Producao
  switch (status) {
    case 'concluida':
    case 'em_producao':
    case 'aprovada':
      return ['done', 'done', 'done', 'done', 'done']
    case 'em_regressivo':
    case 'em_homologacao':
      return ['done', 'done', 'active', 'pending', 'pending']
    case 'corte':
      return ['active', 'pending', 'pending', 'pending', 'pending']
    case 'em_desenvolvimento':
      return ['pending', 'pending', 'pending', 'pending', 'pending']
    case 'planejada':
      return ['pending', 'pending', 'pending', 'pending', 'pending']
    case 'uniu_escopo':
      return ['pending', 'pending', 'pending', 'pending', 'pending']
    default:
      return ['pending', 'pending', 'pending', 'pending', 'pending']
  }
}

function getPhaseDates(release: Release): string[] {
  return [
    formatDateShort(release.cutoffDate),
    formatDateShort(release.buildDate),
    release.homologacaoStart
      ? `${formatDateShort(release.homologacaoStart)} a ${formatDateShort(release.homologacaoEnd)}`
      : '\u2014',
    formatDateShort(release.betaDate),
    formatDateShort(release.productionDate),
  ]
}

type Platform = 'iOS' | 'Android' | 'Front' | 'BFF' | 'Back' | 'Infra'

const PLATFORM_ICON: Record<Platform, string> = {
  iOS: '🍎', Android: '🤖', Front: '🌐', BFF: '🔗', Back: '🖥', Infra: '☁️',
}

const PLATFORM_COLOR: Record<Platform, string> = {
  iOS: '#555', Android: '#3dba4e', Front: '#3b82f6', BFF: '#8b5cf6', Back: '#2C2C2A', Infra: '#06b6d4',
}

function detectPlatform(release: Release): Platform | null {
  const platforms = getReleasePlatforms(release)
  return platforms[0] ?? null
}

function getReleasePlatforms(release: Release): Platform[] {
  if (release.platforms && release.platforms.length > 0) {
    return release.platforms.map((p) => {
      if (/ios/i.test(p)) return 'iOS'
      if (/android/i.test(p)) return 'Android'
      if (/front/i.test(p)) return 'Front'
      if (/bff/i.test(p)) return 'BFF'
      if (/back/i.test(p)) return 'Back'
      if (/infra/i.test(p)) return 'Infra'
      return 'Front'
    }) as Platform[]
  }
  // fallback: detect from title/version
  const v = release.version.toLowerCase()
  const t = release.title.toLowerCase()
  if (v.includes('ios') || t.includes('ios')) return ['iOS']
  if (v.includes('android') || t.includes('android')) return ['Android']
  return ['iOS']
}

// ─── Grouped release type ───────────────────────────────────────────────────

interface ReleaseGroup {
  releaseNumber: string
  releases: Release[]
}

// ─── Component ──────────────────────────────────────────────────────────────

const CP_VISIBLE_KEY = 'checkpointVisibleReleases'

function getVisibleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CP_VISIBLE_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch (e) { if (import.meta.env.DEV) console.warn('[Releases] Failed to load visible checkpoint IDs:', e); return new Set() }
}

function saveVisibleIds(ids: Set<string>) {
  localStorage.setItem(CP_VISIBLE_KEY, JSON.stringify([...ids]))
}

export function CheckpointTab({ releases, onReleaseClick, onDeleteRelease, onConcludeRelease }: CheckpointTabProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>('todos')
  const [openCards, setOpenCards] = useState<Set<string>>(new Set())
  const [visibleIds, setVisibleIds] = useState<Set<string>>(getVisibleIds)
  const [showPicker, setShowPicker] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmConcludeId, setConfirmConcludeId] = useState<string | null>(null)

  // Releases visíveis no checkpoint (somente as selecionadas, ou todas se nenhuma foi selecionada ainda)
  const visibleReleases = useMemo(() => {
    if (visibleIds.size === 0) return releases
    return releases.filter((r) => visibleIds.has(r.id))
  }, [releases, visibleIds])

  // Releases disponíveis para adicionar (as que não estão no checkpoint)
  const availableToAdd = useMemo(() => {
    if (visibleIds.size === 0) return [] // todas já visíveis
    return releases.filter((r) => !visibleIds.has(r.id))
  }, [releases, visibleIds])

  function addToCheckpoint(id: string) {
    const next = new Set(visibleIds)
    // Se é a primeira seleção, adicionar todas as que já estão visíveis + a nova
    if (visibleIds.size === 0) {
      releases.forEach((r) => next.add(r.id))
    }
    next.add(id)
    setVisibleIds(next)
    saveVisibleIds(next)
    setShowPicker(false)
  }

  function removeFromCheckpoint(id: string) {
    const next = new Set(visibleIds)
    next.delete(id)
    setVisibleIds(next)
    saveVisibleIds(next)
  }

  // Each release is its own group (no merging by version — platforms have independent lifecycles)
  const groups = useMemo<ReleaseGroup[]>(() => {
    return visibleReleases
      .map((r) => ({
        releaseNumber: r.id,
        releases: [r],
      }))
      .sort((a, b) => {
        const aVer = extractReleaseNumber(a.releases[0].version)
        const bVer = extractReleaseNumber(b.releases[0].version)
        const [aMaj, aMin] = aVer.split('.').map(Number)
        const [bMaj, bMin] = bVer.split('.').map(Number)
        if (aMaj !== bMaj) return aMaj - bMaj
        return aMin - bMin
      })
  }, [visibleReleases])

  // Apply filter
  const filtered = useMemo(() => {
    if (activeFilter === 'todos') return groups
    const allPlatforms: Platform[] = ['iOS', 'Android', 'Front', 'BFF', 'Back', 'Infra']
    if (allPlatforms.includes(activeFilter as Platform)) {
      return groups.filter((g) =>
        g.releases.some((r) => getReleasePlatforms(r).includes(activeFilter as Platform)),
      )
    }
    const matchStatuses = STATUS_FILTER_MAP[activeFilter]
    if (!matchStatuses) return groups
    return groups.filter((g) =>
      g.releases.some((r) => matchStatuses.includes(r.status)),
    )
  }, [groups, activeFilter])

  function toggleCard(num: string) {
    setOpenCards((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })
  }

  return (
    <div>
      {/* Pulse animation */}
      <style>{`
        @keyframes cp-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.7; }
        }
        .cp-card-hover:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important; }
        .cp-release-hover:hover { background: var(--color-blue-light) !important; }
      `}</style>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginBottom: 20, flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)',
          marginRight: 4,
        }}>
          Filtrar:
        </span>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            aria-pressed={activeFilter === f.value}
            onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)' }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              border: activeFilter === f.value
                ? '1px solid var(--color-blue)'
                : '1px solid var(--color-border-md)',
              background: activeFilter === f.value ? 'var(--color-blue)' : 'var(--color-surface)',
              color: activeFilter === f.value ? '#fff' : 'var(--color-text-2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              outline: 'none',
              minHeight: 36,
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Add release from cronograma */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1 }} />
        {showPicker ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label htmlFor="cp-release-picker" style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)' }}>
              Adicionar Release:
            </label>
            <select
              id="cp-release-picker"
              onChange={(e) => { if (e.target.value) addToCheckpoint(e.target.value) }}
              value=""
              style={{
                padding: '7px 28px 7px 10px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--color-blue)', background: 'var(--color-surface)',
                color: 'var(--color-text)', fontFamily: 'var(--font-family-sans)',
                cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                minWidth: 220,
              }}
            >
              <option value="">Selecione uma release...</option>
              {availableToAdd.map((r) => (
                <option key={r.id} value={r.id}>{r.version} — {r.title}</option>
              ))}
            </select>
            <button
              onClick={() => setShowPicker(false)}
              style={{
                padding: '7px 14px', borderRadius: 7,
                border: '1px solid var(--color-border-md)',
                background: 'transparent', color: 'var(--color-text-2)',
                fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                transition: 'all 0.15s',
              }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none',
              background: 'var(--color-blue)', color: '#fff',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              transition: 'all 0.15s',
              minHeight: 36,
            }}
          >
            + Adicionar Release
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '48px 20px',
          color: 'var(--color-text-3)', fontSize: 13,
        }}>
          Nenhuma release encontrada para este filtro.
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((group) => {
          const isOpen = openCards.has(group.releaseNumber)
          const allStatuses = group.releases.map((r) => r.status)
          const overall = overallStatus(allStatuses)
          const platforms = group.releases.map((r) => {
            const plats = getReleasePlatforms(r)
            return plats.map((pl) => PLATFORM_ICON[pl] ?? '📦').join('')
          })
          const versions = [...new Set(group.releases.map((r) => r.version))]

          return (
            <div
              key={group.releaseNumber}
              className="anim-fade-up cp-card-hover"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 12,
                overflow: 'hidden',
                transition: 'box-shadow 0.15s',
              }}
            >
              {/* Card header */}
              <div
                role="button"
                tabIndex={0}
                aria-expanded={isOpen}
                onClick={() => toggleCard(group.releaseNumber)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCard(group.releaseNumber) } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {/* Platform icons badge */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'var(--color-blue-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 18, gap: 2,
                  border: '1px solid var(--color-blue)',
                }}>
                  {platforms.join('')}
                </div>

                {/* Title block */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontSize: 14, fontWeight: 700, color: 'var(--color-text)',
                    }}>
                      {group.releases[0]?.title || `Release ${versions.join(' / ')}`}
                    </span>
                    <span style={{
                      fontSize: 13, fontWeight: 500, color: 'var(--color-text-3)',
                    }}>
                      {versions.join(' / ')}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2 }}>
                    {group.releases.length} plataforma{group.releases.length > 1 ? 's' : ''}
                  </div>
                </div>

                {/* Status badge */}
                <span style={statusBadgeStyle(overall)}>
                  {statusLabel(overall)}
                </span>

                {/* Chevron */}
                <span aria-hidden="true" style={{
                  fontSize: 14, color: 'var(--color-text-3)',
                  transition: 'transform 0.2s',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  flexShrink: 0,
                }}>
                  ▾
                </span>
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div style={{
                  borderTop: '1px solid var(--color-border)',
                  padding: '16px 18px',
                  display: 'flex', flexDirection: 'column', gap: 18,
                }}>
                  {group.releases.map((release) => {
                    const relPlatforms = getReleasePlatforms(release)
                    const platIcons = relPlatforms.map((p) => PLATFORM_ICON[p] ?? '📦').join(' ')
                    const platNames = relPlatforms.join(' / ')
                    const platColor = relPlatforms[0] ? (PLATFORM_COLOR[relPlatforms[0]] ?? 'var(--color-text-2)') : 'var(--color-text-2)'
                    const phaseStates = getPhaseStates(release.status)
                    const phaseDates = getPhaseDates(release)

                    return (
                      <div
                        key={release.id}
                        className="cp-release-hover"
                        onClick={() => onReleaseClick(release.id)}
                        style={{
                          cursor: 'pointer',
                          padding: '12px 14px',
                          borderRadius: 8,
                          background: 'var(--color-surface-2)',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Squad/platform header */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          marginBottom: 12,
                        }}>
                          <span style={{ fontSize: 16 }}>{platIcons}</span>
                          <span style={{
                            fontSize: 13, fontWeight: 700, color: platColor,
                          }}>
                            {platNames || release.title}
                          </span>
                          <span style={{
                            fontSize: 12, fontWeight: 500, color: 'var(--color-text-3)',
                          }}>
                            {release.version}
                          </span>
                          <span style={statusBadgeStyle(release.status)}>
                            {statusLabel(release.status)}
                          </span>
                        </div>

                        {/* Mini pipeline — dots row + labels row */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                          {/* Dots + lines row */}
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            {PHASE_LABELS.map((label, i) => {
                              const state = phaseStates[i]
                              const dotColor = DOT_COLORS[state]
                              const isLast = i === PHASE_LABELS.length - 1
                              return (
                                <div key={label} style={{ display: 'contents' }}>
                                  <div style={{
                                    width: 14, height: 14, borderRadius: '50%',
                                    background: dotColor, flexShrink: 0,
                                    animation: state === 'active' ? 'cp-pulse 1.5s ease-in-out infinite' : 'none',
                                    boxShadow: state === 'active' ? `0 0 6px ${dotColor}` : 'none',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 9, lineHeight: 1, color: '#fff', fontWeight: 700,
                                  }}>
                                    {state === 'done' ? '✓' : state === 'active' ? '◉' : '○'}
                                  </div>
                                  {!isLast && (
                                    <div style={{
                                      flex: 1, height: 2, minWidth: 16,
                                      background: state === 'done' ? DOT_COLORS.done : 'var(--color-border-md)',
                                    }} />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                          {/* Labels + dates row */}
                          <div style={{ display: 'flex', marginTop: 6 }}>
                            {PHASE_LABELS.map((label, i) => {
                              const state = phaseStates[i]
                              return (
                                <div key={label} style={{
                                  flex: 1, textAlign: 'center', minWidth: 0,
                                }}>
                                  <div style={{
                                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                                    letterSpacing: 0.3,
                                    color: state === 'done' ? DOT_COLORS.done
                                      : state === 'active' ? DOT_COLORS.active
                                      : 'var(--color-text-3)',
                                  }}>
                                    {label}
                                  </div>
                                  <div style={{
                                    fontSize: 11, color: 'var(--color-text-3)',
                                    marginTop: 2, whiteSpace: 'nowrap',
                                  }}>
                                    {phaseDates[i]}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Distribuição — visível quando em produção */}
                        {(release.status === 'em_producao' || release.status === 'concluida') && typeof release.rolloutPct === 'number' && release.rolloutPct > 0 && (
                          <div style={{
                            marginTop: 10, padding: '8px 12px',
                            background: 'var(--color-bg)', borderRadius: 6,
                            border: '0.5px solid var(--color-border)',
                          }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              marginBottom: 4,
                            }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)',
                                textTransform: 'uppercase', letterSpacing: '0.5px',
                              }}>
                                Distribuicao em producao
                              </span>
                              <span style={{
                                fontSize: 14, fontWeight: 800,
                                fontFamily: 'var(--font-family-mono)',
                                color: release.rolloutPct >= 100 ? 'var(--color-green)'
                                  : release.rolloutPct >= 50 ? 'var(--color-amber-mid)'
                                  : 'var(--color-blue)',
                              }}>
                                {release.rolloutPct}%
                              </span>
                            </div>
                            <div style={{
                              height: 6, borderRadius: 3,
                              background: 'var(--color-surface-2)',
                            }}>
                              <div style={{
                                width: `${Math.min(release.rolloutPct, 100)}%`,
                                height: '100%', borderRadius: 3,
                                background: release.rolloutPct >= 100 ? 'var(--color-green)'
                                  : release.rolloutPct >= 50 ? 'var(--color-amber-mid)'
                                  : 'var(--color-blue)',
                                transition: 'width 0.4s ease',
                                minWidth: release.rolloutPct > 0 ? 4 : 0,
                              }} />
                            </div>
                          </div>
                        )}

                        {/* Notas */}
                        {release.description && (
                          <div style={{
                            marginTop: 10, padding: '8px 12px',
                            background: 'var(--color-bg)', borderRadius: 6,
                            border: '0.5px solid var(--color-border)',
                            fontSize: 12, color: 'var(--color-text-2)',
                            lineHeight: 1.5, whiteSpace: 'pre-wrap',
                          }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 4 }}>
                              Notas
                            </span>
                            {release.description}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* ── Barra de ações ──────────────────────────────────── */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingTop: 14, marginTop: 14,
                    borderTop: '1px solid var(--color-border)',
                    flexWrap: 'wrap',
                  }}>
                    {/* Concluir — só se não concluída */}
                    {overall !== 'concluida' && (
                      confirmConcludeId === group.releaseNumber ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>Concluir esta release?</span>
                          <button
                            onClick={() => {
                              group.releases.forEach((r) => onConcludeRelease(r.id))
                              setConfirmConcludeId(null)
                              showToast('Release concluída com sucesso', 'success')
                            }}
                            style={{
                              padding: '5px 12px', borderRadius: 6, border: 'none',
                              background: 'var(--color-green-mid)', color: '#fff',
                              fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              fontFamily: 'var(--font-family-sans)',
                              transition: 'all 0.15s',
                            }}
                          >Sim, concluir</button>
                          <button
                            onClick={() => setConfirmConcludeId(null)}
                            style={{
                              padding: '5px 12px', borderRadius: 6,
                              border: '1px solid var(--color-border-md)',
                              background: 'transparent', color: 'var(--color-text-2)',
                              fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                              transition: 'all 0.15s',
                            }}
                          >Cancelar</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmConcludeId(group.releaseNumber)}
                          aria-label="Concluir release"
                          style={{
                            padding: '6px 14px', borderRadius: 7, border: 'none',
                            background: 'var(--color-green-mid)', color: '#fff',
                            fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'var(--font-family-sans)',
                            transition: 'all 0.15s',
                            minHeight: 36,
                          }}
                        >
                          ✓ Concluir Release
                        </button>
                      )
                    )}

                    {/* Editar */}
                    <button
                      onClick={() => onReleaseClick(group.releases[0].id)}
                      aria-label="Editar release"
                      style={{
                        padding: '6px 14px', borderRadius: 7,
                        border: '1px solid var(--color-border-md)',
                        background: 'transparent', color: 'var(--color-text-2)',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--font-family-sans)',
                        transition: 'all 0.15s',
                        minHeight: 36,
                      }}
                    >
                      ✎ Editar
                    </button>

                    <div style={{ flex: 1 }} />

                    {/* Remover do checkpoint */}
                    {visibleIds.size > 0 && (
                      <button
                        onClick={() => group.releases.forEach((r) => removeFromCheckpoint(r.id))}
                        aria-label="Remover release do checkpoint"
                        style={{
                          padding: '6px 14px', borderRadius: 7,
                          border: '1px solid var(--color-border-md)',
                          background: 'transparent', color: 'var(--color-text-3)',
                          fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                          transition: 'all 0.15s',
                          minHeight: 36,
                        }}
                      >
                        Remover do checkpoint
                      </button>
                    )}

                    {/* Excluir */}
                    {confirmDeleteId === group.releaseNumber ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 12, color: 'var(--color-red)', fontWeight: 600 }}>Excluir permanentemente?</span>
                        <button
                          onClick={() => {
                            group.releases.forEach((r) => onDeleteRelease(r.id))
                            setConfirmDeleteId(null)
                            showToast('Release excluída', 'info')
                          }}
                          style={{
                            padding: '5px 12px', borderRadius: 6, border: 'none',
                            background: 'var(--color-red)', color: '#fff',
                            fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'var(--font-family-sans)',
                            transition: 'all 0.15s',
                          }}
                        >Excluir</button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          style={{
                            padding: '5px 12px', borderRadius: 6,
                            border: '1px solid var(--color-border-md)',
                            background: 'transparent', color: 'var(--color-text-2)',
                            fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                            transition: 'all 0.15s',
                          }}
                        >Cancelar</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(group.releaseNumber)}
                        aria-label="Excluir release"
                        style={{
                          padding: '6px 14px', borderRadius: 7,
                          border: '1px solid var(--color-red-mid)',
                          background: 'transparent', color: 'var(--color-red)',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--font-family-sans)',
                          transition: 'all 0.15s',
                          minHeight: 36,
                        }}
                      >
                        🗑 Excluir
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
