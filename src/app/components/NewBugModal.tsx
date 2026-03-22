import { useState } from 'react'
import type { BugStatus, BugSeverity, BugStack } from '@/modules/sprints/types/sprint.types'

export interface NewBugDraft {
  desc: string
  feature: string
  stack: BugStack
  severity: BugSeverity
  assignee: string
  notes: string
  status: BugStatus
  openedAt: string
}

export function emptyDraft(currentDate: string): NewBugDraft {
  return { desc: '', feature: '', stack: 'Front', severity: 'Média', assignee: '', notes: '', status: 'Aberto', openedAt: currentDate }
}

const DEFAULT_STACKS = ['Front', 'BFF', 'Back', 'Mobile', 'Infra']
const NEW_STACK_SENTINEL = '__new__'

interface Props {
  featureNames: string[]
  assignees: string[]
  stacks?: string[]
  initialDraft?: Partial<NewBugDraft>
  currentDate: string
  onConfirm: (draft: NewBugDraft) => void
  onCancel: () => void
}

export function NewBugModal({ featureNames, assignees, stacks = [], initialDraft, currentDate, onConfirm, onCancel }: Props) {
  const [draft, setDraft] = useState<NewBugDraft>(() => ({ ...emptyDraft(currentDate), ...initialDraft }))
  const [addingStack, setAddingStack] = useState(false)
  const [newStackVal, setNewStackVal] = useState('')
  const [customStacks, setCustomStacks] = useState<string[]>(() =>
    stacks.filter((s) => !DEFAULT_STACKS.includes(s))
  )

  const allStacks = [...DEFAULT_STACKS, ...customStacks]

  function set<K extends keyof NewBugDraft>(field: K, value: NewBugDraft[K]) {
    setDraft((d) => ({ ...d, [field]: value }))
  }

  function handleStackChange(value: string) {
    if (value === NEW_STACK_SENTINEL) {
      setAddingStack(true)
      setNewStackVal('')
    } else {
      set('stack', value as BugStack)
    }
  }

  function confirmNewStack() {
    const trimmed = newStackVal.trim()
    if (!trimmed) return
    if (!customStacks.includes(trimmed)) setCustomStacks((cs) => [...cs, trimmed])
    set('stack', trimmed as BugStack)
    setAddingStack(false)
    setNewStackVal('')
  }

  function cancelNewStack() {
    setAddingStack(false)
    setNewStackVal('')
  }

  const canSubmit = draft.desc.trim() && draft.openedAt

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>🐞 Novo Bug</div>
          <button onClick={onCancel} style={{ background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-2)', lineHeight: 1 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', maxHeight: '70vh' }}>
          <Field label="Descrição *">
            <input
              autoFocus
              type="text"
              value={draft.desc}
              onChange={(e) => set('desc', e.target.value)}
              placeholder="Descreva o bug encontrado…"
              style={inputStyle}
            />
          </Field>

          <Field label="Funcionalidade Relacionada">
            <input
              type="text"
              list="new-bug-modal-features"
              value={draft.feature}
              onChange={(e) => set('feature', e.target.value)}
              placeholder="Funcionalidade afetada"
              style={inputStyle}
            />
            <datalist id="new-bug-modal-features">
              {featureNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Stack">
              {addingStack ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    type="text"
                    value={newStackVal}
                    onChange={(e) => setNewStackVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmNewStack(); if (e.key === 'Escape') cancelNewStack() }}
                    placeholder="Nome da nova stack…"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <button onClick={confirmNewStack} style={btnConfirmSmall} title="Confirmar">✓</button>
                  <button onClick={cancelNewStack} style={btnCancelSmall} title="Cancelar">✕</button>
                </div>
              ) : (
                <select value={draft.stack} onChange={(e) => handleStackChange(e.target.value)} style={inputStyle}>
                  {allStacks.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option disabled style={{ color: 'var(--color-text-3)' }}>──────────</option>
                  <option value={NEW_STACK_SENTINEL}>➕ Nova stack…</option>
                </select>
              )}
            </Field>
            <Field label="Severidade">
              <select value={draft.severity} onChange={(e) => set('severity', e.target.value as BugSeverity)} style={inputStyle}>
                {(['Crítica', 'Alta', 'Média', 'Baixa'] as BugSeverity[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Status">
              <select value={draft.status} onChange={(e) => set('status', e.target.value as BugStatus)} style={inputStyle}>
                {(['Aberto', 'Em Andamento', 'Resolvido'] as BugStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Responsável">
              <input type="text" list="new-bug-modal-assignees" value={draft.assignee} onChange={(e) => set('assignee', e.target.value)} placeholder="Nome do responsável" style={inputStyle} />
              <datalist id="new-bug-modal-assignees">
                {assignees.map((a) => <option key={a} value={a} />)}
              </datalist>
            </Field>
          </div>

          <Field label="Data de Abertura *">
            <input
              type="date"
              value={draft.openedAt}
              onChange={(e) => set('openedAt', e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Notas / Observações">
            <textarea
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Contexto adicional, passos para reproduzir…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-family-sans)' }}
            />
          </Field>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--color-border)', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={btnOutline}>Cancelar</button>
          <button
            onClick={() => canSubmit && onConfirm(draft)}
            disabled={!canSubmit}
            style={{ ...btnPrimary, opacity: canSubmit ? 1 : 0.5, cursor: canSubmit ? 'pointer' : 'not-allowed' }}
          >
            Criar Bug
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontSize: 13,
  color: 'var(--color-text)',
  background: 'var(--color-bg)',
  fontFamily: 'var(--font-family-sans)',
  boxSizing: 'border-box',
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 18px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
  flexShrink: 0,
}

const btnOutline: React.CSSProperties = {
  padding: '7px 18px',
  background: 'transparent',
  color: 'var(--color-text-2)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}

const btnConfirmSmall: React.CSSProperties = {
  padding: '0 10px',
  background: 'var(--color-green)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  flexShrink: 0,
}

const btnCancelSmall: React.CSSProperties = {
  padding: '0 10px',
  background: 'transparent',
  color: 'var(--color-text-2)',
  border: '1px solid var(--color-border-md)',
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
  flexShrink: 0,
}
