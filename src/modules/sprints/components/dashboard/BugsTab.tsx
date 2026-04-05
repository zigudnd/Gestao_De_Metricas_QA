import { useState, useEffect } from 'react'
import { useSprintStore } from '../../store/sprintStore'
import type { Bug, BugStatus, BugSeverity, BugStack } from '../../types/sprint.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { NewBugModal, emptyDraft, type NewBugDraft } from '@/app/components/NewBugModal'

interface BugFilters {
  status: string
  stack: string
  assignee: string
}

type SortField = 'id' | 'desc' | 'feature' | 'stack' | 'severity' | 'status' | 'retests' | null
type SortDir = 'asc' | 'desc'

const SEV_ORDER: Record<string, number> = { Crítica: 0, Alta: 1, Média: 2, Baixa: 3 }
const STATUS_ORDER: Record<string, number> = { Falhou: 0, Aberto: 1, 'Em Andamento': 2, Resolvido: 3 }

const SEV_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  Baixa:   { bg: 'var(--color-green-light)', color: 'var(--color-green)',  border: '0.5px solid var(--color-green-mid)' },
  Média:   { bg: 'var(--color-amber-light)', color: 'var(--color-amber)',  border: '0.5px solid var(--color-amber-mid)' },
  Alta:    { bg: 'var(--color-red-light)',   color: 'var(--color-red)',    border: '0.5px solid var(--color-red-mid)' },
  Crítica: { bg: 'var(--color-red)',         color: '#fff',               border: 'none' },
}

const STATUS_TEXT_COLOR: Record<string, string> = {
  Aberto:         'var(--color-red)',
  'Em Andamento': 'var(--color-amber)',
  Falhou:         'var(--color-red)',
  Resolvido:      'var(--color-green)',
}

