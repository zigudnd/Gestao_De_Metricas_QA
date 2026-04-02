import { useState } from 'react'
import type { Bug, BugStatus, BugSeverity } from '@/modules/sprints/types/sprint.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'

// ─── Constants ──────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, string> = {
  'Crítica': 'var(--color-red)',
  Alta: '#dc6b1e',
  'Média': 'var(--color-amber)',
  Baixa: 'var(--color-text-3)',
}

const STATUS_COLORS: Record<string, string> = {
  Aberto: 'var(--color-red)',
  'Em Andamento': 'var(--color-amber)',
  Falhou: 'var(--color-red)',
  Resolvido: 'var(--color-green)',
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface Props {
  bugs: Bug[]
  onAddBug: () => void
  onRemoveBug: (bugIndex: number) => void
  onUpdateBug: (bugIndex: number, field: keyof Bug, value: unknown) => void
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ReleaseBugsList({ bugs, onAddBug, onRemoveBug, onUpdateBug }: Props) {
  const [open, setOpen] = useState(true)
  const openBugs = bugs.filter((b) => b.status !== 'Resolvido').length

  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
          background: 'var(--color-bg)', borderBottom: open ? '1px solid var(--color-border)' : 'none',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ color: 'var(--color-red)', fontWeight: 700, fontSize: 14 }}>{open ? '▾' : '▸'}</span>
        <strong style={{ fontSize: 14, color: 'var(--color-text)' }}>
          Bugs ({bugs.length})
        </strong>
        {openBugs > 0 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-red)', background: 'var(--color-red-light)', padding: '2px 8px', borderRadius: 10 }}>
            {openBugs} aberto{openBugs > 1 ? 's' : ''}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          onClick={(e) => { e.stopPropagation(); onAddBug() }}
          style={{
            padding: '4px 12px', borderRadius: 6, border: '1px solid var(--color-border-md)',
            background: 'transparent', color: 'var(--color-text-2)',
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'var(--font-family-sans)',
          }}
        >
          + Bug
        </button>
      </div>

      {open && bugs.length > 0 && (
        <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {bugs.map((bug, idx) => (
            <BugRow
              key={bug.id}
              bug={bug}
              bugIndex={idx}
              onUpdate={onUpdateBug}
              onRemove={onRemoveBug}
            />
          ))}
        </div>
      )}

      {open && bugs.length === 0 && (
        <div style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-3)' }}>
          Nenhum bug registrado.
        </div>
      )}
    </div>
  )
}

// ─── BugRow ─────────────────────────────────────────────────────────────────

function BugRow({ bug, bugIndex, onUpdate, onRemove }: {
  bug: Bug
  bugIndex: number
  onUpdate: (bugIndex: number, field: keyof Bug, value: unknown) => void
  onRemove: (bugIndex: number) => void
}) {
  const [confirmRemove, setConfirmRemove] = useState(false)
  const sevColor = SEVERITY_COLORS[bug.severity] ?? 'var(--color-text-3)'
  const statusColor = STATUS_COLORS[bug.status] ?? 'var(--color-text-2)'

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderLeft: `4px solid ${sevColor}`,
      borderRadius: 8,
      padding: '10px 12px',
      background: bug.status === 'Resolvido' ? 'var(--color-bg)' : 'var(--color-surface)',
      opacity: bug.status === 'Resolvido' ? 0.75 : 1,
    }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <input
          type="text"
          value={bug.desc}
          onChange={(e) => onUpdate(bugIndex, 'desc', e.target.value)}
          placeholder="Descricao do bug"
          style={{ ...inputSm, flex: 1, minWidth: 180, fontWeight: 600 }}
        />
        <input
          type="text"
          value={bug.feature}
          onChange={(e) => onUpdate(bugIndex, 'feature', e.target.value)}
          placeholder="Funcionalidade"
          style={{ ...inputSm, width: 160 }}
        />
        <select
          value={bug.severity}
          onChange={(e) => onUpdate(bugIndex, 'severity', e.target.value as BugSeverity)}
          style={{ ...selectSm, width: 110, color: sevColor, fontWeight: 600 }}
        >
          <option value="Crítica">Critica</option>
          <option value="Alta">Alta</option>
          <option value="Média">Media</option>
          <option value="Baixa">Baixa</option>
        </select>
        <select
          value={bug.status}
          onChange={(e) => onUpdate(bugIndex, 'status', e.target.value as BugStatus)}
          style={{ ...selectSm, width: 130, color: statusColor, fontWeight: 600 }}
        >
          <option value="Aberto">Aberto</option>
          <option value="Em Andamento">Em Andamento</option>
          <option value="Falhou">Falhou</option>
          <option value="Resolvido">Resolvido</option>
        </select>
        <input
          type="text"
          value={bug.assignee}
          onChange={(e) => onUpdate(bugIndex, 'assignee', e.target.value)}
          placeholder="Responsavel"
          style={{ ...inputSm, width: 130 }}
        />
        <ActionBtn onClick={() => setConfirmRemove(true)} title="Remover bug" danger>
          <IconTrash />
        </ActionBtn>
      </div>

      {confirmRemove && (
        <ConfirmModal
          title="Excluir Bug"
          description={`Tem certeza que deseja excluir "${bug.desc || 'Sem descricao'}"?`}
          confirmLabel="Excluir"
          onConfirm={() => { onRemove(bugIndex); setConfirmRemove(false) }}
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
