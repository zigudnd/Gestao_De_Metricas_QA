import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSprintStore } from '../store/sprintStore'
import { loadFromStorage, loadFromServer, getMasterIndex, DEFAULT_STATE } from '../services/persistence'
import { OverviewTab } from '../components/dashboard/OverviewTab'
import { ConfigTab } from '../components/dashboard/ConfigTab'
import { FeaturesTab } from '../components/dashboard/FeaturesTab'
import { BugsTab } from '../components/dashboard/BugsTab'
import { BlockersTab } from '../components/dashboard/BlockersTab'
import { AlignmentsTab } from '../components/dashboard/AlignmentsTab'
import { NotesTab } from '../components/dashboard/NotesTab'
import { ReportTab } from '../components/dashboard/ReportTab'
import { IntegratedSquadsPanel } from '../components/dashboard/IntegratedSquadsPanel'
import type { SprintIndexEntry } from '../types/sprint.types'
import { supabase } from '@/lib/supabase'
import { uid } from '@/lib/uid'

type TabId = 'overview' | 'config' | 'features' | 'bugs' | 'blockers' | 'alignments' | 'notes' | 'report'

type TabIconProps = { size?: number }
type TabIcon = React.ComponentType<TabIconProps>

// ─── Tab icons (SVG inline, Lucide paths) ───────────────────────────────────
function TabSvg({ size = 15, children }: TabIconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  )
}
const IconBarChart: TabIcon = (p) => <TabSvg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></TabSvg>
const IconCalendar: TabIcon = (p) => <TabSvg {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></TabSvg>
const IconBug: TabIcon = (p) => (
  <TabSvg {...p}>
    <path d="M8 2l1.88 1.88" />
    <path d="M14.12 3.88 16 2" />
    <path d="M9 7.13v-1a3 3 0 1 1 6 0v1" />
    <path d="M12 20a6 6 0 0 1-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3a6 6 0 0 1-6 6Z" />
    <path d="M12 20v-9" />
    <path d="M6.53 9C4.6 8.8 3 7.1 3 5" />
    <path d="M6 13H2" />
    <path d="M3 21c0-2.1 1.7-3.9 3.8-4" />
    <path d="M20.97 5c0 2.1-1.6 3.8-3.5 4" />
    <path d="M22 13h-4" />
    <path d="M17.2 17c2.1.1 3.8 1.9 3.8 4" />
  </TabSvg>
)
const IconFlask: TabIcon = (p) => (
  <TabSvg {...p}>
    <path d="M10 2v7.31" />
    <path d="M14 9.3V1.99" />
    <path d="M8.5 2h7" />
    <path d="M14 9.3a6.5 6.5 0 1 1-4 0" />
    <path d="M5.52 16h12.96" />
  </TabSvg>
)
const IconConstruction: TabIcon = (p) => (
  <TabSvg {...p}>
    <rect x="2" y="6" width="20" height="8" rx="1" />
    <path d="M17 14v7" />
    <path d="M7 14v7" />
    <path d="M17 3v3" />
    <path d="M7 3v3" />
    <path d="M10 14 8 21" />
    <path d="m14 14 2 7" />
  </TabSvg>
)
const IconClipboardList: TabIcon = (p) => (
  <TabSvg {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </TabSvg>
)
const IconStickyNote: TabIcon = (p) => (
  <TabSvg {...p}>
    <path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3Z" />
    <path d="M15 3v6h6" />
  </TabSvg>
)
const IconSettings: TabIcon = (p) => (
  <TabSvg {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </TabSvg>
)

const TABS: { id: TabId; label: string; Icon: TabIcon }[] = [
  { id: 'overview',    label: 'Resumo',          Icon: IconBarChart },
  { id: 'report',      label: 'Daily Report',    Icon: IconCalendar },
  { id: 'bugs',        label: 'Bugs',            Icon: IconBug },
  { id: 'features',    label: 'Testes',          Icon: IconFlask },
  { id: 'blockers',    label: 'Blockers',        Icon: IconConstruction },
  { id: 'alignments',  label: 'Alinhamentos',    Icon: IconClipboardList },
  { id: 'notes',       label: 'Notas',           Icon: IconStickyNote },
  { id: 'config',      label: 'Configurações',   Icon: IconSettings },
]

export function SprintDashboard() {
  const { sprintId = '' } = useParams<{ sprintId: string }>()
  const initSprint = useSprintStore((s) => s.initSprint)
  const state = useSprintStore((s) => s.state)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  useEffect(() => {
    if (!sprintId) return
    suitesCreatedRef.current = false
    let cancelled = false

    async function load() {
      setLoading(true)
      // Try server first, fallback to localStorage
      let raw = await loadFromServer(sprintId)
      if (!raw) raw = loadFromStorage(sprintId)
      if (!cancelled) initSprint(sprintId, raw ?? structuredClone(DEFAULT_STATE))
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [sprintId, initSprint])

  // ── Integrated sprint: resolve entry from master index ─────────────────────
  const sprintEntry: SprintIndexEntry | undefined = useMemo(
    () => getMasterIndex().find((s) => s.id === sprintId),
    // Re-derive when loading finishes (state is set) or sprintId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sprintId, loading, state],
  )

  const isIntegrated = sprintEntry?.sprintType === 'integrado' && !!sprintEntry.releaseId

  // Fetch squads with approved PRs for integrated sprints (used in FeaturesTab squad select)
  const [availableSquads, setAvailableSquads] = useState<Array<{ id: string; name: string }>>([])

  useEffect(() => {
    if (!isIntegrated || !sprintEntry?.releaseId) {
      setAvailableSquads([])
      return
    }
    let cancelled = false

    async function fetchSquadsWithApprovedPRs() {
      const { data, error: fetchError } = await supabase
        .from('release_prs')
        .select('squad_id, squads:squad_id(name)')
        .eq('release_id', sprintEntry!.releaseId!)
        .eq('review_status', 'approved')

      if (cancelled) return

      if (fetchError) {
        if (import.meta.env.DEV) console.warn('[SprintDashboard] Failed to fetch squads with approved PRs:', fetchError.message)
        setAvailableSquads([])
        return
      }

      const rows = (data ?? []) as unknown as Array<{ squad_id: string; squads: { name: string } | null }>
      const squadMap = new Map<string, string>()
      for (const row of rows) {
        if (!squadMap.has(row.squad_id)) {
          squadMap.set(row.squad_id, row.squads?.name ?? 'Squad desconhecido')
        }
      }

      setAvailableSquads(
        Array.from(squadMap.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name))
      )
    }

    fetchSquadsWithApprovedPRs()
    return () => { cancelled = true }
  }, [isIntegrated, sprintEntry?.releaseId])

  // Auto-create suites from approved squads (one suite per squad) — runs once
  const suitesCreatedRef = useRef(false)
  useEffect(() => {
    if (!isIntegrated || availableSquads.length === 0 || suitesCreatedRef.current) return
    const currentState = useSprintStore.getState().state
    if (!currentState) return

    const existingSuiteNames = new Set(currentState.suites.map((s) => s.name.toLowerCase()))
    const missingSquads = availableSquads.filter((sq) => !existingSuiteNames.has(sq.name.toLowerCase()))
    if (missingSquads.length === 0) {
      suitesCreatedRef.current = true
      return
    }

    // Build new suites + commit once
    const newSuites = missingSquads.map((sq) => ({ id: uid(), name: sq.name }))
    const { _commit } = useSprintStore.getState()
    _commit({ ...currentState, suites: [...currentState.suites, ...newSuites] })
    suitesCreatedRef.current = true
  }, [isIntegrated, availableSquads])

  // Build squad summaries from the current sprint's features, grouped by squadId.
  // Each suite in an "integrado" sprint represents a participating squad.
  const sprintSquads = useMemo(() => {
    if (!isIntegrated) return []

    // Group features by squadId
    const squadMap = new Map<string, { featureCount: number; testCount: number }>()
    for (const f of state.features) {
      if (!f.squadId) continue
      const existing = squadMap.get(f.squadId)
      const testCount = f.cases?.length ?? 0
      if (existing) {
        existing.featureCount++
        existing.testCount += testCount
      } else {
        squadMap.set(f.squadId, { featureCount: 1, testCount })
      }
    }

    // Merge with availableSquads for names
    const squadNameMap = new Map(availableSquads.map((s) => [s.id, s.name]))

    return Array.from(squadMap.entries()).map(([squadId, data]) => ({
      squadId,
      squadName: squadNameMap.get(squadId) ?? 'Squad desconhecido',
      featureCount: data.featureCount,
      testCount: data.testCount,
    }))
  }, [isIntegrated, state.features, availableSquads])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>Carregando…</span>
      </div>
    )
  }

  return (
    <div id="sprint-dashboard" style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Integrated Sprint: Squads Participantes */}
      {isIntegrated && (
        <IntegratedSquadsPanel
          releaseId={sprintEntry!.releaseId!}
          sprintSquads={sprintSquads}
        />
      )}

      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Abas da Sprint"
        style={{
          display: 'flex',
          gap: 2,
          marginBottom: 20,
          borderBottom: '1px solid var(--color-border)',
          overflowX: 'auto',
          paddingBottom: 0,
          flexShrink: 0,
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.Icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              data-testid={`sprint-tab-${tab.id}`}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '8px 12px',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid var(--color-blue)' : '2px solid transparent',
                color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                fontWeight: active ? 600 : 500,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-family-sans)',
                marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {/* OverviewTab sempre montado para permitir exportação independente da aba ativa */}
      <div
        id="overview-tab-content"
        aria-hidden={activeTab !== 'overview'}
        style={activeTab !== 'overview' ? { position: 'absolute', left: '-9999px', top: '-9999px', width: 1200 } : {}}
      >
        <OverviewTab />
      </div>
      {activeTab === 'config'     && <ConfigTab />}
      {activeTab === 'features'   && <FeaturesTab isIntegrated={isIntegrated} availableSquads={isIntegrated ? availableSquads : undefined} />}
      {activeTab === 'bugs'       && <BugsTab />}
      {activeTab === 'blockers'   && <BlockersTab />}
      {activeTab === 'alignments' && <AlignmentsTab />}
      {activeTab === 'notes'      && <NotesTab />}
      {activeTab === 'report'     && <ReportTab />}
    </div>
  )
}
