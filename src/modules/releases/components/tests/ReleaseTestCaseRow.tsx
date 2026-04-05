import { useState } from 'react'
import type { TestCase, TestCaseStatus, TestCaseComplexity } from '@/modules/sprints/types/sprint.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'

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

  const borderColor = STATUS_COLORS[testCase.status] ?? 'var(--color-blue)'

  function handleStatusChange(newStatus: TestCaseStatus) {
    if (newStatus === 'Falhou') {
      onUpdate(caseIndex, 'status', 'Falhou')
      onBugRequest(featureName, testCase.name)
    } else {
      onUpdate(caseIndex, 'status', newStatus)
    }
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
      <div className="flex gap-2.5 flex-wrap items-start mb-2.5">
        <input
          type="text"
          value={testCase.name}
          onChange={(e) => onUpdate(caseIndex, 'name', e.target.value)}
          placeholder="Título do Caso de Teste"
          className="input-field"
          style={{ flexGrow: 1, minWidth: 200, fontWeight: 600 }}
        />
        <select
          value={testCase.complexity}
          onChange={(e) => onUpdate(caseIndex, 'complexity', e.target.value as TestCaseComplexity)}
          className="select-field"
          style={{
            width: 130,
            color: COMPLEXITY_COLORS[testCase.complexity] ?? 'var(--color-text-2)',
            fontWeight: 500, fontSize: 12,
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
          className="select-field"
          style={{
            width: 140,
            color: STATUS_TEXT_COLORS[testCase.status] ?? 'var(--color-text-2)',
            fontWeight: 500, fontSize: 12,
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
          className="input-field"
          style={{ width: 100 }}
          title="Dia de execução"
        />
        <div className="flex gap-0.5" style={{ flexShrink: 0 }}>
          <ActionBtn onClick={() => setConfirmRemove(true)} title="Remover caso de teste" danger>
            <IconTrash />
          </ActionBtn>
        </div>
      </div>

      <div className="flex gap-3 items-start">
        <textarea
          value={testCase.gherkin}
          onChange={(e) => onUpdate(caseIndex, 'gherkin', e.target.value)}
          placeholder="Escreva o cenário em Gherkin..."
          rows={4}
          className="textarea-field"
          style={{ fontFamily: 'var(--font-family-mono)', flex: 1, minWidth: 0 }}
        />
        {mockupImage && (
          <div style={{ flexShrink: 0, width: 'clamp(100px, 30%, 220px)' }}>
            <div className="section-label">Referência</div>
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
