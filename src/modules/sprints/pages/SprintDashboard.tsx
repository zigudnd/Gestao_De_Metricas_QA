import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useSprintStore } from '../store/sprintStore'
import { loadFromStorage, loadFromServer, DEFAULT_STATE } from '../services/persistence'
import { OverviewTab } from '../components/dashboard/OverviewTab'
import { ConfigTab } from '../components/dashboard/ConfigTab'
import { FeaturesTab } from '../components/dashboard/FeaturesTab'
import { BugsTab } from '../components/dashboard/BugsTab'
import { BlockersTab } from '../components/dashboard/BlockersTab'
import { AlignmentsTab } from '../components/dashboard/AlignmentsTab'
import { NotesTab } from '../components/dashboard/NotesTab'
import { ReportTab } from '../components/dashboard/ReportTab'

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
      if (!cancelled) initSprint(sprintId, raw ?? JSON.parse(JSON.stringify(DEFAULT_STATE)))
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [sprintId, initSprint])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>Carregando…</span>
      </div>
    )
  }

  return (
    <div id="sprint-dashboard" style={{ maxWidth: 1200, margin: '0 auto' }}>
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
        style={activeTab !== 'overview' ? { position: 'absolute', left: '-9999px', top: '-9999px', width: 1200 } : {}}
      >
        <OverviewTab />
      </div>
      {activeTab === 'config'     && <ConfigTab />}
      {activeTab === 'features'   && <FeaturesTab />}
      {activeTab === 'bugs'       && <BugsTab />}
      {activeTab === 'blockers'   && <BlockersTab />}
      {activeTab === 'alignments' && <AlignmentsTab />}
      {activeTab === 'notes'      && <NotesTab />}
      {activeTab === 'report'     && <ReportTab />}
    </div>
  )
}
