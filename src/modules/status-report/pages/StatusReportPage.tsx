import { useEffect, useMemo, useRef, useState } from 'react'
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

// ─── Icons (SVG inline, Lucide paths) ────────────────────────────────────────

function Svg({ size = 14, children }: { size?: number; children: React.ReactNode }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}
function IconPencil({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>
}
function IconFileText({ size = 14 }: { size?: number }) {
  return <Svg size={size}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></Svg>
}
function IconCalendar({ size = 14 }: { size?: number }) {
  return <Svg size={size}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Svg>
}
function IconArrowLeft({ size = 14 }: { size?: number }) {
  return <Svg size={size}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></Svg>
}
function IconSettings({ size = 14 }: { size?: number }) {
  return (
    <Svg size={size}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </Svg>
  )
}
function IconClipboard({ size = 26 }: { size?: number }) {
  return <Svg size={size}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></Svg>
}
function IconPlus({ size = 14 }: { size?: number }) { return <Svg size={size}><path d="M12 5v14M5 12h14" /></Svg> }
function IconMoreHoriz({ size = 14 }: { size?: number }) {
  return <Svg size={size}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></Svg>
}
function IconCopyDoc({ size = 14 }: { size?: number }) {
  return <Svg size={size}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>
}
function IconImage({ size = 14 }: { size?: number }) {
  return <Svg size={size}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></Svg>
}

// ─── Dropdown hook ────────────────────────────────────────────────────────────

function useDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onClick)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])
  return { open, setOpen, ref }
}

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

const srMenuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 10px', width: '100%',
  fontSize: 13, fontWeight: 500,
  color: 'var(--color-text)',
  background: 'transparent', border: 'none', borderRadius: 6,
  cursor: 'pointer', textAlign: 'left',
  fontFamily: 'var(--font-family-sans)',
  transition: 'background 0.12s',
}

type TabId = 'editor' | 'preview' | 'gantt'

