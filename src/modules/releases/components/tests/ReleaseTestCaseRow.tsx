import { useState } from 'react'
import type { TestCase, TestCaseStatus, TestCaseComplexity } from '@/modules/sprints/types/sprint.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { ActionBtn, IconTrash } from '../shared/ActionBtn'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  Pendente: 'var(--color-text-3)',
  'Concluído': 'var(--color-green-mid)',
  Falhou: 'var(--color-red-mid)',
  Bloqueado: 'var(--color-amber-mid)',
}

const STATUS_TEXT_COLORS: Record<string, string> = {
  Pendente: 'var(--color-text-2)',
  'Concluído': 'var(--color-green)',
  Falhou: 'var(--color-red)',
  Bloqueado: 'var(--color-amber)',
}

const COMPLEXITY_COLORS: Record<string, string> = {
  Baixa: 'var(--color-green-mid)',
  Moderada: 'var(--color-amber-mid)',
  Alta: 'var(--color-red-mid)',
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  testCase: TestCase
  caseIndex: number
  featureName: string
  mockupImage: string
  onUpdate: (caseIndex: number, field: keyof TestCase, value: unknown) => void
  onRemove: (caseIndex: number) => void
  onBugRequest: (featureName: string, testCaseName: string) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleaseTestCaseRow({
  testCase, caseIndex, featureName, mockupImage,
  onUpdate, onRemove, onBugRequest,
}: Props) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [pendingFalhou, setPendingFalhou] = useState(false)
  const [blockModal, setBlockModal] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const borderColor = STATUS_COLORS[testCase.status] ?? 'var(--color-blue)'

  function handleStatusChange(newStatus: TestCaseStatus) {
    if (newStatus === 'Falhou') {
      setPendingFalhou(true)
    } else if (newStatus === 'Bloqueado') {
      setBlockReason(testCase.blockReason || '')
      setBlockModal(true)
    } else {
      onUpdate(caseIndex, 'status', newStatus)
      onUpdate(caseIndex, 'blockReason', '')
    }
  }

  function confirmFalhou() {
    onUpdate(caseIndex, 'status', 'Falhou')
    onBugRequest(featureName, testCase.name)
    setPendingFalhou(false)
  }

  function cancelFalhou() {
    setPendingFalhou(false)
  }

  function confirmBlock() {
    onUpdate(caseIndex, 'status', 'Bloqueado')
    onUpdate(caseIndex, 'blockReason', blockReason.trim())
    setBlockModal(false)
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
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 10 }}>
        <input
          type="text"
          value={testCase.name}
          onChange={(e) => onUpdate(caseIndex, 'name', e.target.value)}
          placeholder="Título do Caso de Teste"
          style={{ ...inputSm, flexGrow: 1, minWidth: 200, fontWeight: 600 }}
        />
        <select
          value={testCase.complexity}
          onChange={(e) => onUpdate(caseIndex, 'complexity', e.target.value as TestCaseComplexity)}
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
        <input
          type="text"
          value={testCase.executionDay}
          onChange={(e) => onUpdate(caseIndex, 'executionDay', e.target.value)}
          placeholder="Ex: D1, D2..."
          style={{ ...inputSm, width: 100 }}
          title="Dia de execução"
        />
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <ActionBtn onClick={() => setConfirmRemove(true)} title="Remover caso de teste" danger>
            <IconTrash />
          </ActionBtn>
        </div>
      </div>

      {/* Inline confirmation for "Falhou" status */}
      {pendingFalhou && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          marginBottom: 10,
          background: 'var(--color-red-light)',
          border: '1px solid var(--color-red-mid)',
          borderRadius: 8,
          fontSize: 13,
          color: 'var(--color-text)',
        }}>
          <span style={{ fontWeight: 600, flex: 1 }}>
            Marcar como falhou e criar bug para &quot;{testCase.name || 'Sem título'}&quot;?
          </span>
          <button
            onClick={confirmFalhou}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--color-red)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            Confirmar
          </button>
          <button
            onClick={cancelFalhou}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              border: '1px solid var(--color-border-md)',
              background: 'transparent',
              color: 'var(--color-text-2)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Block reason display when status is Bloqueado */}
      {testCase.status === 'Bloqueado' && testCase.blockReason && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          marginBottom: 10,
          background: 'var(--color-amber-light)',
          border: '1px solid var(--color-amber-mid)',
          borderRadius: 6,
          fontSize: 12,
          color: 'var(--color-text)',
        }}>
          <span style={{ fontWeight: 700, color: 'var(--color-amber)', textTransform: 'uppercase', fontSize: 10, letterSpacing: '0.5px' }}>
            Bloqueio:
          </span>
          <span style={{ flex: 1 }}>{testCase.blockReason}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <textarea
          value={testCase.gherkin}
          onChange={(e) => onUpdate(caseIndex, 'gherkin', e.target.value)}
          placeholder="Escreva o cenário em Gherkin..."
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
            <div style={{ fontSize: 10, color: 'var(--color-text-3)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Referência</div>
            <img src={mockupImage} alt="Mockup" style={{ width: '100%', borderRadius: 6, border: '1px solid var(--color-border)', objectFit: 'contain', maxHeight: 130, background: '#fff' }} />
          </div>
        )}
      </div>

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Caso de Teste"
          description={`Tem certeza que deseja excluir o caso "${testCase.name || 'Sem título'}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Caso"
          onConfirm={() => { onRemove(caseIndex); setConfirmRemove(false) }}
          onCancel={() => setConfirmRemove(false)}
        />
      )}

      {/* Block reason modal — same pattern as ReleaseFeatureRow */}
      {blockModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setBlockModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div role="dialog" aria-modal="true" aria-label="Bloquear Caso de Teste" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-amber)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>Bloquear Caso de Teste</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
              Informe o motivo do bloqueio de <strong>&quot;{testCase.name || 'Sem título'}&quot;</strong>.
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
                onClick={confirmBlock}
                style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--color-amber)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: blockReason.trim() ? 'pointer' : 'not-allowed', opacity: blockReason.trim() ? 1 : 0.5, fontFamily: 'var(--font-family-sans)' }}
              >
                Confirmar Bloqueio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
