import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSprintStore } from '../../store/sprintStore'
import type { Feature, TestCase, TestCaseStatus, TestCaseComplexity } from '../../types/sprint.types'
import { parseFeatureText, parseCSVText } from '../../services/importService'
import { exportCoverage, exportSuiteAsCSV } from '../../services/exportService'
import { sprintDayToDate, dateToSprintDayKey } from '../../services/persistence'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { NewBugModal } from '@/app/components/NewBugModal'

// --- Helpers ---

function dayKeyToDate(dayKey: string, startDate: string, excludeWeekends: boolean): string {
  if (!dayKey || !startDate) return ''
  const n = parseInt(dayKey.replace('D', ''))
  if (isNaN(n) || n < 1) return ''
  return sprintDayToDate(startDate, n, excludeWeekends).toISOString().split('T')[0]
}

function dateToDayKey(dateStr: string, startDate: string, sprintDays: number, excludeWeekends: boolean): string | null {
  if (!dateStr || !startDate) return null
  return dateToSprintDayKey(dateStr, startDate, sprintDays, excludeWeekends)
}

const STATUS_COLORS: Record<string, string> = {
  Pendente: 'var(--color-text-3)',
  Concluído: 'var(--color-green-mid)',
  Falhou: 'var(--color-red-mid)',
  Bloqueado: 'var(--color-amber-mid)',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  Pendente: 'var(--color-text-2)',
  Concluído: 'var(--color-green)',
  Falhou: 'var(--color-red)',
  Bloqueado: 'var(--color-amber)',
}

const COMPLEXITY_COLORS: Record<string, string> = {
  Baixa: 'var(--color-green-mid)',
  Moderada: 'var(--color-amber-mid)',
  Alta: 'var(--color-red-mid)',
}

// --- SVG icon components ---

function IconExportCSV() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 11v1.5A1.5 1.5 0 003.5 14h8A1.5 1.5 0 0013 12.5V11"/><path d="M7.5 1v8m0 0L5 6.5m2.5 2.5L10 6.5"/>
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="8" width="3" height="6" rx="1"/><rect x="6" y="4" width="3" height="10" rx="1"/><rect x="11" y="1" width="3" height="13" rx="1"/>
    </svg>
  )
}

function IconEdit() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.5 2.5l2 2L5 12H3v-2L10.5 2.5z"/>
    </svg>
  )
}

function IconDuplicate() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10H2a1 1 0 01-1-1V2a1 1 0 011-1h7a1 1 0 011 1v1"/>
    </svg>
  )
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4h13M5 4V2h5v2M6 7v5M9 7v5M2 4l1 9a1 1 0 001 1h7a1 1 0 001-1l1-9"/>
    </svg>
  )
}

function IconClone() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="9" height="9" rx="1.5"/><path d="M3 10H2a1 1 0 01-1-1V2a1 1 0 011-1h7a1 1 0 011 1v1"/>
    </svg>
  )
}

function IconAttach() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5L6.5 12A3.5 3.5 0 011.5 7L7 1.5A2 2 0 0110 4.5L5 9.5A.5.5 0 014 9l4.5-4.5"/>
    </svg>
  )
}

