import { useRef, useState } from 'react'
import { useSprintStore } from '../../store/sprintStore'
import type { Feature, TestCase, TestCaseStatus, TestCaseComplexity } from '../../types/sprint.types'
import { parseFeatureText, parseCSVText } from '../../services/importService'
import { exportCoverage } from '../../services/exportService'
import { sprintDayToDate, dateToSprintDayKey } from '../../services/persistence'
import { ConfirmModal } from '@/app/components/ConfirmModal'
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
  Pendente: 'var(--color-blue)',
  Concluído: 'var(--color-green)',
  Falhou: 'var(--color-red)',
  Bloqueado: 'var(--color-yellow)',
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
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  border: `2px solid ${active ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                  background: active ? 'var(--color-blue)' : 'var(--color-bg)',
                  color: active ? '#fff' : 'var(--color-text-2)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
              >
                {suite.name || 'Suite'}
                <span style={{ fontSize: 10, opacity: 0.8 }}>{count}f</span>
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
          onAddFeature={() => addFeature(suite.id)}
        />
      ))}
    </div>
  )
}

// ─── SuiteAccordion ───────────────────────────────────────────────────────────

function SuiteAccordion({
  suiteId, suiteName, suiteIndex, onRename, onRemove, onAddFeature,
}: {
  suiteId: number
  suiteName: string
  suiteIndex: number
  onRename: (name: string) => void
  onRemove: () => void
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
          if (result.totalScenarios === 0) { alert('Nenhum cenário encontrado no arquivo.'); return }
          importFeatures(suiteId, result.features)
          alert(`✅ Importação concluída!\n\n${result.totalScenarios} cenário(s) em ${result.features.length} funcionalidade(s):\n\n${result.summary.join('\n')}`)
        } catch (err: unknown) {
          alert(String(err instanceof Error ? err.message : err))
        }
      }
      reader.readAsText(file)
    } else if (name.endsWith('.csv')) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        try {
          const result = parseCSVText(ev.target!.result as string, suiteId)
          importFeatures(suiteId, result.features)
          alert(`✅ Importação CSV concluída!\n\n${result.totalScenarios} cenário(s) importado(s).`)
        } catch (err: unknown) {
          alert(String(err instanceof Error ? err.message : err))
        }
      }
      reader.readAsText(file, 'UTF-8')
    } else {
      alert('Formato não suportado. Use: .feature ou .csv')
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
          <span style={{ fontSize: 11, background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
            🛑 {blockedCount} bloqueada(s)
          </span>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>
          {suiteFeatures.length} func. · {totalTests} testes · {totalExec} executados
        </span>

        <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => exportCoverage({ ...state, suites: [{ id: suiteId, name: suiteName }] })}
            style={iconBtn}
            title="Exportar cobertura desta suite (CSV)"
          >📊</button>
          <button
            onClick={() => { setNameVal(suiteName); setEditingName(true) }}
            style={iconBtn}
            title="Renomear suite"
          >✏️</button>
          <button onClick={() => setConfirmRemove(true)} style={{ ...iconBtn, color: 'var(--color-red)' }} title="Excluir suite">
            🗑
          </button>
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

  const statusBg = isBlocked ? '#fef2f2' : isCancelled ? '#f3f4f6' : undefined
  const statusBorder = isBlocked ? '#fecaca' : isCancelled ? '#d1d5db' : 'var(--color-border)'

  function handleMockupUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) { alert('Tipo de arquivo não permitido. Use PNG, JPG, WebP ou GIF.'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Imagem muito grande. Máximo 5MB.'); return }
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
          {isBlocked && <span>🛑</span>}
          {isCancelled && <span style={{ fontSize: 11, background: '#e5e7eb', color: '#6b7280', padding: '2px 7px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>Cancelada</span>}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', flexShrink: 0 }}>
          {feature.tests} Testes
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
            <div style={{ width: 150 }}>
              <label style={labelSm}>Carga Massiva (Qtd)</label>
              <input
                type="number"
                min={0}
                value={feature.manualTests || 0}
                onChange={(e) => updateFeature(featureIndex, 'manualTests', Number(e.target.value))}
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
                  ...inputSm,
                  fontWeight: 700,
                  color: isBlocked ? 'var(--color-red)' : isCancelled ? 'var(--color-text-2)' : 'var(--color-green)',
                }}
              >
                <option value="Ativa">🟢 Ativa</option>
                <option value="Bloqueada">🔴 Bloqueada</option>
                <option value="Cancelada">⛔ Cancelada</option>
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
            <button onClick={() => setConfirmRemove(true)} style={{ ...iconBtn, color: 'var(--color-red)', height: 36 }}>
              🗑 Excluir
            </button>
          </div>

          {/* Mockup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
            <label style={{ ...labelSm, flexShrink: 0, margin: 0 }}>📎 Imagem de Referência</label>
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
              <label style={{ fontSize: 12, color: 'var(--color-blue)', cursor: 'pointer', fontWeight: 600, background: '#eff6ff', border: '1px solid #bfdbfe', padding: '4px 12px', borderRadius: 6 }}>
                📸 Anexar Mockup
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
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border-md)', background: 'var(--color-bg)', color: 'var(--color-text)', fontFamily: 'var(--font-family-sans)' }}
            >
              <option value="Todos">👀 Todos</option>
              <option value="Pendente">⏳ Pendentes</option>
              <option value="Concluído">✅ Concluídos</option>
              <option value="Falhou">❌ Falharam</option>
              <option value="Bloqueado">🚧 Bloqueados</option>
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
              excludeWeekends={state.config.excludeWeekends ?? false}
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
          style={{ ...inputSm, width: 130 }}
        >
          <option value="Baixa">🟢 Baixa</option>
          <option value="Moderada">🟡 Moderada</option>
          <option value="Alta">🔴 Alta</option>
        </select>
        <select
          value={testCase.status}
          onChange={(e) => handleStatusChange(e.target.value as TestCaseStatus)}
          style={{
            ...inputSm,
            width: 140,
            color: STATUS_COLORS[testCase.status] ?? 'var(--color-text)',
            fontWeight: 700,
          }}
        >
          <option value="Pendente">⏳ Pendente</option>
          <option value="Concluído">✅ Concluído</option>
          <option value="Falhou">❌ Falhou</option>
          <option value="Bloqueado">🚧 Bloqueado</option>
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
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => duplicateTestCase(featureIndex, caseIndex)} style={iconBtn} title="Clonar">🔁</button>
          <button onClick={() => setConfirmRemove(true)} style={{ ...iconBtn, color: 'var(--color-red)' }} title="Remover">🗑️</button>
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
  fontWeight: 700,
  color: 'var(--color-text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
  marginBottom: 4,
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
  background: 'transparent',
  border: '1px solid var(--color-border-md)',
  borderRadius: 6,
  padding: '4px 8px',
  fontSize: 13,
  cursor: 'pointer',
  color: 'var(--color-text-2)',
  fontFamily: 'var(--font-family-sans)',
}