export function BugsTab() {
  const state = useSprintStore((s) => s.state)
  const addBugFull = useSprintStore((s) => s.addBugFull)
  const updateBug = useSprintStore((s) => s.updateBug)
  const removeBug = useSprintStore((s) => s.removeBug)
  const duplicateBug = useSprintStore((s) => s.duplicateBug)

  const [filters, setFilters] = useState<BugFilters>({ status: 'Todos', stack: 'Todos', assignee: 'Todos' })
  const [sortField, setSortField] = useState<SortField>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [editingBug, setEditingBug] = useState<number | null>(null)

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }
  const [showNewModal, setShowNewModal] = useState(false)
  const [resolveModal, setResolveModal] = useState<{ index: number; date: string } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ index: number; desc: string } | null>(null)

  const featureNames = state.features.map((f) => f.name).filter(Boolean)

  const knownAssignees = Array.from(
    new Set(state.bugs.map((b) => b.assignee?.trim()).filter(Boolean) as string[])
  )

  const knownStacks = Array.from(
    new Set(state.bugs.map((b) => b.stack).filter(Boolean) as string[])
  )

  const assignees = ['Todos', 'Não Atribuído', ...knownAssignees]

  const sorted = [...state.bugs]
    .map((b, i) => ({ b, i }))
    .sort((a, z) => {
      if (sortField) {
        const dir = sortDir === 'asc' ? 1 : -1
        if (sortField === 'id') return dir * a.b.id.localeCompare(z.b.id)
        if (sortField === 'desc') return dir * (a.b.desc || '').localeCompare(z.b.desc || '')
        if (sortField === 'feature') return dir * (a.b.feature || '').localeCompare(z.b.feature || '')
        if (sortField === 'stack') return dir * (a.b.stack || '').localeCompare(z.b.stack || '')
        if (sortField === 'severity') return dir * ((SEV_ORDER[a.b.severity] ?? 9) - (SEV_ORDER[z.b.severity] ?? 9))
        if (sortField === 'status') return dir * ((STATUS_ORDER[a.b.status] ?? 9) - (STATUS_ORDER[z.b.status] ?? 9))
        if (sortField === 'retests') return dir * ((a.b.retests ?? 0) - (z.b.retests ?? 0))
      }
      // default: Falhou primeiro, Resolvido por ultimo
      return (a.b.status === 'Resolvido' ? 1 : 0) - (z.b.status === 'Resolvido' ? 1 : 0) || (a.b.status === 'Falhou' ? -1 : 0) - (z.b.status === 'Falhou' ? -1 : 0)
    })
    .filter(({ b }) => {
      if (filters.status !== 'Todos' && b.status !== filters.status) return false
      if (filters.stack !== 'Todos' && b.stack !== filters.stack) return false
      if (filters.assignee === 'Não Atribuído') return !(b.assignee ?? '').trim()
      if (filters.assignee !== 'Todos' && b.assignee !== filters.assignee) return false
      return true
    })

  const hasFilters = filters.status !== 'Todos' || filters.stack !== 'Todos' || filters.assignee !== 'Todos'

  function confirmResolve() {
    if (!resolveModal) return
    updateBug(resolveModal.index, 'status', 'Resolvido')
    updateBug(resolveModal.index, 'resolvedAt', resolveModal.date)
    setResolveModal(null)
  }

  function sevBadge(severity: string) {
    const s = SEV_STYLE[severity] ?? { bg: 'var(--color-bg)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)' }
    return (
      <span className="badge" style={{ background: s.bg, color: s.color, border: s.border }}>
        {severity || '—'}
      </span>
    )
  }

  function stackBadge(stack: string) {
    return (
      <span className="badge badge-neutral">
        {stack || '—'}
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <style>{`
        .bug-id-input:hover { border-bottom: 1px solid var(--color-border-md) !important; }
        .bug-action-btn:hover { background: var(--color-bg) !important; }
        .bug-action-btn-danger:hover { background: var(--color-red-light) !important; color: var(--color-red) !important; }
      `}</style>
      {/* Filter Bar */}
      <div className="card-sm flex items-center gap-4 flex-wrap">
        <FilterGroup label="Status" value={filters.status} options={['Todos', 'Aberto', 'Em Andamento', 'Falhou', 'Resolvido']} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
        <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />
        <FilterGroup label="Stack" value={filters.stack} options={['Todos', 'Front', 'BFF', 'Back', 'Mobile', 'Infra']} onChange={(v) => setFilters((f) => ({ ...f, stack: v }))} />
        <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />
        <FilterGroup label="Atribuição" value={filters.assignee} options={assignees} onChange={(v) => setFilters((f) => ({ ...f, assignee: v }))} />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-small">{sorted.length} de {state.bugs.length} bug{state.bugs.length !== 1 ? 's' : ''}</span>
          {hasFilters && (
            <button onClick={() => setFilters({ status: 'Todos', stack: 'Todos', assignee: 'Todos' })} aria-label="Limpar filtros" className="badge badge-red" style={{ cursor: 'pointer', fontWeight: 700 }}>
              ✕ Limpar
            </button>
          )}
        </div>
        {/* Severity summary */}
        <div className="flex gap-1 items-center">
          {(['Crítica', 'Alta', 'Média', 'Baixa'] as const).map((sev) => {
            const count = state.bugs.filter((b) => b.severity === sev && b.status !== 'Resolvido').length
            if (count === 0) return null
            const s = SEV_STYLE[sev]
            return (
              <span key={sev} className="badge" style={{ fontWeight: 700, background: s.bg, color: s.color, border: s.border }}>
                {count} {sev}
              </span>
            )
          })}
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />
        <button onClick={() => setShowNewModal(true)} aria-label="Adicionar novo bug" className="btn btn-md btn-primary">+ Novo Bug</button>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-bg)' }}>
              <ThSort field="id" current={sortField} dir={sortDir} onSort={toggleSort}>ID</ThSort>
              <ThSort field="desc" current={sortField} dir={sortDir} onSort={toggleSort}>Descrição</ThSort>
              <ThSort field="feature" current={sortField} dir={sortDir} onSort={toggleSort}>Funcionalidade</ThSort>
              <ThSort field="stack" current={sortField} dir={sortDir} onSort={toggleSort}>Stack</ThSort>
              <ThSort field="severity" current={sortField} dir={sortDir} onSort={toggleSort}>Severidade</ThSort>
              <ThSort field="status" current={sortField} dir={sortDir} onSort={toggleSort}>Status</ThSort>
              <ThSort field="retests" current={sortField} dir={sortDir} onSort={toggleSort}>Retestes</ThSort>
              <Th>Ações</Th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-body text-center" style={{ padding: 32, fontSize: 14 }}>
                  {state.bugs.length === 0 ? 'Nenhum bug registrado.' : 'Nenhum bug corresponde aos filtros.'}
                </td>
              </tr>
            ) : (
              sorted.map(({ b, i }) => {
                const isResolved = b.status === 'Resolvido'

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)', background: isResolved ? 'var(--color-green-light)' : 'var(--color-surface)', opacity: isResolved ? 0.85 : 1 }}>
                    <td className="table-cell" style={{ whiteSpace: 'nowrap' }}>
                      <BugIdInput id={b.id} onCommit={(val) => updateBug(i, 'id', val)} />
                    </td>
                    <td className="table-cell" style={{ maxWidth: 260 }}>
                      {editingBug === i ? (
                        <BugEditInline bug={b} index={i} onDone={() => setEditingBug(null)} />
                      ) : (
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3, textDecoration: isResolved ? 'line-through' : 'none' }}>{b.desc || 'Sem descrição'}</div>
                      )}
                    </td>
                    <td className="table-cell" style={{ maxWidth: 180 }}>
                      {editingBug !== i && (
                        <div className="text-small">{b.feature || '—'}</div>
                      )}
                    </td>
                    <td className="table-cell text-center">{stackBadge(b.stack || '—')}</td>
                    <td className="table-cell text-center">{sevBadge(b.severity)}</td>
                    <td className="table-cell">
                      <select
                        value={b.status}
                        aria-label="Status do bug"
                        onChange={(e) => {
                          const newStatus = e.target.value as BugStatus
                          if (newStatus === 'Resolvido') {
                            setResolveModal({ index: i, date: state.currentDate })
                          } else if (newStatus === 'Falhou') {
                            updateBug(i, 'retests', (b.retests ?? 0) + 1)
                            updateBug(i, 'status', newStatus)
                          } else {
                            updateBug(i, 'status', newStatus)
                          }
                        }}
                        className="select-field"
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: '4px 24px 4px 10px',
                          color: STATUS_TEXT_COLOR[b.status] ?? 'var(--color-text-2)',
                          width: 138,
                        }}
                      >
                        <option value="Aberto">Aberto</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Falhou">Falhou</option>
                        <option value="Resolvido">Resolvido</option>
                      </select>
                    </td>
                    <td className="table-cell text-center">
                      <input
                        type="number"
                        min={0}
                        value={b.retests || 0}
                        onChange={(e) => updateBug(i, 'retests', Number(e.target.value))}
                        aria-label="Número de retestes"
                        className="input-field"
                        style={{ width: 55, textAlign: 'center', padding: 4 }}
                      />
                    </td>
                    <td className="table-cell text-center" style={{ whiteSpace: 'nowrap' }}>
                      <BugActionBtn onClick={() => setEditingBug(editingBug === i ? null : i)} title="Editar"><IcoEdit /></BugActionBtn>
                      <BugActionBtn onClick={() => duplicateBug(i)} title="Duplicar"><IcoDuplicate /></BugActionBtn>
                      <BugActionBtn onClick={() => setDeleteTarget({ index: i, desc: b.desc || 'Sem descrição' })} title="Remover" danger><IcoTrash /></BugActionBtn>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Novo Bug */}
      {showNewModal && (
        <NewBugModal
          featureNames={featureNames}
          assignees={knownAssignees}
          stacks={knownStacks}
          currentDate={state.currentDate}
          onConfirm={(draft) => { addBugFull(draft); setShowNewModal(false) }}
          onCancel={() => setShowNewModal(false)}
        />
      )}

      {/* Modal: Confirmar Exclusão */}
      {deleteTarget && (
        <ConfirmModal
          title="Excluir Bug"
          description={`Tem certeza que deseja excluir o bug "${deleteTarget.desc}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Bug"
          onConfirm={() => { removeBug(deleteTarget.index); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Modal: Confirmar Resolução */}
      {resolveModal && (
        <div onClick={(e) => { if (e.target === e.currentTarget) setResolveModal(null) }} className="modal-backdrop">
          <div className="modal-container modal-sm">
            <div className="heading-md">✅ Confirmar Resolução</div>
            <div className="text-body" style={{ lineHeight: 1.5 }}>Informe a data em que o bug foi resolvido.</div>
            <Field label="Data de Resolução">
              <input
                autoFocus
                type="date"
                value={resolveModal.date}
                onChange={(e) => setResolveModal((r) => r ? { ...r, date: e.target.value } : r)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmResolve(); if (e.key === 'Escape') setResolveModal(null) }}
                className="input-field"
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setResolveModal(null)} className="btn btn-outline btn-md">Cancelar</button>
              <button
                onClick={confirmResolve}
                disabled={!resolveModal.date}
                className="btn btn-md btn-success"
                style={{ opacity: resolveModal.date ? 1 : 0.5, cursor: resolveModal.date ? 'pointer' : 'not-allowed' }}
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

// --- BugIdInput ---

function BugIdInput({ id, onCommit }: { id: string; onCommit: (val: string) => void }) {
  const [local, setLocal] = useState(id)

  useEffect(() => { setLocal(id) }, [id])

  return (
    <input
      className="bug-id-input"
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => {
        e.currentTarget.style.border = '1px solid transparent'
        e.currentTarget.style.borderBottom = '1px dashed var(--color-border-md)'
        if (local.trim() && local !== id) onCommit(local.trim())
        else setLocal(id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setLocal(id); e.currentTarget.blur() }
      }}
      onFocus={(e) => (e.currentTarget.style.border = '1px solid var(--color-border-md)')}
      aria-label="ID do bug"
      style={{
        fontFamily: 'var(--font-family-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--color-text-2)',
        background: 'transparent',
        border: '1px solid transparent',
        borderBottom: '1px dashed var(--color-border-md)',
        borderRadius: 6,
        padding: '3px 6px',
        width: 110,
        cursor: 'text',
      }}
      title="Clique para editar o ID"
    />
  )
}

// --- BugEditInline ---

function BugEditInline({ bug, index, onDone }: { bug: Bug; index: number; onDone: () => void }) {
  const updateBug = useSprintStore((s) => s.updateBug)
  const state = useSprintStore((s) => s.state)
  const featureNames = state.features.map((f) => f.name).filter(Boolean)
  const knownAssignees = [...new Set(state.bugs.map((b) => b.assignee?.trim()).filter(Boolean) as string[])]

  return (
    <div className="flex flex-col gap-1.5">
      <input
        autoFocus
        type="text"
        value={bug.desc}
        onChange={(e) => updateBug(index, 'desc', e.target.value)}
        placeholder="Descrição do bug"
        className="input-field"
        style={{ fontSize: 12, padding: '5px 8px' }}
      />
      <input
        type="text"
        list={`feat-list-${index}`}
        value={bug.feature}
        onChange={(e) => updateBug(index, 'feature', e.target.value)}
        placeholder="Funcionalidade relacionada"
        className="input-field"
        style={{ fontSize: 12, padding: '5px 8px' }}
      />
      <datalist id={`feat-list-${index}`}>
        {featureNames.map((n) => <option key={n} value={n} />)}
      </datalist>
      <div className="flex gap-1.5">
        <select value={bug.stack} onChange={(e) => updateBug(index, 'stack', e.target.value as BugStack)} className="select-field" style={{ fontSize: 12, padding: '5px 8px' }}>
          {['Front', 'BFF', 'Back', 'Mobile', 'Infra'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={bug.severity} onChange={(e) => updateBug(index, 'severity', e.target.value as BugSeverity)} className="select-field" style={{ fontSize: 12, padding: '5px 8px' }}>
          {['Crítica', 'Alta', 'Média', 'Baixa'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <input type="text" list={`assignees-inline-${index}`} value={bug.assignee ?? ''} onChange={(e) => updateBug(index, 'assignee', e.target.value)} placeholder="Responsável" className="input-field" style={{ fontSize: 12, padding: '5px 8px' }} />
      <datalist id={`assignees-inline-${index}`}>
        {knownAssignees.map((a) => <option key={a} value={a} />)}
      </datalist>
      <div className="flex flex-col gap-0.5">
        <label className="section-label" style={{ fontSize: 10 }}>Data de Abertura</label>
        <input type="date" value={bug.openedAt ?? ''} onChange={(e) => updateBug(index, 'openedAt', e.target.value)} className="input-field" style={{ fontSize: 12, padding: '5px 8px' }} />
      </div>
      <textarea value={bug.notes ?? ''} onChange={(e) => updateBug(index, 'notes', e.target.value)} placeholder="Notas…" rows={2} className="textarea-field" style={{ fontSize: 12, padding: '5px 8px' }} />
      <button onClick={onDone} className="btn btn-sm btn-primary self-end">✓ Fechar</button>
    </div>
  )
}

// --- Sub-components ---

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="section-label">{label}</label>
      {children}
    </div>
  )
}

// --- SVG icons ---

function IcoEdit() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.5 2.5l2 2L5 12H3v-2L10.5 2.5z"/></svg>
}
function IcoDuplicate() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 10H2a1 1 0 01-1-1V2a1 1 0 011-1h7a1 1 0 011 1v1"/></svg>
}
function IcoTrash() {
  return <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 4h13M5 4V2h5v2M6 7v5M9 7v5M2 4l1 9a1 1 0 001 1h7a1 1 0 001-1l1-9"/></svg>
}
function IcoSort() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><path d="M3 4l2-2 2 2M3 6l2 2 2-2"/></svg>
}
function IcoSortAsc() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><path d="M5 8V2M2 5l3-3 3 3"/></svg>
}
function IcoSortDesc() {
  return <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 4, verticalAlign: 'middle' }}><path d="M5 2v6M2 5l3 3 3-3"/></svg>
}

function BugActionBtn({ onClick, title, children, danger }: React.PropsWithChildren<{ onClick?: () => void; title?: string; danger?: boolean }>) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`btn-ghost ${danger ? 'bug-action-btn-danger' : 'bug-action-btn'}`}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 32, minHeight: 32 }}
    >
      {children}
    </button>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="table-header" style={{ whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

function ThSort({ children, field, current, dir, onSort }: { children: React.ReactNode; field: SortField; current: SortField; dir: SortDir; onSort: (f: SortField) => void }) {
  const active = current === field
  const ariaSortValue = active ? (dir === 'asc' ? 'ascending' : 'descending') : 'none'
  return (
    <th
      tabIndex={0}
      role="button"
      aria-sort={ariaSortValue as 'ascending' | 'descending' | 'none'}
      onClick={() => onSort(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSort(field)
        }
      }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = 'var(--focus-ring)' }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none' }}
      className="table-header"
      style={{ whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', outline: 'none', borderRadius: 4, color: active ? 'var(--color-blue)' : undefined }}
    >
      {children}
      {active ? (dir === 'asc' ? <IcoSortAsc /> : <IcoSortDesc />) : <IcoSort />}
    </th>
  )
}

function FilterGroup({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="section-label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            aria-pressed={value === opt}
            className={value === opt ? 'badge badge-blue' : 'badge badge-neutral'}
            style={{ cursor: 'pointer', fontFamily: 'var(--font-family-sans)', transition: 'background 0.15s' }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