// Ghost action button with hover
function ActionBtn({ onClick, title, children, danger, 'aria-label': ariaLabel }: React.PropsWithChildren<{ onClick?: () => void; title?: string; danger?: boolean; 'aria-label'?: string }>) {
  return (
    <>
      <button
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        className={`btn-ghost shrink-0 ${danger ? 'feat-action-btn-danger' : 'feat-action-btn'}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 32, padding: 8 }}
      >
        {children}
      </button>
      <style>{`
        .feat-action-btn:hover { background: var(--color-bg) !important; }
        .feat-action-btn-danger:hover { background: var(--color-red-light) !important; color: var(--color-red) !important; }
      `}</style>
    </>
  )
}

// --- FeaturesTab ---

export function FeaturesTab() {
  const state = useSprintStore((s) => s.state)
  const toggleSuiteFilter = useSprintStore((s) => s.toggleSuiteFilter)
  const clearSuiteFilter = useSprintStore((s) => s.clearSuiteFilter)
  const activeSuiteFilter = useSprintStore((s) => s.activeSuiteFilter)
  const addSuite = useSprintStore((s) => s.addSuite)
  const updateSuite = useSprintStore((s) => s.updateSuite)
  const removeSuite = useSprintStore((s) => s.removeSuite)
  const duplicateSuite = useSprintStore((s) => s.duplicateSuite)
  const addFeature = useSprintStore((s) => s.addFeature)

  const suites = state.suites ?? []
  const hasFilter = activeSuiteFilter.size > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Suite Filter + Management */}
      {suites.length >= 2 && (
        <div className="card-sm flex items-center gap-2 flex-wrap">
          <span className="section-label shrink-0" style={{ marginBottom: 0 }}>
            Filtrar Suites:
          </span>
          {suites.map((suite) => {
            const active = activeSuiteFilter.size === 0 || activeSuiteFilter.has(String(suite.id))
            const count = state.features.filter((f) => String(f.suiteId) === String(suite.id)).length
            return (
              <button
                key={suite.id}
                onClick={() => toggleSuiteFilter(String(suite.id))}
                className={active ? 'badge badge-blue' : 'badge badge-neutral'}
                style={{ cursor: 'pointer', padding: '3px 10px', borderRadius: 20, fontFamily: 'var(--font-family-sans)' }}
              >
                {suite.name || 'Suite'}
                <span style={{ fontSize: 11 }}>{count}f</span>
              </button>
            )
          })}
          {hasFilter && (
            <button onClick={clearSuiteFilter} className="btn btn-sm btn-outline" style={{ borderRadius: 10 }}>
              ✕ Ver todas
            </button>
          )}
        </div>
      )}

      {/* Suite management */}
      <div className="flex justify-end gap-2">
        <button onClick={() => addSuite()} className="btn btn-md btn-outline">
          + Nova Suite
        </button>
      </div>

      {/* Suites with features */}
      {suites.map((suite, sIndex) => (
        <SuiteAccordion
          key={suite.id}
          suiteId={suite.id}
          suiteName={suite.name}
          suiteIndex={sIndex}
          onRename={(name) => updateSuite(sIndex, 'name', name)}
          onRemove={() => removeSuite(sIndex)}
          onDuplicate={() => duplicateSuite(sIndex)}
          onAddFeature={() => addFeature(suite.id)}
        />
      ))}
    </div>
  )
}

// --- SuiteAccordion ---

function SuiteAccordion({
  suiteId, suiteName, suiteIndex, onRename, onRemove, onDuplicate, onAddFeature,
}: {
  suiteId: number
  suiteName: string
  suiteIndex: number
  onRename: (name: string) => void
  onRemove: () => void
  onDuplicate: () => void
  onAddFeature: () => void
}) {
  const [open, setOpen] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [nameVal, setNameVal] = useState(suiteName)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const state = useSprintStore((s) => s.state)
  const activeSuiteFilter = useSprintStore((s) => s.activeSuiteFilter)
  const importFeatures = useSprintStore((s) => s.importFeatures)
  const reorderFeatures = useSprintStore((s) => s.reorderFeatures)
  const importInputRef = useRef<HTMLInputElement>(null)

  const suiteFeatures = state.features.map((f, i) => ({ f, i }))
    .filter(({ f }) => String(f.suiteId) === String(suiteId))

  // Apply suite filter
  const isVisible = activeSuiteFilter.size === 0 || activeSuiteFilter.has(String(suiteId))
  if (!isVisible) return null

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const name = file.name.toLowerCase()
    if (name.endsWith('.feature')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const result = parseFeatureText(ev.target!.result as string, suiteId)
          if (result.totalScenarios === 0) { showToast('Nenhum cenario encontrado no arquivo.', 'error'); return }
          importFeatures(suiteId, result.features)
          showToast(`${result.totalScenarios} cenario(s) importado(s) em ${result.features.length} funcionalidade(s)`, 'success')
        } catch (err: unknown) {
          showToast(String(err instanceof Error ? err.message : err), 'error')
        }
      }
      reader.readAsText(file)
    } else if (name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const result = parseCSVText(ev.target!.result as string, suiteId)
          importFeatures(suiteId, result.features)
          showToast(`${result.totalScenarios} cenario(s) importado(s) de CSV`, 'success')
        } catch (err: unknown) {
          showToast(String(err instanceof Error ? err.message : err), 'error')
        }
      }
      reader.readAsText(file, 'UTF-8')
    } else {
      showToast('Formato nao suportado. Use: .feature ou .csv', 'error')
    }
    if (importInputRef.current) importInputRef.current.value = ''
  }

  const totalTests = suiteFeatures.reduce((a, { f }) => a + (f.tests || 0), 0)
  const totalExec = suiteFeatures.reduce((a, { f }) => a + (f.exec || 0), 0)
  const blockedCount = suiteFeatures.filter(({ f }) => f.status === 'Bloqueada').length

  return (
    <div className="card" style={{ padding: 0, border: '2px solid var(--color-border)', overflow: 'hidden' }}>
      {/* Suite header */}
      <div
        className="flex items-center gap-2.5 flex-wrap cursor-pointer select-none"
        style={{ padding: '14px 20px', background: 'var(--color-bg)', borderBottom: open ? '1px solid var(--color-border)' : 'none' }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ color: 'var(--color-blue)', fontWeight: 700, fontSize: 14 }}>{open ? '▾' : '▸'}</span>
        <span className="shrink-0" style={{ width: 4, height: 20, background: 'var(--color-blue)', borderRadius: 4 }} />

        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameVal}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { onRename(nameVal); setEditingName(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onRename(nameVal); setEditingName(false) } }}
            className="input-field"
            style={{ fontSize: 15, fontWeight: 700, padding: '2px 8px', width: 'auto' }}
          />
        ) : (
          <strong style={{ fontSize: 15, color: 'var(--color-text)' }}>
            {suiteName || 'Suite sem nome'}
          </strong>
        )}

        {blockedCount > 0 && (
          <span className="badge badge-red">{blockedCount} {blockedCount === 1 ? 'bloqueada' : 'bloqueadas'}</span>
        )}

        <span className="ml-auto text-small" style={{ fontWeight: 600 }}>
          {suiteFeatures.length} func. · {totalTests} testes · {totalExec} executados
        </span>

        <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
          <ActionBtn
            onClick={() => { const sFeatures = state.features.filter((f) => String(f.suiteId) === String(suiteId)); exportSuiteAsCSV(suiteName, sFeatures) }}
            title="Exportar casos desta suite para reimportacao (CSV)"
            aria-label="Exportar CSV da suite"
          ><IconExportCSV /></ActionBtn>
          <ActionBtn
            onClick={() => exportCoverage({ ...state, suites: [{ id: suiteId, name: suiteName }] })}
            title="Exportar cobertura desta suite (CSV)"
            aria-label="Exportar cobertura da suite"
          ><IconChart /></ActionBtn>
          <ActionBtn
            onClick={() => { setNameVal(suiteName); setEditingName(true) }}
            title="Renomear suite"
            aria-label="Renomear suite"
          ><IconEdit /></ActionBtn>
          <ActionBtn onClick={onDuplicate} title="Duplicar suite (com todas as funcionalidades)" aria-label="Duplicar suite">
            <IconDuplicate />
          </ActionBtn>
          <ActionBtn onClick={() => setConfirmRemove(true)} title="Excluir suite" danger aria-label="Excluir suite">
            <IconTrash />
          </ActionBtn>
        </div>
      </div>

      {open && (
        <div style={{ padding: '16px 20px 20px' }}>
          {suiteFeatures.map(({ f, i }, domIdx) => (
            <div
              key={f.id}
              draggable
              onDragStart={(e) => { setDragIdx(domIdx); e.dataTransfer.effectAllowed = 'move' }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(domIdx) }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragIdx !== null && dragIdx !== domIdx) reorderFeatures(suiteId, dragIdx, domIdx)
                setDragIdx(null); setDragOverIdx(null)
              }}
              onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}
              style={{
                opacity: dragIdx === domIdx ? 0.4 : 1,
                outline: dragOverIdx === domIdx && dragIdx !== domIdx ? '2px dashed var(--color-blue)' : 'none',
                outlineOffset: 2,
                borderRadius: 8,
                transition: 'opacity 0.15s',
              }}
            >
              <div className="flex items-start gap-1">
                <div
                  title="Arraste para reordenar"
                  style={{ cursor: 'grab', color: 'var(--color-text-3)', fontSize: 16, padding: '12px 2px 0', flexShrink: 0, userSelect: 'none', lineHeight: 1 }}
                >
                  ⠿
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <FeatureAccordion feature={f} featureIndex={i} />
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2" style={{ marginTop: 10 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onAddFeature() }}
              className="btn btn-md flex-1"
              style={{ border: '2px dashed var(--color-border-md)', background: 'transparent', color: 'var(--color-blue)', fontWeight: 600, padding: 12 }}
            >
              + Adicionar Funcionalidade
            </button>
            <label
              title="Importar .feature ou .csv"
              className="btn btn-md flex items-center gap-1.5 cursor-pointer"
              style={{ border: '1px solid var(--color-border-md)', background: 'var(--color-bg)', color: 'var(--color-text-2)', fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              📥 Importar
              <input
                ref={importInputRef}
                type="file"
                accept=".feature,.csv"
                style={{ display: 'none' }}
                onChange={handleImport}
              />
            </label>
          </div>
        </div>
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Suite"
          description={`Tem certeza que deseja excluir a suite "${suiteName || 'Sem nome'}" e todas as suas funcionalidades? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir Suite"
          onConfirm={() => { onRemove(); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// --- FeatureAccordion ---

function FeatureAccordion({ feature, featureIndex }: { feature: Feature; featureIndex: number }) {
  const [open, setOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [blockModal, setBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelAlignment, setCancelAlignment] = useState('')
  const state = useSprintStore((s) => s.state)
  const updateFeature = useSprintStore((s) => s.updateFeature)
  const removeFeature = useSprintStore((s) => s.removeFeature)
  const addTestCase = useSprintStore((s) => s.addTestCase)
  const addAlignmentFull = useSprintStore((s) => s.addAlignmentFull)
  const setMockupImage = useSprintStore((s) => s.setMockupImage)
  const removeMockupImage = useSprintStore((s) => s.removeMockupImage)

  const isBlocked = feature.status === 'Bloqueada'
  const isCancelled = feature.status === 'Cancelada'
  const startDate = state.config.startDate || ''
  const cases = feature.cases ?? []
  const activeFilter = feature.activeFilter || 'Todos'

  const statusBg = isBlocked ? 'var(--color-red-light)' : isCancelled ? 'var(--color-surface-2)' : undefined
  const statusBorder = isBlocked ? 'var(--color-red-mid)' : isCancelled ? 'var(--color-border-md)' : 'var(--color-border)'

  function handleMockupUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { showToast('Tipo de arquivo nao permitido. Use PNG, JPG, WebP ou GIF.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Imagem muito grande. Maximo 5MB.', 'error'); return }
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) setMockupImage(featureIndex, ev.target.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div
      style={{
        border: `1px solid ${statusBorder}`,
        borderRadius: 8,
        marginBottom: 10,
        background: statusBg ?? 'var(--color-surface)',
        opacity: isCancelled ? 0.75 : 1,
        overflow: 'hidden',
      }}
    >
      <div
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between cursor-pointer select-none gap-2"
        style={{
          padding: '10px 14px',
          background: statusBg ?? 'var(--color-bg)',
          borderBottom: open ? `1px solid ${statusBorder}` : 'none',
        }}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{open ? '▾' : '▶'}</span>
          <span
            style={{
              fontWeight: 600,
              color: isBlocked ? 'var(--color-red)' : isCancelled ? 'var(--color-text-2)' : 'var(--color-text)',
              fontSize: 14,
              textDecoration: isCancelled ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {feature.name || 'Funcionalidade sem nome'}
          </span>
          {isBlocked && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-red-mid)', flexShrink: 0, display: 'inline-block' }} />}
          {isCancelled && <span className="badge badge-neutral" style={{ fontWeight: 700 }}>Cancelada</span>}
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {/* Mini progress dots */}
          {cases.length > 0 && (
            <span className="flex gap-0.5">
              {(() => {
                const done = cases.filter(c => c.status === 'Concluído').length
                const failed = cases.filter(c => c.status === 'Falhou').length
                const blocked = cases.filter(c => c.status === 'Bloqueado').length
                const pending = cases.length - done - failed - blocked
                return (
                  <>
                    {done > 0 && <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>{done}✓</span>}
                    {failed > 0 && <span className="badge badge-red" style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>{failed}✗</span>}
                    {blocked > 0 && <span className="badge badge-amber" style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px' }}>{blocked}⊘</span>}
                    {pending > 0 && <span className="text-muted" style={{ fontSize: 10, fontWeight: 600 }}>{pending}○</span>}
                  </>
                )
              })()}
            </span>
          )}
          <span className="text-small" style={{ fontWeight: 700, flexShrink: 0 }}>
            {feature.tests} Testes
          </span>
        </span>
      </div>

      {/* Feature body */}
      {open && <div style={{ padding: '14px 16px' }}>
        {/* Feature settings */}
        <div className="flex flex-col gap-3" style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid var(--color-border)' }}>
          <div className="flex gap-3.5 flex-wrap items-end">
            <div style={{ flexGrow: 1, minWidth: 200 }}>
              <label className="label-field">Nome da Funcionalidade</label>
              <input
                type="text"
                value={feature.name}
                onChange={(e) => updateFeature(featureIndex, 'name', e.target.value)}
                placeholder="Ex: Tela de Login"
                className="input-field"
                style={{ fontSize: 13, padding: '6px 8px' }}
              />
            </div>
            <div style={{ width: 160 }}>
              <label className="label-field">Status</label>
              <select
                value={feature.status}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === 'Bloqueada') {
                    setBlockReason('')
                    setBlockModal(true)
                  } else if (val === 'Cancelada') {
                    setCancelAlignment('')
                    setCancelModal(true)
                  } else {
                    updateFeature(featureIndex, 'status', val)
                    if (val === 'Ativa') updateFeature(featureIndex, 'blockReason', '')
                  }
                }}
                className="select-field"
                style={{
                  fontSize: 13, padding: '6px 24px 6px 8px',
                  fontWeight: 700,
                  color: isBlocked ? 'var(--color-red)' : isCancelled ? 'var(--color-text-2)' : 'var(--color-green)',
                }}
              >
                <option value="Ativa">Ativa</option>
                <option value="Bloqueada">Bloqueada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </div>
            {(isBlocked || isCancelled) && (
              <div style={{ flexGrow: 1, minWidth: 200 }}>
                <label className="label-field">{isBlocked ? 'Motivo do Bloqueio' : 'Motivo do Cancelamento'}</label>
                <input
                  type="text"
                  value={feature.blockReason}
                  onChange={(e) => updateFeature(featureIndex, 'blockReason', e.target.value)}
                  placeholder="Descreva o motivo…"
                  className="input-field"
                  style={{ fontSize: 13, padding: '6px 8px' }}
                />
              </div>
            )}
            <ActionBtn onClick={() => setConfirmRemove(true)} title="Excluir funcionalidade" danger aria-label="Excluir funcionalidade">
              <IconTrash />
            </ActionBtn>
          </div>

          {/* Mockup */}
          <div className="flex items-center gap-3 flex-wrap" style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <label className="label-field shrink-0" style={{ margin: 0 }}>Imagem de Referencia</label>
            {feature.mockupImage ? (
              <>
                <img
                  src={feature.mockupImage}
                  alt="Mockup"
                  style={{ height: 60, width: 'auto', maxWidth: 120, borderRadius: 6, border: '1px solid var(--color-border)', objectFit: 'contain', background: '#fff', cursor: 'zoom-in' }}
                />
                <label style={{ fontSize: 12, color: 'var(--color-blue)', cursor: 'pointer', fontWeight: 600 }}>
                  🔄 Substituir
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMockupUpload} />
                </label>
                <button onClick={() => removeMockupImage(featureIndex)} className="btn-ghost" style={{ fontSize: 12, color: 'var(--color-red)', fontWeight: 600 }}>
                  🗑️ Remover
                </button>
              </>
            ) : (
              <label className="btn btn-sm btn-outline flex items-center gap-1.5 cursor-pointer">
                <IconAttach />
                Anexar Mockup
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMockupUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Test cases */}
        <div className="flex justify-between items-center" style={{ marginBottom: 10 }}>
          <h4 className="heading-sm" style={{ margin: 0 }}>
            Cenarios Gherkin ({cases.length})
          </h4>
          <div className="flex items-center gap-2">
            <label className="text-small" style={{ fontWeight: 600 }}>Filtrar:</label>
            <select
              value={activeFilter}
              onChange={(e) => updateFeature(featureIndex, 'activeFilter', e.target.value)}
              className="select-field"
              style={{ fontSize: 12, padding: '4px 24px 4px 8px', width: 'auto' }}
            >
              <option value="Todos">Todos</option>
              <option value="Pendente">Pendentes</option>
              <option value="Concluído">Concluidos</option>
              <option value="Falhou">Falharam</option>
              <option value="Bloqueado">Bloqueados</option>
            </select>
          </div>
        </div>

        {cases.map((tc, ci) => {
          if (activeFilter !== 'Todos' && tc.status !== activeFilter) return null
          return (
            <TestCaseCard
              key={tc.id}
              testCase={tc}
              caseIndex={ci}
              featureIndex={featureIndex}
              featureName={feature.name || ''}
              startDate={startDate}
              endDate={state.config.endDate || ''}
              sprintDays={state.config.sprintDays || 20}
              excludeWeekends={state.config.excludeWeekends ?? true}
              mockupImage={feature.mockupImage}
            />
          )
        })}

        <button
          onClick={() => addTestCase(featureIndex)}
          className="btn btn-md w-full"
          style={{ marginTop: 8, border: '2px dashed var(--color-border-md)', background: 'transparent', color: 'var(--color-blue)', fontWeight: 600 }}
        >
          + Adicionar Caso de Teste
        </button>
      </div>}

      {blockModal && createPortal(
        <div
          onClick={(e) => e.target === e.currentTarget && setBlockModal(false)}
          className="modal-backdrop"
        >
          <div className="modal-container" style={{ maxWidth: 420, borderTop: '3px solid var(--color-red)' }}>
            <div className="heading-md">🛑 Bloquear Funcionalidade</div>
            <div className="text-body" style={{ lineHeight: 1.5 }}>
              Informe o motivo do bloqueio de <strong>"{feature.name || 'Sem nome'}"</strong>. Este campo e obrigatorio.
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="section-label">Motivo do Bloqueio *</label>
              <textarea
                autoFocus
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio…"
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Escape') setBlockModal(false) }}
                className="textarea-field"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBlockModal(false)} className="btn btn-md btn-outline">Cancelar</button>
              <button
                disabled={!blockReason.trim()}
                onClick={() => {
                  updateFeature(featureIndex, 'status', 'Bloqueada')
                  updateFeature(featureIndex, 'blockReason', blockReason.trim())
                  setBlockModal(false)
                }}
                className="btn btn-md btn-danger"
                style={{ opacity: blockReason.trim() ? 1 : 0.5, cursor: blockReason.trim() ? 'pointer' : 'not-allowed' }}
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {cancelModal && createPortal(
        <div
          onClick={(e) => e.target === e.currentTarget && setCancelModal(false)}
          className="modal-backdrop"
        >
          <div className="modal-container" style={{ maxWidth: 460, borderTop: '3px solid var(--color-text-3)' }}>
            <div className="heading-md">⛔ Cancelar Funcionalidade</div>
            <div className="text-body" style={{ lineHeight: 1.5 }}>
              Registre o alinhamento tecnico referente ao cancelamento de <strong>"{feature.name || 'Sem nome'}"</strong>.
              O registro ficara visivel na aba <strong>Alinhamentos</strong>.
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="section-label">Alinhamento Tecnico *</label>
              <textarea
                autoFocus
                value={cancelAlignment}
                onChange={(e) => setCancelAlignment(e.target.value)}
                placeholder={`Ex: Funcionalidade "${feature.name || ''}" cancelada por decisao do PO em alinhamento com o time tecnico…`}
                rows={4}
                onKeyDown={(e) => { if (e.key === 'Escape') setCancelModal(false) }}
                className="textarea-field"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCancelModal(false)} className="btn btn-md btn-outline">Voltar</button>
              <button
                disabled={!cancelAlignment.trim()}
                onClick={() => {
                  updateFeature(featureIndex, 'status', 'Cancelada')
                  updateFeature(featureIndex, 'blockReason', cancelAlignment.trim())
                  addAlignmentFull(`[Cancelamento] ${feature.name || 'Funcionalidade'}: ${cancelAlignment.trim()}`)
                  setCancelModal(false)
                }}
                className="btn btn-md"
                style={{ background: 'var(--color-text-3)', color: '#fff', fontWeight: 600, opacity: cancelAlignment.trim() ? 1 : 0.5, cursor: cancelAlignment.trim() ? 'pointer' : 'not-allowed' }}
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Funcionalidade"
          description={`Tem certeza que deseja excluir "${feature.name || 'Sem nome'}" e todos os seus casos de teste? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir Funcionalidade"
          onConfirm={() => { removeFeature(featureIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// --- TestCaseCard ---

function TestCaseCard({
  testCase, caseIndex, featureIndex, featureName, startDate, endDate, sprintDays, excludeWeekends, mockupImage,
}: {
  testCase: TestCase
  caseIndex: number
  featureIndex: number
  featureName: string
  startDate: string
  endDate: string
  sprintDays: number
  excludeWeekends: boolean
  mockupImage: string
}) {
  const updateTestCase = useSprintStore((s) => s.updateTestCase)
  const removeTestCase = useSprintStore((s) => s.removeTestCase)
  const duplicateTestCase = useSprintStore((s) => s.duplicateTestCase)
  const addBugFull = useSprintStore((s) => s.addBugFull)
  const state = useSprintStore((s) => s.state)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [concluindoDate, setConcluindoDate] = useState<string | null>(null)
  const [showBugModal, setShowBugModal] = useState(false)

  const featureNames = state.features.map((f) => f.name).filter(Boolean)
  const knownAssignees = Array.from(new Set(state.bugs.map((b) => b.assignee?.trim()).filter(Boolean) as string[]))
  const knownStacks = Array.from(new Set(state.bugs.map((b) => b.stack).filter(Boolean) as string[]))

  const borderColor = STATUS_COLORS[testCase.status] ?? 'var(--color-blue)'
  const execDateVal = testCase.executionDay && startDate
    ? dayKeyToDate(testCase.executionDay, startDate, excludeWeekends)
    : ''

  function handleDateChange(dateVal: string) {
    if (!dateVal) {
      updateTestCase(featureIndex, caseIndex, 'executionDay', '')
      return
    }
    const dayKey = dateToDayKey(dateVal, startDate, sprintDays, excludeWeekends)
    updateTestCase(featureIndex, caseIndex, 'executionDay', dayKey ?? '')
  }

  function handleStatusChange(newStatus: TestCaseStatus) {
    if (newStatus === 'Concluído') {
      const today = new Date().toISOString().split('T')[0]
      setConcluindoDate(execDateVal || today)
    } else if (newStatus === 'Falhou') {
      updateTestCase(featureIndex, caseIndex, 'status', 'Falhou')
      if (!testCase.executionDay) {
        const today = new Date().toISOString().split('T')[0]
        const dayKey = dateToDayKey(today, startDate, sprintDays, excludeWeekends)
        if (dayKey) updateTestCase(featureIndex, caseIndex, 'executionDay', dayKey)
      }
      setShowBugModal(true)
    } else {
      updateTestCase(featureIndex, caseIndex, 'status', newStatus)
    }
  }

  function confirmConcluido() {
    updateTestCase(featureIndex, caseIndex, 'status', 'Concluído')
    if (concluindoDate) {
      const dayKey = dateToDayKey(concluindoDate, startDate, sprintDays, excludeWeekends)
      updateTestCase(featureIndex, caseIndex, 'executionDay', dayKey ?? '')
    }
    setConcluindoDate(null)
  }

  return (
    <div
      style={{
        background: testCase.status === 'Concluído' ? 'var(--color-bg)' : 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 8,
        opacity: testCase.status === 'Concluído' ? 0.85 : 1,
      }}
    >
      <div className="flex gap-2.5 flex-wrap items-start" style={{ marginBottom: 10 }}>
        <input
          type="text"
          value={testCase.name}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'name', e.target.value)}
          placeholder="Titulo do Caso de Teste"
          className="input-field"
          style={{ flexGrow: 1, minWidth: 200, fontWeight: 600, fontSize: 13, padding: '6px 8px' }}
        />
        <select
          value={testCase.complexity}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'complexity', e.target.value as TestCaseComplexity)}
          className="select-field"
          style={{
            width: 130,
            color: COMPLEXITY_COLORS[testCase.complexity] ?? 'var(--color-text-2)',
            fontWeight: 500, fontSize: 12, padding: '4px 24px 4px 10px',
            border: '0.5px solid var(--color-border)',
          }}
        >
          <option value="Baixa">Baixa</option>
          <option value="Moderada">Moderada</option>
          <option value="Alta">Alta</option>
        </select>
        <select
          value={testCase.status}
          onChange={(e) => handleStatusChange(e.target.value as TestCaseStatus)}
          className="select-field"
          style={{
            width: 140,
            color: STATUS_TEXT_COLORS[testCase.status] ?? 'var(--color-text-2)',
            fontWeight: 500, fontSize: 12, padding: '4px 24px 4px 10px',
            border: '0.5px solid var(--color-border)',
          }}
        >
          <option value="Pendente">Pendente</option>
          <option value="Concluído">Concluido</option>
          <option value="Falhou">Falhou</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={execDateVal}
            min={startDate || undefined}
            max={endDate || undefined}
            onChange={(e) => handleDateChange(e.target.value)}
            className="input-field"
            style={{ width: 148, fontSize: 13, padding: '6px 8px' }}
            title={!startDate ? 'Configure a Data de Inicio para ativar' : 'Data de execucao'}
          />
          {testCase.executionDay && (
            <span className="badge badge-blue" style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              {testCase.executionDay}
            </span>
          )}
        </div>
        <div className="flex gap-0.5 shrink-0">
          <ActionBtn onClick={() => duplicateTestCase(featureIndex, caseIndex)} title="Clonar caso de teste" aria-label="Clonar caso de teste"><IconClone /></ActionBtn>
          <ActionBtn onClick={() => setConfirmRemove(true)} title="Remover caso de teste" danger aria-label="Remover caso de teste"><IconTrash /></ActionBtn>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <textarea
          value={testCase.gherkin}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'gherkin', e.target.value)}
          placeholder="Escreva o cenario em Gherkin…"
          rows={4}
          className="textarea-field"
          style={{ fontFamily: 'var(--font-family-mono)', flex: 1, minWidth: 0 }}
        />
        {mockupImage && (
          <div className="shrink-0" style={{ width: 'clamp(100px, 30%, 220px)' }}>
            <div className="section-label" style={{ fontSize: 10, marginBottom: 4 }}>📎 Referencia</div>
            <img src={mockupImage} alt="Mockup" style={{ width: '100%', borderRadius: 6, border: '1px solid var(--color-border)', objectFit: 'contain', maxHeight: 130, background: '#fff' }} />
          </div>
        )}
      </div>

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Caso de Teste"
          description={`Tem certeza que deseja excluir o caso "${testCase.name || 'Sem titulo'}"? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir Caso"
          onConfirm={() => { removeTestCase(featureIndex, caseIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}

      {showBugModal && (
        <NewBugModal
          featureNames={featureNames}
          assignees={knownAssignees}
          stacks={knownStacks}
          currentDate={state.currentDate}
          initialDraft={{ feature: featureName, desc: testCase.name ? `Falhou: ${testCase.name}` : '' }}
          onConfirm={(draft) => { addBugFull(draft); setShowBugModal(false) }}
          onCancel={() => setShowBugModal(false)}
        />
      )}

      {concluindoDate !== null && (
        <div
          onClick={(e) => e.target === e.currentTarget && setConcluindoDate(null)}
          className="modal-backdrop"
        >
          <div className="modal-container" style={{ maxWidth: 380, borderTop: '3px solid var(--color-green)' }}>
            <div className="heading-md">✅ Data de Execucao</div>
            <div className="text-body" style={{ lineHeight: 1.5 }}>
              Informe a data em que o caso <strong>"{testCase.name || 'Sem titulo'}"</strong> foi executado.
            </div>
            <input
              type="date"
              value={concluindoDate}
              min={startDate || undefined}
              max={endDate || undefined}
              onChange={(e) => setConcluindoDate(e.target.value)}
              className="input-field"
              style={{ fontSize: 14 }}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConcluindoDate(null)} className="btn btn-md btn-outline">Cancelar</button>
              <button
                onClick={confirmConcluido}
                disabled={!concluindoDate}
                className="btn btn-md btn-success"
                style={{ opacity: concluindoDate ? 1 : undefined, cursor: concluindoDate ? 'pointer' : 'default' }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