type TabIcon = React.ComponentType<{ size?: number }>
const TABS: { id: TabId; label: string; Icon: TabIcon }[] = [
  { id: 'editor',  label: 'Editor',          Icon: IconPencil },
  { id: 'preview', label: 'Preview Report',  Icon: IconFileText },
  { id: 'gantt',   label: 'Gantt',           Icon: IconCalendar },
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
  const moreActionsDrop = useDropdown()

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
      <style>{`
        .sr-edit-back-btn:hover { background: var(--color-bg); color: var(--color-text); }
        .sr-edit-kebab:hover { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border); }
        .sr-edit-menu-item { display: flex; align-items: center; gap: 10px; padding: 8px 10px; width: 100%; font-size: 13px; font-weight: 500; color: var(--color-text); background: transparent; border: none; border-radius: 6px; cursor: pointer; text-align: left; font-family: var(--font-family-sans); transition: background 0.12s; }
        .sr-edit-menu-item:hover:not(:disabled) { background: var(--color-bg); }
        .sr-edit-btn-outline:hover { background: var(--color-bg); color: var(--color-text); }
        .sr-edit-btn-outline-lg:hover { background: var(--color-bg); }
        .sr-edit-btn-primary:hover { background: var(--color-blue-text); }
      `}</style>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 16, flexWrap: 'wrap',
      }}>
        <button
          onClick={() => navigate('/status-report')}
          title="Voltar para lista"
          aria-label="Voltar para a lista de status reports"
          className="sr-edit-back-btn"
          style={{
            width: 32, height: 32, borderRadius: 7, border: 'none',
            background: 'var(--color-surface-2)', cursor: 'pointer',
            color: 'var(--color-text-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.12s, color 0.12s',
          }}
        >
          <IconArrowLeft />
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
          <span id="sr-period-label" style={{ fontSize: 11, color: 'var(--color-text-3)', whiteSpace: 'nowrap' }}>Período:</span>
          <input
            type="date" value={config.periodStart}
            max={config.periodEnd || undefined}
            onChange={(e) => {
              const start = e.target.value
              const end = config.periodEnd
              const period = formatPeriod(start, end)
              updateConfig({ periodStart: start, period })
            }}
            aria-label="Data de início do período"
            style={dateInputStyle}
          />
          <span aria-hidden="true" style={{ fontSize: 11, color: 'var(--color-text-3)' }}>a</span>
          <input
            type="date" value={config.periodEnd}
            min={config.periodStart || undefined}
            onChange={(e) => {
              const end = e.target.value
              const start = config.periodStart
              const period = formatPeriod(start, end)
              updateConfig({ periodEnd: end, period })
            }}
            aria-label="Data de fim do período"
            style={dateInputStyle}
          />
        </div>

        {/* Mais ações (kebab) — visível em todas as abas */}
        <div ref={moreActionsDrop.ref} style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => moreActionsDrop.setOpen((v) => !v)}
            aria-label="Mais ações do report"
            aria-haspopup="menu"
            aria-expanded={moreActionsDrop.open}
            title="Mais ações"
            className="sr-edit-kebab"
            style={{
              width: 32, height: 32, borderRadius: 7,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: 'var(--color-text-2)',
              border: '1px solid transparent',
              cursor: 'pointer',
              transition: 'background 0.12s, color 0.12s, border-color 0.12s',
            }}
          >
            <IconMoreHoriz />
          </button>
          {moreActionsDrop.open && (
            <div
              role="menu"
              aria-label="Ações do report"
              style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 10,
                boxShadow: '0 12px 32px rgba(17,24,39,.10), 0 2px 6px rgba(17,24,39,.05)',
                minWidth: 220, padding: 6,
                zIndex: 500,
              }}
            >
              <button
                role="menuitem"
                className="sr-edit-menu-item"
                onClick={() => { moreActionsDrop.setOpen(false); handleCopyReport() }}
                style={srMenuItemStyle}
              >
                <IconCopyDoc /> Copiar relatório
              </button>
              <button
                role="menuitem"
                className="sr-edit-menu-item"
                onClick={() => { moreActionsDrop.setOpen(false); handleExportImage() }}
                disabled={exporting}
                style={{ ...srMenuItemStyle, opacity: exporting ? 0.6 : 1, cursor: exporting ? 'not-allowed' : 'pointer' }}
              >
                <IconImage /> {exporting ? 'Gerando JPG...' : 'Exportar JPG'}
              </button>
            </div>
          )}
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
        {TABS.map((tab) => {
          const Icon = tab.Icon
          const active = currentTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(tab.id)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '8px 12px', background: 'none', border: 'none',
                borderBottom: active ? '2px solid var(--color-blue)' : '2px solid transparent',
                color: active ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                fontWeight: active ? 600 : 500,
                fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
                fontFamily: 'var(--font-family-sans)', marginBottom: -1,
                transition: 'color 0.15s',
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {currentTab === 'editor' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            <button
              onClick={() => setShowSectionManager(true)}
              aria-label="Gerenciar seções do report"
              className="sr-edit-btn-outline"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 7,
                border: '1px solid var(--color-border-md)',
                background: 'transparent', color: 'var(--color-text-2)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'var(--font-family-sans)',
                transition: 'background 0.12s, color 0.12s, border-color 0.12s',
              }}
            >
              <IconSettings /> Gerenciar seções
            </button>
          </div>
          {items.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '44px 20px',
                background: 'var(--color-surface)',
                border: '1px dashed var(--color-border-md)',
                borderRadius: 14,
                marginBottom: 16,
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
                <IconClipboard />
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--color-text)' }}>
                Nenhum item adicionado
              </h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                Adicione o primeiro item ao seu report ou ajuste as seções disponíveis.
              </p>
              <div style={{ display: 'inline-flex', gap: 8 }}>
                {sections.length > 0 && (
                  <button
                    onClick={() => openAddForm(sections[0].id)}
                    aria-label="Adicionar primeiro item"
                    className="sr-edit-btn-primary"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '8px 16px', borderRadius: 8,
                      background: 'var(--color-blue)', color: '#fff',
                      border: '1px solid var(--color-blue)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--font-family-sans)',
                      transition: 'background 0.12s',
                    }}
                  >
                    <IconPlus /> Adicionar item
                  </button>
                )}
                <button
                  onClick={() => setShowSectionManager(true)}
                  className="sr-edit-btn-outline-lg"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8,
                    background: 'var(--color-surface)', color: 'var(--color-text)',
                    border: '1px solid var(--color-border-md)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'var(--font-family-sans)',
                    transition: 'background 0.12s',
                  }}
                >
                  <IconSettings /> Configurar seções
                </button>
              </div>
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
