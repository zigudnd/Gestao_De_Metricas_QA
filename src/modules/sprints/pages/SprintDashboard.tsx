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

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview',    label: 'Resumo',          icon: '📊' },
  { id: 'report',      label: 'Daily Report',    icon: '📆' },
  { id: 'bugs',        label: 'Bugs',            icon: '🐞' },
  { id: 'features',    label: 'Testes',          icon: '🧪' },
  { id: 'blockers',    label: 'Blockers',        icon: '🚧' },
  { id: 'alignments',  label: 'Alinhamentos',    icon: '📋' },
  { id: 'notes',       label: 'Notas',           icon: '📝' },
  { id: 'config',      label: 'Configurações',   icon: '⚙️'  },
]

export function SprintDashboard() {
  const { sprintId = '' } = useParams<{ sprintId: string }>()
  const initSprint = useSprintStore((s) => s.initSprint)
  const state = useSprintStore((s) => s.state)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  useEffect(() => {
    if (!sprintId) return
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
    [sprintId, loading],
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
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-testid={`sprint-tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 14px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid var(--color-blue)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--color-blue-text)' : 'var(--color-text-2)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-family-sans)',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
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
