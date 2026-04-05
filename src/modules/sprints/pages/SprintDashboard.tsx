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
      if (!cancelled) initSprint(sprintId, raw ?? structuredClone(DEFAULT_STATE))
      if (!cancelled) setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [sprintId, initSprint])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[200px]">
        <span className="text-[var(--color-text-2)] text-sm">Carregando…</span>
      </div>
    )
  }

  return (
    <div id="sprint-dashboard" className="max-w-[1200px] mx-auto">
      {/* Tab Navigation */}
      <div
        role="tablist"
        aria-label="Abas da Sprint"
        className="flex gap-0.5 mb-5 border-b border-[var(--color-border)] overflow-x-auto shrink-0"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-testid={`sprint-tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 bg-none border-none cursor-pointer whitespace-nowrap text-[13px] -mb-px transition-colors duration-150 ${
              activeTab === tab.id
                ? 'border-b-2 border-b-[var(--color-blue)] text-[var(--color-blue-text)] font-bold'
                : 'border-b-2 border-b-transparent text-[var(--color-text-2)] font-medium'
            }`}
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
