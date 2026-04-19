import { useState, useMemo, useEffect } from 'react'
import { showToast } from '@/app/components/Toast'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { supabase } from '@/lib/supabase'
import { getMasterIndex } from '@/modules/sprints/services/persistence'
import { loadFromStorage } from '@/modules/sprints/services/persistence'
import type { Release, ReleaseStatus } from '../../types/release.types'
import { type Platform } from '../../constants/platforms'
import { STATUS_LABELS } from '../../constants/status'

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
function IconApple({ size = 12 }: { size?: number }) {
  return <Svg size={size}><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" /><path d="M10 2c1 .5 2 2 2 5" /></Svg>
}
function IconAndroid({ size = 12 }: { size?: number }) {
  return <Svg size={size}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></Svg>
}
function IconGlobe({ size = 12 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></Svg>
}
function IconLink2({ size = 12 }: { size?: number }) {
  return <Svg size={size}><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" /><line x1="8" y1="12" x2="16" y2="12" /></Svg>
}
function IconServer({ size = 12 }: { size?: number }) {
  return <Svg size={size}><rect x="2" y="2" width="20" height="8" rx="2" ry="2" /><rect x="2" y="14" width="20" height="8" rx="2" ry="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></Svg>
}
function IconCloud({ size = 12 }: { size?: number }) {
  return <Svg size={size}><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" /></Svg>
}
function IconTarget({ size = 26 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></Svg>
}
function IconLink3({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3" /><line x1="8" y1="12" x2="16" y2="12" /></Svg>
}
function IconAlertTriangle({ size = 12 }: { size?: number }) {
  return <Svg size={size}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>
}
function IconCheck({ size = 12 }: { size?: number }) {
  return <Svg size={size}><polyline points="20 6 9 17 4 12" /></Svg>
}
function IconChevronDown({ size = 14 }: { size?: number }) {
  return <Svg size={size}><polyline points="6 9 12 15 18 9" /></Svg>
}

const PLATFORM_ICON_COMP: Record<Platform, React.ComponentType<{ size?: number }>> = {
  iOS: IconApple, Android: IconAndroid, Front: IconGlobe,
  BFF: IconLink2, Back: IconServer, Infra: IconCloud,
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface CheckpointTabProps {
  releases: Release[]
  onReleaseClick: (id: string) => void
  onDeleteRelease: (id: string) => void
  onConcludeRelease: (id: string) => void
}

// ─── Constants ──────────────────────────────────────────────────────────────

type FilterValue = 'todos' | 'Publicado' | 'Em Corte' | 'Em Regressivo' | 'Previsto' | Platform

type StatusFilterValue = 'todos' | 'Publicado' | 'Em Corte' | 'Em Regressivo' | 'Previsto'

const STATUS_FILTERS: { value: StatusFilterValue; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'Publicado', label: 'Publicado' },
  { value: 'Em Corte', label: 'Em Corte' },
  { value: 'Em Regressivo', label: 'Em Regressivo' },
  { value: 'Previsto', label: 'Previsto' },
]

const PLATFORM_FILTERS: { value: Platform; label: string }[] = [
  { value: 'iOS', label: 'iOS' },
  { value: 'Android', label: 'Android' },
  { value: 'Front', label: 'Front' },
  { value: 'BFF', label: 'BFF' },
  { value: 'Back', label: 'Back' },
  { value: 'Infra', label: 'Infra' },
]

const PHASE_LABELS = ['CORTE', 'GERACAO', 'HOMOLOG.', 'BETA', 'PRODUCAO'] as const

const DOT_COLORS = {
  done: 'var(--color-green-mid)',
  active: 'var(--color-amber-mid)',
  pending: 'var(--color-border-md)',
} as const

const STATUS_FILTER_MAP: Record<string, ReleaseStatus[]> = {
  Publicado: ['concluida', 'em_producao'],
  'Em Corte': ['corte'],
  'Em Regressivo': ['em_regressivo', 'em_homologacao', 'em_qa'],
  Previsto: ['planejada', 'em_desenvolvimento'],
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function extractReleaseNumber(version: string): string {
  const match = version.replace(/^v/i, '').match(/^(\d+\.\d+)/)
  return match ? match[1] : version
}

function statusGroup(status: ReleaseStatus): string {
  const map: Record<ReleaseStatus, string> = {
    planejada: 'Previsto',
    em_desenvolvimento: 'Previsto',
    corte: 'Em Corte',
    em_homologacao: 'Em Regressivo',
    em_regressivo: 'Em Regressivo',
    em_qa: 'Em QA',
    aguardando_aprovacao: 'Aguardando Aprovação',
    aprovada: 'Aprovada',
    em_producao: 'Publicado',
    concluida: 'Publicado',
    uniu_escopo: 'Uniu Escopo',
    rollback: 'Rollback',
    cancelada: 'Cancelada',
  }
  return map[status]
}

function statusBadgeStyle(status: ReleaseStatus): React.CSSProperties {
  const label = statusGroup(status)
  const base: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 999,
    whiteSpace: 'nowrap',
    letterSpacing: 0.3,
  }
  switch (label) {
    case 'Publicado':
      return { ...base, background: 'var(--color-green-light)', color: 'var(--color-green)' }
    case 'Em Corte':
      return { ...base, background: 'color-mix(in srgb, var(--color-blue) 12%, transparent)', color: 'var(--color-blue-text)' }
    case 'Aprovada':
      return { ...base, background: 'var(--color-blue-light)', color: 'var(--color-blue-text)' }
    case 'Em Regressivo':
      return { ...base, background: 'var(--color-amber-light)', color: 'var(--color-amber-mid)' }
    case 'Previsto':
      return { ...base, background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }
    case 'Uniu Escopo':
      return { ...base, background: 'color-mix(in srgb, var(--color-blue) 8%, transparent)', color: 'var(--color-blue-text)' }
    case 'Em QA':
      return { ...base, background: 'color-mix(in srgb, var(--color-green) 12%, transparent)', color: 'var(--color-green)' }
    case 'Aguardando Aprovação':
      return { ...base, background: 'var(--color-amber-light)', color: 'var(--color-amber-mid)' }
    case 'Rollback':
      return { ...base, background: 'var(--color-red-light)', color: 'var(--color-red)' }
    case 'Cancelada':
      return { ...base, background: 'var(--color-surface-2)', color: 'var(--color-text-3)', textDecoration: 'line-through' }
    default:
      return { ...base, background: 'var(--color-surface-2)', color: 'var(--color-text-2)' }
  }
}

function overallStatus(statuses: ReleaseStatus[]): ReleaseStatus {
  if (statuses.some((s) => s === 'em_qa')) return 'em_qa'
  if (statuses.some((s) => s === 'em_regressivo' || s === 'em_homologacao')) return 'em_regressivo'
  if (statuses.some((s) => s === 'corte')) return 'corte'
  if (statuses.some((s) => s === 'uniu_escopo')) return 'uniu_escopo'
  if (statuses.some((s) => s === 'aguardando_aprovacao')) return 'aguardando_aprovacao'
  if (statuses.some((s) => s === 'aprovada')) return 'aprovada'
  if (statuses.some((s) => s === 'rollback')) return 'rollback'
  if (statuses.some((s) => s === 'em_producao')) return 'em_producao'
  if (statuses.some((s) => s === 'planejada' || s === 'em_desenvolvimento')) return 'planejada'
  if (statuses.some((s) => s === 'cancelada')) return 'cancelada'
  if (statuses.every((s) => s === 'concluida')) return 'concluida'
  return statuses[0] ?? 'planejada'
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '—'
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
    case 'em_qa':
      return ['done', 'done', 'active', 'pending', 'pending']
    case 'aguardando_aprovacao':
      return ['done', 'done', 'done', 'done', 'active']
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
      : '—',
    formatDateShort(release.betaDate),
    formatDateShort(release.productionDate),
  ]
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

// ─── PR Alert types ─────────────────────────────────────────────────────────

interface PrAlertData {
  total: number
  withTests: number
  pending: string[]
}

async function fetchPrAlertsForRelease(releaseId: string): Promise<PrAlertData | null> {
  try {
    const { data, error } = await supabase
      .from('release_prs')
      .select('squad_id, squads:squad_id(name)')
      .eq('release_id', releaseId)
      .eq('review_status', 'approved')

    if (error || !data || data.length === 0) return null

    // Deduplicate squads with approved PRs
    const squadMap = new Map<string, string>()
    for (const row of data) {
      const sid = row.squad_id as string
      if (!sid) continue
      const squadObj = row.squads as unknown as { name: string } | null
      const name = squadObj?.name ?? sid
      squadMap.set(sid, name)
    }

    if (squadMap.size === 0) return null

    // Check master index for integrated sprints linked to this release
    const masterIndex = getMasterIndex()
    const integratedSprints = masterIndex.filter(
      (s) => s.sprintType === 'integrado' && s.releaseId === releaseId,
    )

    // For each squad, check if there is an integrated sprint with test data
    const squadsWithTests = new Set<string>()
    for (const sprint of integratedSprints) {
      const squadId = sprint.squadId
      if (!squadId || !squadMap.has(squadId)) continue
      // Check if the sprint has features/test cases
      if (sprint.totalTests > 0) {
        squadsWithTests.add(squadId)
        continue
      }
      // Fallback: load sprint data to check features
      const state = loadFromStorage(sprint.id)
      if (state && state.features.some((f) => f.tests > 0 || (f.cases && f.cases.length > 0))) {
        squadsWithTests.add(squadId)
      }
    }

    const pending: string[] = []
    for (const [sid, name] of squadMap) {
      if (!squadsWithTests.has(sid)) pending.push(name)
    }

    return { total: squadMap.size, withTests: squadsWithTests.size, pending }
  } catch {
    // Table may not exist in local dev — fail silently
    return null
  }
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
  const [confirmUnlinkId, setConfirmUnlinkId] = useState<string | null>(null)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkSearch, setLinkSearch] = useState('')
  const [prAlerts, setPrAlerts] = useState<Record<string, PrAlertData>>({})

  // Fetch PR alert data for all visible releases
  useEffect(() => {
    if (visibleIds.size === 0) return
    let cancelled = false
    const releaseIds = releases.filter((r) => visibleIds.has(r.id)).map((r) => r.id)

    Promise.all(
      releaseIds.map(async (id) => {
        const data = await fetchPrAlertsForRelease(id)
        return { id, data }
      }),
    ).then((results) => {
      if (cancelled) return
      const next: Record<string, PrAlertData> = {}
      for (const { id, data } of results) {
        if (data) next[id] = data
      }
      setPrAlerts(next)
    })

    return () => { cancelled = true }
  }, [releases, visibleIds])

  // Releases vinculadas ao checkpoint
  const visibleReleases = useMemo(() => {
    if (visibleIds.size === 0) return []
    return releases.filter((r) => visibleIds.has(r.id))
  }, [releases, visibleIds])

  // Releases disponíveis para vincular (existem no cronograma mas não no checkpoint)
  const availableToAdd = useMemo(() => {
    return releases.filter((r) => !visibleIds.has(r.id))
  }, [releases, visibleIds])

  function addToCheckpoint(id: string) {
    const next = new Set(visibleIds)
    next.add(id)
    setVisibleIds(next)
    saveVisibleIds(next)
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
        .cp-link-btn:hover { background: var(--color-bg) !important; }
        .cp-link-btn-primary:hover { background: var(--color-blue-text) !important; }
      `}</style>

      {/* Filter bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 16, gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
          {/* Status pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginRight: 2 }}>
              Status:
            </span>
            {STATUS_FILTERS.map((f) => {
              const active = activeFilter === f.value
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  aria-pressed={active}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 999,
                    border: `1px solid ${active ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                    background: active ? 'var(--color-blue-light)' : 'var(--color-surface)',
                    color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family-sans)',
                    transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {f.label}
                </button>
              )
            })}
          </div>

          {/* Divider vertical */}
          <span aria-hidden="true" style={{ width: 1, height: 20, background: 'var(--color-border-md)' }} />

          {/* Platform chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-2)', marginRight: 2 }}>
              Plataforma:
            </span>
            {PLATFORM_FILTERS.map((f) => {
              const active = activeFilter === f.value
              const PIcon = PLATFORM_ICON_COMP[f.value]
              return (
                <button
                  key={f.value}
                  onClick={() => setActiveFilter(f.value)}
                  aria-pressed={active}
                  aria-label={`Filtrar por ${f.label}`}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px',
                    borderRadius: 999,
                    border: `1px solid ${active ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                    background: active ? 'var(--color-blue-light)' : 'var(--color-surface)',
                    color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-family-sans)',
                    transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <PIcon size={12} /> {f.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Vincular release ao checkpoint */}
        {availableToAdd.length > 0 && (
          <button
            onClick={() => { setShowLinkModal(true); setLinkSearch('') }}
            aria-label="Vincular release ao checkpoint"
            className="cp-link-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid var(--color-border-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
              whiteSpace: 'nowrap', flexShrink: 0,
              transition: 'background 0.12s',
            }}
          >
            <IconLink3 /> Vincular Release
          </button>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
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
            <IconTarget />
          </div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
            {activeFilter === 'todos' ? 'Nenhuma release no checkpoint' : 'Nenhuma release neste filtro'}
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
            {activeFilter === 'todos'
              ? 'Vincule releases do Cronograma para acompanhá-las aqui.'
              : 'Ajuste os filtros ou vincule novas releases ao checkpoint.'}
          </p>
          <div style={{ display: 'inline-flex', gap: 8 }}>
            {activeFilter !== 'todos' && (
              <button
                onClick={() => setActiveFilter('todos')}
                className="cp-link-btn"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--color-border-md)',
                  background: 'var(--color-surface)', color: 'var(--color-text)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                  transition: 'background 0.12s',
                }}
              >
                Limpar filtros
              </button>
            )}
            {availableToAdd.length > 0 && (
              <button
                onClick={() => { setShowLinkModal(true); setLinkSearch('') }}
                className="cp-link-btn-primary"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 8,
                  border: '1px solid var(--color-blue)',
                  background: 'var(--color-blue)', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-family-sans)',
                  transition: 'background 0.12s',
                }}
              >
                <IconLink3 /> Vincular Release
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map((group) => {
          const isOpen = openCards.has(group.releaseNumber)
          const allStatuses = group.releases.map((r) => r.status)
          const overall = overallStatus(allStatuses)
          const platforms = group.releases.map((r) => getReleasePlatforms(r))
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
                <div
                  aria-label={`Plataformas: ${platforms.flat().join(', ')}`}
                  style={{
                    minWidth: 38, height: 38, padding: '0 10px', borderRadius: 20,
                    background: 'var(--color-blue-light)',
                    color: 'var(--color-blue-text)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, gap: 4,
                    border: '1px solid var(--color-blue)',
                  }}
                >
                  {platforms.flat().map((p, idx) => {
                    const PIcon = PLATFORM_ICON_COMP[p]
                    return <PIcon key={`${p}-${idx}`} size={14} />
                  })}
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
                  {STATUS_LABELS[overall]}
                </span>

                {/* PR integrated tests alert badge */}
                {(() => {
                  // Aggregate alerts across ALL releases in the group
                  const allPending: string[] = []
                  let totalSquads = 0
                  let hasAnyAlert = false

                  for (const rel of group.releases) {
                    const alert = prAlerts[rel.id]
                    if (!alert) continue
                    hasAnyAlert = true
                    for (const squad of alert.pending) {
                      if (!allPending.includes(squad)) allPending.push(squad)
                    }
                    totalSquads += alert.total
                  }

                  if (!hasAnyAlert) return null

                  if (allPending.length > 0) {
                    return (
                      <span
                        title={`Squads pendentes: ${allPending.join(', ')}`}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 10, fontWeight: 700,
                          padding: '3px 10px', borderRadius: 999,
                          whiteSpace: 'nowrap', letterSpacing: 0.3,
                          background: 'var(--color-amber-light)',
                          color: 'var(--color-amber-mid)',
                        }}
                      >
                        <IconAlertTriangle size={11} /> {allPending.length} de {totalSquads} squads sem testes
                      </span>
                    )
                  }
                  return (
                    <span
                      title="Todos os squads com PRs aprovados possuem testes integrados registrados"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 10, fontWeight: 700,
                        padding: '3px 10px', borderRadius: 999,
                        whiteSpace: 'nowrap', letterSpacing: 0.3,
                        background: 'var(--color-green-light)',
                        color: 'var(--color-green)',
                      }}
                    >
                      <IconCheck size={11} /> Todos com testes
                    </span>
                  )
                })()}

                {/* Chevron */}
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22,
                    color: 'var(--color-text-3)',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                >
                  <IconChevronDown />
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
                    const platNames = relPlatforms.join(' / ')
                    const platColor = 'var(--color-text)'
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--color-text-2)' }}>
                            {relPlatforms.map((p, idx) => {
                              const PIcon = PLATFORM_ICON_COMP[p]
                              return <PIcon key={`${p}-${idx}`} size={14} />
                            })}
                          </span>
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
                            {STATUS_LABELS[release.status]}
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

                    {/* Desvincular do checkpoint */}
                    {visibleIds.size > 0 && (
                      <button
                        onClick={() => setConfirmUnlinkId(group.releaseNumber)}
                        title="Desvincular do checkpoint"
                        aria-label="Desvincular release do checkpoint"
                        style={{
                          padding: '6px 10px', borderRadius: 7,
                          border: '1px solid var(--color-amber-mid)',
                          background: 'var(--color-amber-light)', color: 'var(--color-amber)',
                          fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--font-family-sans)',
                          transition: 'all 0.15s',
                          minHeight: 36,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}
                      >
                        ↩ Desvincular
                      </button>
                    )}

                    {/* Excluir */}
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
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal — vincular release ao checkpoint */}
      {showLinkModal && (
        <div
          onClick={() => setShowLinkModal(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            role="dialog" aria-modal="true" aria-label="Vincular Release ao Checkpoint"
            style={{
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderTop: '3px solid var(--color-blue)', borderRadius: 12,
              padding: '20px 22px', width: '100%', maxWidth: 460,
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                🔗 Vincular Release
              </h2>
              <button onClick={() => setShowLinkModal(false)} aria-label="Fechar" style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--color-text-3)', cursor: 'pointer' }}>×</button>
            </div>

            <p style={{ fontSize: 13, color: 'var(--color-text-2)', margin: '0 0 12px', lineHeight: 1.5 }}>
              Selecione uma release do cronograma para acompanhar no checkpoint.
            </p>

            {/* Busca */}
            <input
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Buscar por versão ou título..."
              autoFocus
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 7,
                border: '1px solid var(--color-border-md)', fontSize: 13,
                fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
                background: 'var(--color-bg)', boxSizing: 'border-box', marginBottom: 12,
              }}
            />

            {/* Lista de releases */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {availableToAdd
                .filter((r) => {
                  if (!linkSearch.trim()) return true
                  const q = linkSearch.toLowerCase()
                  return (r.version?.toLowerCase().includes(q)) || (r.title?.toLowerCase().includes(q))
                })
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      addToCheckpoint(r.id)
                      setShowLinkModal(false)
                      showToast(`Release ${r.version} vinculada ao checkpoint`, 'success')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 8,
                      border: '1px solid var(--color-border)',
                      background: 'var(--color-surface)', cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'var(--font-family-sans)',
                      transition: 'background 0.12s, border-color 0.12s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-blue-light)'; e.currentTarget.style.borderColor = 'var(--color-blue)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-surface)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
                        {r.version} — {r.title || 'Sem título'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 2, display: 'flex', gap: 8 }}>
                        {r.productionDate && <span>Prod: {r.productionDate.split('-').reverse().join('/')}</span>}
                        {r.cutoffDate && <span>Corte: {r.cutoffDate.split('-').reverse().join('/')}</span>}
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 12,
                      background: 'var(--color-blue-light)', color: 'var(--color-blue-text)',
                      whiteSpace: 'nowrap',
                    }}>
                      Vincular
                    </span>
                  </button>
                ))}

              {availableToAdd.filter((r) => {
                if (!linkSearch.trim()) return true
                const q = linkSearch.toLowerCase()
                return (r.version?.toLowerCase().includes(q)) || (r.title?.toLowerCase().includes(q))
              }).length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: 'var(--color-text-3)', fontSize: 13 }}>
                  {linkSearch.trim() ? 'Nenhuma release encontrada para esta busca.' : 'Todas as releases já estão vinculadas ao checkpoint.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação — excluir release */}
      {confirmDeleteId && (
        <ConfirmModal
          title="Excluir Release"
          description="Deseja excluir esta release permanentemente? Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          onConfirm={() => {
            const g = groups.find((gr: ReleaseGroup) => gr.releaseNumber === confirmDeleteId)
            if (g) g.releases.forEach((r: Release) => onDeleteRelease(r.id))
            setConfirmDeleteId(null)
            showToast('Release excluída', 'info')
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* Modal de confirmação — desvincular do checkpoint */}
      {confirmUnlinkId && (
        <ConfirmModal
          title="Desvincular Release"
          description="Deseja desvincular esta release do checkpoint? Ela continuará disponível no cronograma e poderá ser vinculada novamente."
          confirmLabel="Desvincular"
          onConfirm={() => {
            const g = groups.find((gr: ReleaseGroup) => gr.releaseNumber === confirmUnlinkId)
            if (g) g.releases.forEach((r: Release) => removeFromCheckpoint(r.id))
            setConfirmUnlinkId(null)
            showToast('Release desvinculada do checkpoint', 'info')
          }}
          onCancel={() => setConfirmUnlinkId(null)}
        />
      )}
    </div>
  )
}
