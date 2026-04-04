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

const dateInputStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6,
  border: '1px solid var(--color-border-md)', fontSize: 12,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <span style={{ color: 'var(--color-text-2)', fontSize: 14 }}>Carregando...</span>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => navigate('/status-report')}
          title="Voltar para lista"
          style={{
            width: 32, height: 32, borderRadius: 7, border: 'none',
            background: 'var(--color-surface-2)', cursor: 'pointer',
            fontSize: 16, color: 'var(--color-text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          ←
        </button>
        <input
          value={config.title}
          onChange={(e) => updateConfig({ title: e.target.value })}
          placeholder="Título do Report"
          style={{
            fontSize: 18, fontWeight: 700, color: 'var(--color-text)',
            border: 'none', background: 'transparent', outline: 'none',
            minWidth: 200, flex: 1,
            fontFamily: 'var(--font-family-sans)',
          }}
        />
        {/* Sync indicator */}
        <span style={{
          fontSize: 11, color: 'var(--color-text-3)', fontWeight: 500,
          flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4,
        }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>Período:</span>
          <input
            type="date" value={config.periodStart}
            max={config.periodEnd || undefined}
            onChange={(e) => {
              const start = e.target.value
              const end = config.periodEnd
              const period = formatPeriod(start, end)
              updateConfig({ periodStart: start, period })
            }}
            style={dateInputStyle}
          />
          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>a</span>
          <input
            type="date" value={config.periodEnd}
            min={config.periodStart || undefined}
            onChange={(e) => {
              const end = e.target.value
              const start = config.periodStart
              const period = formatPeriod(start, end)
              updateConfig({ periodEnd: end, period })
            }}
            style={dateInputStyle}
          />
        </div>
      </div>

      {/* Dashboard */}
      <ReportDashboard sections={sections} items={items} computedDates={computedDates} />

      {/* Tab navigation */}
      <div role="tablist" aria-label="Abas do Status Report" style={{
        display: 'flex', gap: 2,
        marginBottom: 16,
        borderBottom: '1px solid var(--color-border)',
        alignItems: 'center',
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={currentTab === tab.id}
            onClick={() => setTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
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

        <div style={{ flex: 1 }} />

        {/* Action buttons */}
        {currentTab === 'preview' && (
          <>
            <button
              onClick={handleCopyReport}
              style={{
                padding: '6px 14px', borderRadius: 7, border: 'none',
                background: 'var(--color-blue)',
                color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
                marginBottom: 4, transition: 'background 0.2s',
              }}
            >
              Copiar relatório
            </button>
            <button
              onClick={handleExportImage}
              disabled={exporting}
              style={{
                padding: '6px 14px', borderRadius: 7,
                border: '1px solid var(--color-border-md)',
                background: 'transparent',
                color: exporting ? 'var(--color-text-3)' : 'var(--color-text-2)',
                fontSize: 12, fontWeight: 600,
                cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-family-sans)',
                marginBottom: 4, marginLeft: 4,
              }}
            >
              {exporting ? 'Gerando...' : 'Exportar JPG'}
            </button>
          </>
        )}
      </div>

      {/* Tab content */}
      {currentTab === 'editor' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={() => setShowSectionManager(true)}
              style={{
                padding: '5px 12px', borderRadius: 6,
                border: '1px solid var(--color-border-md)',
                background: 'transparent', color: 'var(--color-text-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
              }}
            >
              ⚙ Gerenciar seções
            </button>
          </div>
          {items.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              color: 'var(--color-text-3)', fontSize: 14,
            }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
              <p style={{ fontWeight: 600, color: 'var(--color-text-2)', margin: '0 0 4px' }}>Nenhum item adicionado</p>
              <p style={{ margin: 0, fontSize: 13 }}>Clique em <strong>+ Adicionar item</strong> dentro de uma seção para começar.</p>
            </div>
          )}
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
