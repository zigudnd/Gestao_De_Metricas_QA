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
        className="flex items-center justify-between gap-2"
        style={{
          padding: '10px 14px', cursor: 'pointer',
          background: statusBg ?? 'var(--color-bg)',
          borderBottom: open ? `1px solid ${statusBorder}` : 'none',
          userSelect: 'none',
        }}
      >
        <span className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <span style={{ fontSize: 14, color: 'var(--color-text-2)' }}>{open ? '▾' : '▸'}</span>
          <span
            style={{
              fontWeight: 600,
              color: isNonBlocking
                ? 'var(--color-text-3)'
                : isBlocked ? 'var(--color-red)' : isCancelled ? 'var(--color-text-2)' : 'var(--color-text)',
              fontSize: 14,
              textDecoration: isCancelled || isNonBlocking ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {feature.name || 'Funcionalidade sem nome'}
          </span>
          {isBlocked && <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-red-mid)', flexShrink: 0, display: 'inline-block' }} />}
          {isCancelled && <span className="badge badge-neutral" style={{ fontWeight: 700 }}>Cancelada</span>}
          {isNonBlocking && (
            <span className="badge badge-amber">
              Não impeditivo
            </span>
          )}
        </span>
        <span className="flex items-center gap-2" style={{ flexShrink: 0 }}>
          {failedCases > 0 && (
            <span className="badge badge-red">
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
          <div className="card-sm flex flex-col gap-3" style={{ background: 'var(--color-bg)', marginBottom: 16 }}>
            <div className="flex gap-3.5 flex-wrap items-end">
              <div style={{ flexGrow: 1, minWidth: 200 }}>
                <label className="section-label">Nome da Funcionalidade</label>
                <input
                  type="text"
                  value={feature.name}
                  onChange={(e) => onUpdate(featureIndex, 'name', e.target.value)}
                  placeholder="Ex: Tela de Login"
                  className="input-field"
                />
              </div>
              <div style={{ width: 160 }}>
                <label className="section-label">Status</label>
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
                  className="select-field"
                  style={{
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
                  <label className="section-label">{isBlocked ? 'Motivo do Bloqueio' : 'Motivo do Cancelamento'}</label>
                  <input
                    type="text"
                    value={feature.blockReason}
                    onChange={(e) => onUpdate(featureIndex, 'blockReason', e.target.value)}
                    placeholder="Descreva o motivo..."
                    className="input-field"
                  />
                </div>
              )}
              <ActionBtn onClick={() => setConfirmRemove(true)} title="Excluir funcionalidade" danger>
                <IconTrash />
              </ActionBtn>
            </div>
          </div>

          {/* Test cases */}
          <div className="flex justify-between items-center mb-2.5">
            <h4 className="heading-sm">
              Cenários Gherkin ({cases.length})
            </h4>
            <div className="flex items-center gap-2">
              <label className="text-small" style={{ fontWeight: 600 }}>Filtrar:</label>
              <select
                value={activeFilter}
                onChange={(e) => onUpdate(featureIndex, 'activeFilter', e.target.value)}
                className="select-field"
                style={{ fontSize: 12, padding: '4px 24px 4px 8px', width: 'auto' }}
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
            style={{ width: '100%', marginTop: 8, padding: 10, border: '2px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-blue)', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
          >
            + Adicionar Caso de Teste
          </button>
        </div>
      )}

      {/* Block Modal */}
      {blockModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setBlockModal(false)}
          className="modal-backdrop"
        >
          <div className="modal-container modal-sm" style={{ borderTop: '3px solid var(--color-red)', gap: 16 }}>
            <div className="heading-sm">Bloquear Funcionalidade</div>
            <div className="text-body">
              Informe o motivo do bloqueio de <strong>&quot;{feature.name || 'Sem nome'}&quot;</strong>.
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="section-label">
                Motivo do Bloqueio *
              </label>
              <textarea
                autoFocus
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio..."
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Escape') setBlockModal(false) }}
                className="textarea-field"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setBlockModal(false)} className="btn btn-md btn-outline">
                Cancelar
              </button>
              <button
                disabled={!blockReason.trim()}
                onClick={() => {
                  onUpdate(featureIndex, 'status', 'Bloqueada')
                  onUpdate(featureIndex, 'blockReason', blockReason.trim())
                  setBlockModal(false)
                }}
                className="btn btn-md btn-danger"
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
          className="modal-backdrop"
        >
          <div className="modal-container modal-md" style={{ borderTop: '3px solid var(--color-text-3)', gap: 16 }}>
            <div className="heading-sm">Cancelar Funcionalidade</div>
            <div className="text-body">
              Registre o motivo do cancelamento de <strong>&quot;{feature.name || 'Sem nome'}&quot;</strong>.
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="section-label">
                Motivo *
              </label>
              <textarea
                autoFocus
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Motivo do cancelamento..."
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Escape') setCancelModal(false) }}
                className="textarea-field"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCancelModal(false)} className="btn btn-md btn-outline">
                Voltar
              </button>
              <button
                disabled={!cancelReason.trim()}
                onClick={() => {
                  onUpdate(featureIndex, 'status', 'Cancelada')
                  onUpdate(featureIndex, 'blockReason', cancelReason.trim())
                  setCancelModal(false)
                }}
                className="btn btn-md"
                style={{ background: 'var(--color-text-3)', color: '#fff' }}
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
      aria-label={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (danger ? 'var(--color-red-light)' : 'var(--color-bg)') : 'none',
        border: 'none', padding: 6, borderRadius: 6, cursor: 'pointer',
        color: hov && danger ? 'var(--color-red)' : 'var(--color-text-2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s', flexShrink: 0,
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
