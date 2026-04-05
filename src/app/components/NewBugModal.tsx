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
      className="modal-backdrop"
    >
      <div role="dialog" aria-modal="true" aria-label="Novo Bug" className="modal-container modal-md !p-0 !gap-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-[18px] border-b border-border">
          <div className="heading-md">🐞 Novo Bug</div>
          <button onClick={onCancel} aria-label="Fechar" className="btn btn-ghost text-[18px] leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-[14px] px-6 py-5 overflow-y-auto max-h-[70vh]">
          <Field label="Descrição *">
            <input
              autoFocus
              type="text"
              value={draft.desc}
              onChange={(e) => set('desc', e.target.value)}
              placeholder="Descreva o bug encontrado…"
              className="input-field"
            />
          </Field>

          <Field label="Funcionalidade Relacionada">
            <input
              type="text"
              list="new-bug-modal-features"
              value={draft.feature}
              onChange={(e) => set('feature', e.target.value)}
              placeholder="Funcionalidade afetada"
              className="input-field"
            />
            <datalist id="new-bug-modal-features">
              {featureNames.map((n) => <option key={n} value={n} />)}
            </datalist>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stack">
              {addingStack ? (
                <div className="flex gap-[6px]">
                  <input
                    autoFocus
                    type="text"
                    value={newStackVal}
                    onChange={(e) => setNewStackVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmNewStack(); if (e.key === 'Escape') cancelNewStack() }}
                    placeholder="Nome da nova stack…"
                    className="input-field flex-1"
                  />
                  <button onClick={confirmNewStack} className="btn btn-success btn-sm" title="Confirmar">✓</button>
                  <button onClick={cancelNewStack} className="btn btn-outline btn-sm" title="Cancelar">✕</button>
                </div>
              ) : (
                <select value={draft.stack} onChange={(e) => handleStackChange(e.target.value)} className="select-field">
                  {allStacks.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option disabled style={{ color: 'var(--color-text-3)' }}>──────────</option>
                  <option value={NEW_STACK_SENTINEL}>➕ Nova stack…</option>
                </select>
              )}
            </Field>
            <Field label="Severidade">
              <select value={draft.severity} onChange={(e) => set('severity', e.target.value as BugSeverity)} className="select-field">
                {(['Crítica', 'Alta', 'Média', 'Baixa'] as BugSeverity[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select value={draft.status} onChange={(e) => set('status', e.target.value as BugStatus)} className="select-field">
                {(['Aberto', 'Em Andamento', 'Falhou', 'Resolvido'] as BugStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Responsável">
              <input type="text" list="new-bug-modal-assignees" value={draft.assignee} onChange={(e) => set('assignee', e.target.value)} placeholder="Nome do responsável" className="input-field" />
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
              className="input-field"
            />
          </Field>

          <Field label="Notas / Observações">
            <textarea
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="Contexto adicional, passos para reproduzir…"
              rows={3}
              className="textarea-field"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-end px-6 py-[14px] border-t border-border">
          <button onClick={onCancel} className="btn btn-outline btn-md">Cancelar</button>
          <button
            onClick={() => canSubmit && onConfirm(draft)}
            disabled={!canSubmit}
            className="btn btn-primary btn-md"
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
    <div className="flex flex-col gap-[5px]">
      <label className="section-label !mb-0">{label}</label>
      {children}
    </div>
  )
}
