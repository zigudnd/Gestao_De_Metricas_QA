import { useRef, useState } from 'react'
import { useSprintStore } from '../../store/sprintStore'
import type { Feature, TestCase, TestCaseStatus, TestCaseComplexity } from '../../types/sprint.types'
import { parseFeatureText, parseCSVText } from '../../services/importService'
import { exportCoverage, exportSuiteAsCSV } from '../../services/exportService'
import { sprintDayToDate, dateToSprintDayKey } from '../../services/persistence'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { showToast } from '@/app/components/Toast'
import { NewBugModal } from '@/app/components/NewBugModal'

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── SVG icon components ──────────────────────────────────────────────────────

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
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (danger ? 'var(--color-red-light)' : 'var(--color-bg)') : 'none',
        border: 'none',
        padding: 8,
        minWidth: 32,
        minHeight: 32,
        borderRadius: 8,
        cursor: 'pointer',
        color: hov && danger ? 'var(--color-red)' : 'var(--color-text-2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

// ─── FeaturesTab ─────────────────────────────────────────────────────────────

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Suite Filter + Management */}
      {suites.length >= 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
            Filtrar Suites:
          </span>
          {suites.map((suite) => {
            const active = activeSuiteFilter.size === 0 || activeSuiteFilter.has(String(suite.id))
            const count = state.features.filter((f) => String(f.suiteId) === String(suite.id)).length
            return (
              <button
                key={suite.id}
                onClick={() => toggleSuiteFilter(String(suite.id))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 20,
                  border: active ? '0.5px solid var(--color-blue-light)' : '0.5px solid var(--color-border)',
                  background: active ? 'var(--color-blue-light)' : 'var(--color-bg)',
                  color: active ? 'var(--color-blue)' : 'var(--color-text-2)',
                  fontWeight: 500, fontSize: 11, cursor: 'pointer',
                  transition: 'background 0.15s',
                  fontFamily: 'var(--font-family-sans)',
                }}
              >
                {suite.name || 'Suite'}
                <span style={{ fontSize: 11 }}>{count}f</span>
              </button>
            )
          })}
          {hasFilter && (
            <button onClick={clearSuiteFilter} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer' }}>
              ✕ Ver todas
            </button>
          )}
        </div>
      )}

      {/* Suite management */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={() => addSuite()} style={btnOutline}>
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

// ─── SuiteAccordion ───────────────────────────────────────────────────────────

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
          if (result.totalScenarios === 0) { showToast('Nenhum cenário encontrado no arquivo.', 'error'); return }
          importFeatures(suiteId, result.features)
          showToast(`${result.totalScenarios} cenário(s) importado(s) em ${result.features.length} funcionalidade(s)`, 'success')
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
          showToast(`${result.totalScenarios} cenário(s) importado(s) de CSV`, 'success')
        } catch (err: unknown) {
          showToast(String(err instanceof Error ? err.message : err), 'error')
        }
      }
      reader.readAsText(file, 'UTF-8')
    } else {
      showToast('Formato não suportado. Use: .feature ou .csv', 'error')
    }
    if (importInputRef.current) importInputRef.current.value = ''
  }

  const totalTests = suiteFeatures.reduce((a, { f }) => a + (f.tests || 0), 0)
  const totalExec = suiteFeatures.reduce((a, { f }) => a + (f.exec || 0), 0)
  const blockedCount = suiteFeatures.filter(({ f }) => f.status === 'Bloqueada').length

  return (
    <div style={{ background: 'var(--color-surface)', border: '2px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Suite header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
          background: 'var(--color-bg)', borderBottom: open ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ color: 'var(--color-blue)', fontWeight: 700, fontSize: 14 }}>{open ? '▾' : '▸'}</span>
        <span style={{ width: 4, height: 20, background: 'var(--color-blue)', borderRadius: 4, flexShrink: 0 }} />

        {editingName ? (
          <input
            autoFocus
            type="text"
            value={nameVal}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={() => { onRename(nameVal); setEditingName(false) }}
            onKeyDown={(e) => { if (e.key === 'Enter') { onRename(nameVal); setEditingName(false) } }}
            style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', border: '1px solid var(--color-border-md)', borderRadius: 6, padding: '2px 8px', fontFamily: 'var(--font-family-sans)', background: 'var(--color-surface)' }}
          />
        ) : (
          <strong style={{ fontSize: 15, color: 'var(--color-text)' }}>
            {suiteName || 'Suite sem nome'}
          </strong>
        )}

        {blockedCount > 0 && (
          <span style={{ fontSize: 10, fontWeight: 500, background: 'var(--color-red-light)', color: 'var(--color-red)', border: '0.5px solid var(--color-red-mid)', padding: '2px 8px', borderRadius: 10 }}>
            {blockedCount} {blockedCount === 1 ? 'bloqueada' : 'bloqueadas'}
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>
          {suiteFeatures.length} func. · {totalTests} testes · {totalExec} executados
        </span>

        <div style={{ display: 'flex', gap: 2 }} onClick={(e) => e.stopPropagation()}>
          <ActionBtn
            onClick={() => { const sFeatures = state.features.filter((f) => String(f.suiteId) === String(suiteId)); exportSuiteAsCSV(suiteName, sFeatures) }}
            title="Exportar casos desta suite para reimportação (CSV)"
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
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
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onAddFeature() }}
              style={{ flex: 1, padding: 12, border: '2px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
            >
              + Adicionar Funcionalidade
            </button>
            <label
              title="Importar .feature ou .csv"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 16px', border: '1px solid var(--color-border-md)', borderRadius: 8, background: 'var(--color-bg)', color: 'var(--color-text-2)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap' }}
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
          description={`Tem certeza que deseja excluir a suite "${suiteName || 'Sem nome'}" e todas as suas funcionalidades? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Suite"
          onConfirm={() => { onRemove(); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// ─── FeatureAccordion ─────────────────────────────────────────────────────────

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
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { showToast('Tipo de arquivo não permitido. Use PNG, JPG, WebP ou GIF.', 'error'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('Imagem muito grande. Máximo 5MB.', 'error'); return }
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
        style={{
          padding: '10px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: statusBg ?? 'var(--color-bg)',
          borderBottom: open ? `1px solid ${statusBorder}` : 'none',
          userSelect: 'none',
          gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
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
          {isCancelled && <span style={{ fontSize: 11, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', padding: '2px 7px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>Cancelada</span>}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Mini progress dots */}
          {cases.length > 0 && (
            <span style={{ display: 'flex', gap: 2 }}>
              {(() => {
                const done = cases.filter(c => c.status === 'Concluído').length
                const failed = cases.filter(c => c.status === 'Falhou').length
                const blocked = cases.filter(c => c.status === 'Bloqueado').length
                const pending = cases.length - done - failed - blocked
                return (
                  <>
                    {done > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-green)', background: 'var(--color-green-light)', padding: '1px 5px', borderRadius: 4 }}>{done}✓</span>}
                    {failed > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-red)', background: 'var(--color-red-light)', padding: '1px 5px', borderRadius: 4 }}>{failed}✗</span>}
                    {blocked > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-amber)', background: 'var(--color-amber-light)', padding: '1px 5px', borderRadius: 4 }}>{blocked}⊘</span>}
                    {pending > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--color-text-3)' }}>{pending}○</span>}
                  </>
                )
              })()}
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', flexShrink: 0 }}>
            {feature.tests} Testes
          </span>
        </span>
      </div>

      {/* Feature body */}
      {open && <div style={{ padding: '14px 16px' }}>
        {/* Feature settings */}
        <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flexGrow: 1, minWidth: 200 }}>
              <label style={labelSm}>Nome da Funcionalidade</label>
              <input
                type="text"
                value={feature.name}
                onChange={(e) => updateFeature(featureIndex, 'name', e.target.value)}
                placeholder="Ex: Tela de Login"
                style={inputSm}
              />
            </div>
            <div style={{ width: 160 }}>
              <label style={labelSm}>Status</label>
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
                style={{
                  ...selectSm,
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
                <label style={labelSm}>{isBlocked ? 'Motivo do Bloqueio' : 'Motivo do Cancelamento'}</label>
                <input
                  type="text"
                  value={feature.blockReason}
                  onChange={(e) => updateFeature(featureIndex, 'blockReason', e.target.value)}
                  placeholder="Descreva o motivo…"
                  style={inputSm}
                />
              </div>
            )}
            <ActionBtn onClick={() => setConfirmRemove(true)} title="Excluir funcionalidade" danger aria-label="Excluir funcionalidade">
              <IconTrash />
            </ActionBtn>
          </div>

          {/* Mockup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <label style={{ ...labelSm, flexShrink: 0, margin: 0 }}>Imagem de Referência</label>
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
                <button onClick={() => removeMockupImage(featureIndex)} style={{ fontSize: 12, color: 'var(--color-red)', background: 'transparent', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  🗑️ Remover
                </button>
              </>
            ) : (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--color-text-2)', cursor: 'pointer', fontWeight: 500, background: 'none', border: '0.5px solid var(--color-border)', padding: '5px 12px', borderRadius: 8, fontFamily: 'var(--font-family-sans)', transition: 'background 0.15s' }}>
                <IconAttach />
                Anexar Mockup
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleMockupUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Test cases */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Cenários Gherkin ({cases.length})
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>Filtrar:</label>
            <select
              value={activeFilter}
              onChange={(e) => updateFeature(featureIndex, 'activeFilter', e.target.value)}
              style={{
                fontSize: 12, padding: '4px 24px 4px 8px', borderRadius: 6,
                border: '1px solid var(--color-border-md)', background: 'var(--color-bg)',
                color: 'var(--color-text)', fontFamily: 'var(--font-family-sans)',
                cursor: 'pointer', appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
              }}
            >
              <option value="Todos">Todos</option>
              <option value="Pendente">Pendentes</option>
              <option value="Concluído">Concluídos</option>
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
          style={{ width: '100%', marginTop: 8, padding: '10px', border: '2px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
        >
          + Adicionar Caso de Teste
        </button>
      </div>}

      {blockModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setBlockModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-red)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>🛑 Bloquear Funcionalidade</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Informe o motivo do bloqueio de <strong>"{feature.name || 'Sem nome'}"</strong>. Este campo é obrigatório.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Motivo do Bloqueio *
              </label>
              <textarea
                autoFocus
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio…"
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Escape') setBlockModal(false) }}
                style={{ padding: '8px 10px', border: '1px solid var(--color-border-md)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family-sans)', resize: 'vertical', boxSizing: 'border-box', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setBlockModal(false)}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
              >
                Cancelar
              </button>
              <button
                disabled={!blockReason.trim()}
                onClick={() => {
                  updateFeature(featureIndex, 'status', 'Bloqueada')
                  updateFeature(featureIndex, 'blockReason', blockReason.trim())
                  setBlockModal(false)
                }}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--color-red)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: blockReason.trim() ? 'pointer' : 'not-allowed', opacity: blockReason.trim() ? 1 : 0.5, fontFamily: 'var(--font-family-sans)' }}
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setCancelModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid #6b7280', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>⛔ Cancelar Funcionalidade</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Registre o alinhamento técnico referente ao cancelamento de <strong>"{feature.name || 'Sem nome'}"</strong>.
              O registro ficará visível na aba <strong>Alinhamentos</strong>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Alinhamento Técnico *
              </label>
              <textarea
                autoFocus
                value={cancelAlignment}
                onChange={(e) => setCancelAlignment(e.target.value)}
                placeholder={`Ex: Funcionalidade "${feature.name || ''}" cancelada por decisão do PO em alinhamento com o time técnico…`}
                rows={4}
                onKeyDown={(e) => { if (e.key === 'Escape') setCancelModal(false) }}
                style={{ padding: '8px 10px', border: '1px solid var(--color-border-md)', borderRadius: 8, fontSize: 13, color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family-sans)', resize: 'vertical', boxSizing: 'border-box', width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setCancelModal(false)}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
              >
                Voltar
              </button>
              <button
                disabled={!cancelAlignment.trim()}
                onClick={() => {
                  updateFeature(featureIndex, 'status', 'Cancelada')
                  updateFeature(featureIndex, 'blockReason', cancelAlignment.trim())
                  addAlignmentFull(`[Cancelamento] ${feature.name || 'Funcionalidade'}: ${cancelAlignment.trim()}`)
                  setCancelModal(false)
                }}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#6b7280', color: '#fff', fontSize: 13, fontWeight: 600, cursor: cancelAlignment.trim() ? 'pointer' : 'not-allowed', opacity: cancelAlignment.trim() ? 1 : 0.5, fontFamily: 'var(--font-family-sans)' }}
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Funcionalidade"
          description={`Tem certeza que deseja excluir "${feature.name || 'Sem nome'}" e todos os seus casos de teste? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Funcionalidade"
          onConfirm={() => { removeFeature(featureIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// ─── TestCaseCard ─────────────────────────────────────────────────────────────

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
      // Atribuir data de execução automaticamente (o cenário foi executado e falhou)
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
        border: `1px solid var(--color-border)`,
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: 8,
        padding: '12px 14px',
        marginBottom: 8,
        opacity: testCase.status === 'Concluído' ? 0.85 : 1,
      }}
    >
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 10 }}>
        <input
          type="text"
          value={testCase.name}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'name', e.target.value)}
          placeholder="Título do Caso de Teste"
          style={{ ...inputSm, flexGrow: 1, minWidth: 200, fontWeight: 600 }}
        />
        <select
          value={testCase.complexity}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'complexity', e.target.value as TestCaseComplexity)}
          style={{
            ...selectSm,
            width: 130,
            color: COMPLEXITY_COLORS[testCase.complexity] ?? 'var(--color-text-2)',
            fontWeight: 500,
            fontSize: 12,
            border: '0.5px solid var(--color-border)',
            padding: '4px 24px 4px 10px',
          }}
        >
          <option value="Baixa">Baixa</option>
          <option value="Moderada">Moderada</option>
          <option value="Alta">Alta</option>
        </select>
        <select
          value={testCase.status}
          onChange={(e) => handleStatusChange(e.target.value as TestCaseStatus)}
          style={{
            ...selectSm,
            width: 140,
            color: STATUS_TEXT_COLORS[testCase.status] ?? 'var(--color-text-2)',
            fontWeight: 500,
            fontSize: 12,
            border: '0.5px solid var(--color-border)',
            padding: '4px 24px 4px 10px',
          }}
        >
          <option value="Pendente">Pendente</option>
          <option value="Concluído">Concluído</option>
          <option value="Falhou">Falhou</option>
          <option value="Bloqueado">Bloqueado</option>
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <input
            type="date"
            value={execDateVal}
            min={startDate || undefined}
            max={endDate || undefined}
            onChange={(e) => handleDateChange(e.target.value)}
            style={{ ...inputSm, width: 148 }}
            title={!startDate ? 'Configure a Data de Início para ativar' : 'Data de execução'}
          />
          {testCase.executionDay && (
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-blue)', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap' }}>
              {testCase.executionDay}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <ActionBtn onClick={() => duplicateTestCase(featureIndex, caseIndex)} title="Clonar caso de teste" aria-label="Clonar caso de teste"><IconClone /></ActionBtn>
          <ActionBtn onClick={() => setConfirmRemove(true)} title="Remover caso de teste" danger aria-label="Remover caso de teste"><IconTrash /></ActionBtn>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <textarea
          value={testCase.gherkin}
          onChange={(e) => updateTestCase(featureIndex, caseIndex, 'gherkin', e.target.value)}
          placeholder="Escreva o cenário em Gherkin…"
          rows={4}
          style={{
            fontFamily: 'var(--font-family-mono)',
            fontSize: 13,
            resize: 'vertical',
            flex: 1,
            minWidth: 0,
            border: '1px solid var(--color-border-md)',
            borderRadius: 6,
            padding: 10,
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            boxSizing: 'border-box',
          }}
        />
        {mockupImage && (
          <div style={{ flexShrink: 0, width: 'clamp(100px, 30%, 220px)' }}>
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>📎 Referência</div>
            <img src={mockupImage} alt="Mockup" style={{ width: '100%', borderRadius: 6, border: '1px solid var(--color-border)', objectFit: 'contain', maxHeight: 130, background: '#fff' }} />
          </div>
        )}
      </div>

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Caso de Teste"
          description={`Tem certeza que deseja excluir o caso "${testCase.name || 'Sem título'}"? Esta ação não pode ser desfeita.`}
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-green)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 380, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>✅ Data de Execução</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Informe a data em que o caso <strong>"{testCase.name || 'Sem título'}"</strong> foi executado.
            </div>
            <input
              type="date"
              value={concluindoDate}
              min={startDate || undefined}
              max={endDate || undefined}
              onChange={(e) => setConcluindoDate(e.target.value)}
              style={{ padding: '8px 10px', border: '1px solid var(--color-border-md)', borderRadius: 6, fontSize: 14, color: 'var(--color-text)', background: 'var(--color-bg)', fontFamily: 'var(--font-family-sans)' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConcluindoDate(null)}
                style={{ padding: '7px 18px', borderRadius: 8, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmConcluido}
                disabled={!concluindoDate}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: concluindoDate ? 'var(--color-green)' : 'var(--color-border)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: concluindoDate ? 'pointer' : 'default', fontFamily: 'var(--font-family-sans)' }}
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

// ─── Shared styles ────────────────────────────────────────────────────────────

const labelSm: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 500,
  color: 'var(--color-text-2)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: 6,
}

const inputSm: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  border: '1px solid var(--color-border-md)',
  borderRadius: 6,
  fontSize: 13,
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
  fontFamily: 'var(--font-family-sans)',
  boxSizing: 'border-box',
}

const selectSm: React.CSSProperties = {
  ...inputSm,
  padding: '6px 24px 6px 8px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

const btnOutline: React.CSSProperties = {
  padding: '6px 14px',
  background: 'transparent',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

const iconBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 6,
  borderRadius: 6,
  cursor: 'pointer',
  color: 'var(--color-text-2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}
