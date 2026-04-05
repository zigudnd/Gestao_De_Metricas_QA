import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStatusReportStore } from '../store/statusReportStore'
import { computeAllDates } from '../services/dateEngine'
import { exportStatusReportToImage } from '../services/statusReportExport'
import type { SectionId } from '../types/statusReport.types'

import { ReportDashboard } from '../components/ReportDashboard'
import { SectionCard } from '../components/SectionCard'
import { ItemFormModal } from '../components/ItemFormModal'
import { ItemDetailPanel } from '../components/ItemDetailPanel'
import { ReportPreview, generateClipboardText } from '../components/ReportPreview'
import { GanttView } from '../components/GanttView'
import { SectionManager } from '../components/SectionManager'
import { showToast } from '@/app/components/Toast'

function formatPeriod(start: string, end: string): string {
  if (!start && !end) return ''
  const fmt = (iso: string) => {
    if (!iso) return ''
    const [, m, d] = iso.split('-')
    return `${d}/${m}`
  }
  if (start && end) return `${fmt(start)} a ${fmt(end)}`
  if (start) return `${fmt(start)} a ...`
  return `... a ${fmt(end)}`
}

type TabId = 'editor' | 'preview' | 'gantt'

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'editor',  label: 'Editor',          icon: '✏️' },
  { id: 'preview', label: 'Preview Report',  icon: '📄' },
  { id: 'gantt',   label: 'Gantt',           icon: '📅' },
]

