import { useState } from 'react'
import type { Feature, TestCase, TestCaseStatus } from '@/modules/sprints/types/sprint.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { ReleaseTestCaseRow } from './ReleaseTestCaseRow'

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  feature: Feature
  featureIndex: number
  isNonBlocking?: boolean
  onUpdate: (featureIndex: number, field: keyof Feature, value: unknown) => void
  onRemove: (featureIndex: number) => void
  onAddTestCase: (featureIndex: number) => void
  onUpdateTestCase: (featureIndex: number, caseIndex: number, field: keyof TestCase, value: unknown) => void
  onRemoveTestCase: (featureIndex: number, caseIndex: number) => void
  onBugRequest: (featureName: string, testCaseName: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleaseFeatureRow({
  feature, featureIndex, isNonBlocking = false,
  onUpdate, onRemove, onAddTestCase,
  onUpdateTestCase, onRemoveTestCase, onBugRequest,
}: Props) {
  const [open, setOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [blockModal, setBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const isBlocked = feature.status === 'Bloqueada'
  const isCancelled = feature.status === 'Cancelada'
  const cases = feature.cases ?? []
  const activeFilter = feature.activeFilter || 'Todos'

  const statusBg = isBlocked ? 'var(--color-red-light)' : isCancelled ? 'var(--color-surface-2)' : undefined
  const statusBorder = isBlocked ? 'var(--color-red-mid)' : isCancelled ? 'var(--color-border-md)' : 'var(--color-border)'

  // Bug count from parent (could be computed or passed; we keep it simple)
  const totalCases = cases.length
  const completedCases = cases.filter((c) => c.status === 'Concluído').length
  const failedCases = cases.filter((c) => c.status === 'Falhou').length

  return (
    <div
      style={{
        border: `1px solid ${statusBorder}`,
        borderRadius: 8,
        marginBottom: 10,
        background: statusBg ?? 'var(--color-surface)',
        opacity: isCancelled ? 0.75 : isNonBlocking ? 0.5 : 1,
        overflow: 'hidden',
      }}
    >
      {/* Feature header */}
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
          <span style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{open ? '▾' : '▸'}</span>
          <span
            style={{
              fontWeight: 600,
              color: isNonBlocking
                ? 'var(--color-text-3)'
                : isBlocked ? 'var(--color-red)' : isCancelled ? 'var(--color-text-2)' : 'var(--color-text)',
              fontSize: 14,
              textDecoration: isCancelled || isNonBlocking ? 'line-through' : 'none',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {feature.name || 'Funcionalidade sem nome'}
          </span>
          {isBlocked && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E24B4A', flexShrink: 0, display: 'inline-block' }} />}
          {isCancelled && <span style={{ fontSize: 11, background: 'var(--color-surface-2)', color: 'var(--color-text-2)', padding: '2px 7px', borderRadius: 10, fontWeight: 700, flexShrink: 0 }}>Cancelada</span>}
          {isNonBlocking && (
            <span style={{
              fontSize: 10, fontWeight: 700,
              padding: '2px 8px', borderRadius: 8,
              background: 'var(--color-amber-light)',
              color: 'var(--color-amber)',
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}>
              Nao impeditivo
            </span>
          )}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {failedCases > 0 && (
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-red)', background: 'var(--color-red-light)', padding: '2px 6px', borderRadius: 8 }}>
              {failedCases} falha{failedCases > 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)' }}>
            {completedCases}/{totalCases} Testes
          </span>
        </span>
      </div>

      {/* Feature body */}
      {open && (
        <div style={{ padding: '14px 16px' }}>
          {/* Feature settings */}
          <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 8, marginBottom: 16, border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flexGrow: 1, minWidth: 200 }}>
                <label style={labelSm}>Nome da Funcionalidade</label>
                <input
                  type="text"
                  value={feature.name}
                  onChange={(e) => onUpdate(featureIndex, 'name', e.target.value)}
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
                      setCancelReason('')
                      setCancelModal(true)
                    } else {
                      onUpdate(featureIndex, 'status', val)
                      if (val === 'Ativa') onUpdate(featureIndex, 'blockReason', '')
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
                    onChange={(e) => onUpdate(featureIndex, 'blockReason', e.target.value)}
                    placeholder="Descreva o motivo..."
                    style={inputSm}
                  />
                </div>
              )}
              <ActionBtn onClick={() => setConfirmRemove(true)} title="Excluir funcionalidade" danger>
                <IconTrash />
              </ActionBtn>
            </div>
          </div>

          {/* Test cases */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
              Cenarios Gherkin ({cases.length})
            </h4>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 600 }}>Filtrar:</label>
              <select
                value={activeFilter}
                onChange={(e) => onUpdate(featureIndex, 'activeFilter', e.target.value)}
                style={{
                  fontSize: 12, padding: '4px 24px 4px 8px', borderRadius: 6,
                  border: '1px solid var(--color-border-md)', background: 'var(--color-bg)',
                  color: 'var(--color-text)', fontFamily: 'var(--font-family-sans)',
                  cursor: 'pointer', appearance: 'none' as const,
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='5'%3E%3Cpath d='M0 0l4 5 4-5z' fill='%23999'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
                }}
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
            if (activeFilter !== 'Todos' && tc.status !== (activeFilter as TestCaseStatus)) return null
            return (
              <ReleaseTestCaseRow
                key={tc.id}
                testCase={tc}
                caseIndex={ci}
                featureName={feature.name || ''}
                mockupImage={feature.mockupImage}
                onUpdate={(cIdx, field, value) => onUpdateTestCase(featureIndex, cIdx, field, value)}
                onRemove={(cIdx) => onRemoveTestCase(featureIndex, cIdx)}
                onBugRequest={onBugRequest}
              />
            )
          })}

          <button
            onClick={() => onAddTestCase(featureIndex)}
            style={{ width: '100%', marginTop: 8, padding: '10px', border: '2px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
          >
            + Adicionar Caso de Teste
          </button>
        </div>
      )}

      {/* Block Modal */}
      {blockModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setBlockModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-red)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>Bloquear Funcionalidade</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Informe o motivo do bloqueio de <strong>&quot;{feature.name || 'Sem nome'}&quot;</strong>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Motivo do Bloqueio *
              </label>
              <textarea
                autoFocus
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio..."
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
                  onUpdate(featureIndex, 'status', 'Bloqueada')
                  onUpdate(featureIndex, 'blockReason', blockReason.trim())
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

      {/* Cancel Modal */}
      {cancelModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setCancelModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid #6b7280', borderRadius: 12, padding: 24, width: '100%', maxWidth: 460, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>Cancelar Funcionalidade</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Registre o motivo do cancelamento de <strong>&quot;{feature.name || 'Sem nome'}&quot;</strong>.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Motivo *
              </label>
              <textarea
                autoFocus
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento..."
                rows={3}
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
                disabled={!cancelReason.trim()}
                onClick={() => {
                  onUpdate(featureIndex, 'status', 'Cancelada')
                  onUpdate(featureIndex, 'blockReason', cancelReason.trim())
                  setCancelModal(false)
                }}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: '#6b7280', color: '#fff', fontSize: 13, fontWeight: 600, cursor: cancelReason.trim() ? 'pointer' : 'not-allowed', opacity: cancelReason.trim() ? 1 : 0.5, fontFamily: 'var(--font-family-sans)' }}
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
          description={`Tem certeza que deseja excluir "${feature.name || 'Sem nome'}" e todos os seus casos de teste? Esta acao nao pode ser desfeita.`}
          confirmLabel="Excluir Funcionalidade"
          onConfirm={() => { onRemove(featureIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}
    </div>
  )
}

// ─── Shared sub-components ──────────────────────────────────────────────────

function ActionBtn({ onClick, title, children, danger }: React.PropsWithChildren<{ onClick?: () => void; title?: string; danger?: boolean }>) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (danger ? 'var(--color-red-light)' : 'var(--color-bg)') : 'none',
        border: 'none',
        padding: 6,
        borderRadius: 6,
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

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 4h13M5 4V2h5v2M6 7v5M9 7v5M2 4l1 9a1 1 0 001 1h7a1 1 0 001-1l1-9"/>
    </svg>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