export function StatusReportPage() {
  const { reportId: urlReportId = '' } = useParams<{ reportId: string }>()
  const navigate = useNavigate()
  const {
    config, sections, items, isLoading, collapsedSections, currentTab,
    selectedItemId, isAddFormOpen,
    initReport, resetReport, updateConfig,
    addItem, updateItem, deleteItem, moveItemToSection,
    addDependency, removeDependency,
    addSection, updateSection, removeSection,
    toggleSection, setTab, setSelectedItem, setAddFormOpen,
  } = useStatusReportStore()

  const lastSyncedAt = useStatusReportStore((s) => s.lastSyncedAt)

  const [addFormSection, setAddFormSection] = useState<SectionId>('sprint')
  const [exporting, setExporting] = useState(false)
  const [showSectionManager, setShowSectionManager] = useState(false)

  useEffect(() => {
    if (!urlReportId) { navigate('/status-report'); return }
    initReport(urlReportId)
    return () => resetReport()
  }, [urlReportId]) // eslint-disable-line

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (selectedItemId) { setSelectedItem(null); return }
        if (isAddFormOpen) { setAddFormOpen(false); return }
        if (showSectionManager) { setShowSectionManager(false); return }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedItemId, isAddFormOpen, showSectionManager, setSelectedItem, setAddFormOpen])

  const computedDates = useMemo(() => computeAllDates(items), [items])

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId],
  )

  function handleCopyReport() {
    const text = generateClipboardText(config, sections, items)
    navigator.clipboard.writeText(text).then(() => {
      showToast('Relatório copiado para a área de transferência', 'success', { duration: 2500 })
    }).catch(() => {
      showToast('Erro ao copiar para a área de transferência', 'error')
    })
  }

  async function handleExportImage() {
    setExporting(true)
    try {
      await exportStatusReportToImage(config.title || 'status-report')
    } finally {
      setExporting(false)
    }
  }

  function openAddForm(sectionId: SectionId) {
    setAddFormSection(sectionId)
    setAddFormOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height: 200 }}>
        <span className="text-small">Carregando...</span>
      </div>
    )
  }

  return (
    <div className="mx-auto" style={{ maxWidth: 1200 }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => navigate('/status-report')}
          title="Voltar para lista"
          className="btn btn-ghost flex items-center justify-center"
          style={{ width: 32, height: 32, flexShrink: 0 }}
        >
          ←
        </button>
        <input
          value={config.title}
          onChange={(e) => updateConfig({ title: e.target.value })}
          placeholder="Título do Report"
          className="heading-lg flex-1"
          style={{
            border: 'none', background: 'transparent', outline: 'none',
            minWidth: 200, fontFamily: 'var(--font-family-sans)',
          }}
        />
        {/* Sync indicator */}
        <span className="text-small text-muted flex items-center gap-1" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
          {lastSyncedAt
            ? <>
                <span style={{ color: 'var(--color-green)', fontSize: 10 }}>●</span>
                Salvo {new Date(lastSyncedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </>
            : <>
                <span style={{ color: 'var(--color-amber-mid)', fontSize: 10 }}>●</span>
                Salvando...
              </>
          }
        </span>

        <div style={{ width: 1, height: 20, background: 'var(--color-border)', margin: '0 4px', flexShrink: 0 }} />

        <div className="flex items-center gap-1">
          <span className="text-small text-muted" style={{ whiteSpace: 'nowrap' }}>Período:</span>
          <input
            type="date" value={config.periodStart}
            max={config.periodEnd || undefined}
            onChange={(e) => {
              const start = e.target.value
              const end = config.periodEnd
              const period = formatPeriod(start, end)
              updateConfig({ periodStart: start, period })
            }}
            className="input-field"
            style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}
          />
          <span className="text-small text-muted">a</span>
          <input
            type="date" value={config.periodEnd}
            min={config.periodStart || undefined}
            onChange={(e) => {
              const end = e.target.value
              const start = config.periodStart
              const period = formatPeriod(start, end)
              updateConfig({ periodEnd: end, period })
            }}
            className="input-field"
            style={{ width: 'auto', padding: '5px 8px', fontSize: 12 }}
          />
        </div>
      </div>

      {/* Dashboard */}
      <ReportDashboard sections={sections} items={items} computedDates={computedDates} />

      {/* Tab navigation */}
      <div role="tablist" aria-label="Abas do Status Report" className="flex items-center gap-0.5 mb-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={currentTab === tab.id}
            onClick={() => setTab(tab.id)}
            className="flex items-center gap-1.5"
            style={{
              padding: '8px 14px', background: 'none', border: 'none',
              borderBottom: currentTab === tab.id ? '2px solid var(--color-blue)' : '2px solid transparent',
              color: currentTab === tab.id ? 'var(--color-blue-text)' : 'var(--color-text-2)',
              fontWeight: currentTab === tab.id ? 700 : 500,
              fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
              fontFamily: 'var(--font-family-sans)', marginBottom: -1,
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Action buttons */}
        {currentTab === 'preview' && (
          <>
            <button
              onClick={handleCopyReport}
              className="btn btn-primary btn-sm"
              style={{ marginBottom: 4 }}
            >
              Copiar relatório
            </button>
            <button
              onClick={handleExportImage}
              disabled={exporting}
              className="btn btn-outline btn-sm"
              style={{ marginBottom: 4, marginLeft: 4 }}
            >
              {exporting ? 'Gerando...' : 'Exportar JPG'}
            </button>
          </>
        )}
      </div>

      {/* Tab content */}
      {currentTab === 'editor' && (
        <div>
          <div className="flex justify-end mb-2">
            <button
              onClick={() => setShowSectionManager(true)}
              className="btn btn-outline btn-sm"
            >
              ⚙ Gerenciar seções
            </button>
          </div>
          {items.length === 0 && (
            <div className="text-center text-muted" style={{ padding: '48px 20px', fontSize: 14 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <p className="heading-sm" style={{ margin: '0 0 4px' }}>Nenhum item adicionado</p>
              <p className="text-body" style={{ margin: 0 }}>Clique em <strong>+ Adicionar item</strong> dentro de uma seção para começar.</p>
            </div>
          )}
          <div className="flex flex-col gap-4">
          {sections.map((sec) => (
            <SectionCard
              key={sec.id}
              section={sec}
              allSections={sections}
              items={items.filter((i) => i.section === sec.id)}
              computedDates={computedDates}
              isCollapsed={collapsedSections.has(sec.id)}
              onToggle={() => toggleSection(sec.id)}
              onItemClick={(id) => setSelectedItem(id)}
              onAddItem={() => openAddForm(sec.id)}
              onMoveItem={(id, target) => moveItemToSection(id, target)}
            />
          ))}
          </div>

          {/* Divider before section actions */}
          <div style={{ height: 1, background: 'var(--color-border)', margin: '8px 0 4px' }} />
        </div>
      )}

      {currentTab === 'preview' && (
        <ReportPreview config={config} sections={sections} items={items} />
      )}

      {currentTab === 'gantt' && (
        <GanttView
          sections={sections}
          items={items}
          computedDates={computedDates}
          onItemClick={(id) => setSelectedItem(id)}
        />
      )}

      {/* Detail panel */}
      {selectedItem && (
        <ItemDetailPanel
          item={selectedItem}
          computed={computedDates[selectedItem.id] ?? { start: '', end: '', isCycle: false, isLate: false }}
          sections={sections}
          allItems={items}
          onUpdate={updateItem}
          onDelete={(id) => {
            const deleted = items.find((i) => i.id === id)
            const snapshotItems = [...items]
            deleteItem(id)
            setSelectedItem(null)
            if (deleted) {
              showToast(`"${deleted.title}" excluído`, 'info', {
                duration: 5000,
                action: {
                  label: 'Desfazer',
                  onClick: () => {
                    const { _commit } = useStatusReportStore.getState()
                    _commit({ items: snapshotItems })
                  },
                },
              })
            }
          }}
          onAddDependency={addDependency}
          onRemoveDependency={removeDependency}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Add form modal */}
      {isAddFormOpen && (
        <ItemFormModal
          defaultSection={addFormSection}
          sections={sections}
          existingItems={items}
          onConfirm={(data) => { addItem(data); setAddFormOpen(false) }}
          onCancel={() => setAddFormOpen(false)}
        />
      )}

      {/* Section manager */}
      {showSectionManager && (
        <SectionManager
          sections={sections}
          onAdd={addSection}
          onUpdate={updateSection}
          onRemove={removeSection}
          onClose={() => setShowSectionManager(false)}
        />
      )}
    </div>
  )
}
