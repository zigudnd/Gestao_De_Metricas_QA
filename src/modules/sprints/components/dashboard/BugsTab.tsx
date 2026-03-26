import { useState } from 'react'
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
  Baixa:   { bg: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97' },
  Média:   { bg: '#FAEEDA', color: '#854F0B', border: '0.5px solid #FAC775' },
  Alta:    { bg: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F7C1C1' },
  Crítica: { bg: '#A32D2D', color: '#fff',    border: 'none' },
}

const STATUS_TEXT_COLOR: Record<string, string> = {
  Aberto:        '#A32D2D',
  'Em Andamento': '#854F0B',
  Falhou:        '#A32D2D',
  Resolvido:     '#3B6D11',
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
      // default: Falhou primeiro, Resolvido por último
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
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 500, background: s.bg, color: s.color, border: s.border, whiteSpace: 'nowrap' }}>
        {severity || '—'}
      </span>
    )
  }

  function stackBadge(stack: string) {
    return (
      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 8, fontSize: 10, fontWeight: 500, background: 'var(--color-bg)', color: 'var(--color-text-2)', border: '0.5px solid var(--color-border)', whiteSpace: 'nowrap' }}>
        {stack || '—'}
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Filter Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
        <FilterGroup label="Status" field="status" value={filters.status} options={['Todos', 'Aberto', 'Em Andamento', 'Falhou', 'Resolvido']} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} />
        <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />
        <FilterGroup label="Stack" field="stack" value={filters.stack} options={['Todos', 'Front', 'BFF', 'Back', 'Mobile', 'Infra']} onChange={(v) => setFilters((f) => ({ ...f, stack: v }))} />
        <div style={{ width: 1, height: 24, background: 'var(--color-border-md)' }} />
        <FilterGroup label="Atribuição" field="assignee" value={filters.assignee} options={assignees} onChange={(v) => setFilters((f) => ({ ...f, assignee: v }))} />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--color-text-2)', fontWeight: 400 }}>{sorted.length} de {state.bugs.length} bug{state.bugs.length !== 1 ? 's' : ''}</span>
          {hasFilters && (
            <button onClick={() => setFilters({ status: 'Todos', stack: 'Todos', assignee: 'Todos' })} style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--color-red)', background: '#fee2e2', color: 'var(--color-red)', cursor: 'pointer' }}>
              ✕ Limpar
            </button>
          )}
        </div>
        <button onClick={() => setShowNewModal(true)} style={btnPrimary}>+ Novo Bug</button>
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
                <td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--color-text-2)', fontSize: 14 }}>
                  {state.bugs.length === 0 ? 'Nenhum bug registrado.' : 'Nenhum bug corresponde aos filtros.'}
                </td>
              </tr>
            ) : (
              sorted.map(({ b, i }) => {
                const isResolved = b.status === 'Resolvido'

                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)', background: isResolved ? '#f0fdf4' : 'var(--color-surface)', opacity: isResolved ? 0.85 : 1 }}>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                      <BugIdInput id={b.id} onCommit={(val) => updateBug(i, 'id', val)} />
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 260 }}>
                      {editingBug === i ? (
                        <BugEditInline bug={b} index={i} onDone={() => setEditingBug(null)} />
                      ) : (
                        <div style={{ fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>{b.desc || 'Sem descrição'}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                      {editingBug !== i && (
                        <div style={{ fontSize: 12, color: 'var(--color-text-2)' }}>{b.feature || '—'}</div>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{stackBadge(b.stack || '—')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{sevBadge(b.severity)}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <select
                        value={b.status}
                        onChange={(e) => {
                          const newStatus = e.target.value as BugStatus
                          if (newStatus === 'Resolvido') {
                            setResolveModal({ index: i, date: state.currentDate })
                          } else if (newStatus === 'Falhou') {
                            updateBug(i, 'status', newStatus)
                            updateBug(i, 'retests', (b.retests ?? 0) + 1)
                          } else {
                            updateBug(i, 'status', newStatus)
                          }
                        }}
                        style={{
                          fontSize: 12,
                          fontWeight: 500,
                          padding: '4px 10px',
                          borderRadius: 8,
                          border: '0.5px solid var(--color-border)',
                          background: 'var(--color-surface)',
                          color: STATUS_TEXT_COLOR[b.status] ?? 'var(--color-text-2)',
                          cursor: 'pointer',
                          fontFamily: 'var(--font-family-sans)',
                          width: 138,
                        }}
                      >
                        <option value="Aberto">Aberto</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Falhou">Falhou</option>
                        <option value="Resolvido">Resolvido</option>
                      </select>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        value={b.retests || 0}
                        onChange={(e) => updateBug(i, 'retests', Number(e.target.value))}
                        style={{ width: 55, textAlign: 'center', padding: '4px', border: '1px solid var(--color-border-md)', borderRadius: 6, background: 'var(--color-surface)', color: 'var(--color-text)', fontFamily: 'var(--font-family-sans)' }}
                      />
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
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

      {/* ── Modal: Novo Bug ───────────────────────────────────────────────── */}
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

      {/* ── Modal: Confirmar Exclusão ─────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmModal
          title="Excluir Bug"
          description={`Tem certeza que deseja excluir o bug "${deleteTarget.desc}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir Bug"
          onConfirm={() => { removeBug(deleteTarget.index); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Modal: Confirmar Resolução ────────────────────────────────────── */}
      {resolveModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 28, width: 340, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text)' }}>✅ Confirmar Resolução</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>Informe a data em que o bug foi resolvido.</div>
            <Field label="Data de Resolução">
              <input
                autoFocus
                type="date"
                value={resolveModal.date}
                onChange={(e) => setResolveModal((r) => r ? { ...r, date: e.target.value } : r)}
                onKeyDown={(e) => { if (e.key === 'Enter') confirmResolve(); if (e.key === 'Escape') setResolveModal(null) }}
                style={inputStyle}
              />
            </Field>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setResolveModal(null)} style={btnOutline}>Cancelar</button>
              <button
                onClick={confirmResolve}
                disabled={!resolveModal.date}
                style={{ ...btnPrimary, background: 'var(--color-green)', opacity: resolveModal.date ? 1 : 0.5, cursor: resolveModal.date ? 'pointer' : 'not-allowed' }}
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

// ─── BugIdInput ───────────────────────────────────────────────────────────────

function BugIdInput({ id, onCommit }: { id: string; onCommit: (val: string) => void }) {
  const [local, setLocal] = useState(id)

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => {
        e.currentTarget.style.border = '1px solid transparent'
        if (local.trim() && local !== id) onCommit(local.trim())
        else setLocal(id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') { setLocal(id); e.currentTarget.blur() }
      }}
      onFocus={(e) => (e.currentTarget.style.border = '1px solid var(--color-border-md)')}
      style={{
        fontFamily: 'var(--font-family-mono)',
        fontSize: 12,
        fontWeight: 700,
        color: 'var(--color-text-2)',
        background: 'transparent',
        border: '1px solid transparent',
        borderRadius: 6,
        padding: '3px 6px',
        width: 110,
        cursor: 'text',
      }}
      title="Clique para editar o ID"
    />
  )
}

// ─── BugEditInline ────────────────────────────────────────────────────────────

function BugEditInline({ bug, index, onDone }: { bug: Bug; index: number; onDone: () => void }) {
  const updateBug = useSprintStore((s) => s.updateBug)
  const state = useSprintStore((s) => s.state)
  const featureNames = state.features.map((f) => f.name).filter(Boolean)
  const knownAssignees = [...new Set(state.bugs.map((b) => b.assignee?.trim()).filter(Boolean) as string[])]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <input
        autoFocus
        type="text"
        value={bug.desc}
        onChange={(e) => updateBug(index, 'desc', e.target.value)}
        placeholder="Descrição do bug"
        style={inputSm}
      />
      <input
        type="text"
        list={`feat-list-${index}`}
        value={bug.feature}
        onChange={(e) => updateBug(index, 'feature', e.target.value)}
        placeholder="Funcionalidade relacionada"
        style={inputSm}
      />
      <datalist id={`feat-list-${index}`}>
        {featureNames.map((n) => <option key={n} value={n} />)}
      </datalist>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={bug.stack} onChange={(e) => updateBug(index, 'stack', e.target.value as BugStack)} style={inputSm}>
          {['Front', 'BFF', 'Back', 'Mobile', 'Infra'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={bug.severity} onChange={(e) => updateBug(index, 'severity', e.target.value as BugSeverity)} style={inputSm}>
          {['Crítica', 'Alta', 'Média', 'Baixa'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <input type="text" list={`assignees-inline-${index}`} value={bug.assignee ?? ''} onChange={(e) => updateBug(index, 'assignee', e.target.value)} placeholder="Responsável" style={inputSm} />
      <datalist id={`assignees-inline-${index}`}>
        {knownAssignees.map((a) => <option key={a} value={a} />)}
      </datalist>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Data de Abertura</label>
        <input type="date" value={bug.openedAt ?? ''} onChange={(e) => updateBug(index, 'openedAt', e.target.value)} style={inputSm} />
      </div>
      <textarea value={bug.notes ?? ''} onChange={(e) => updateBug(index, 'notes', e.target.value)} placeholder="Notas…" rows={2} style={{ ...inputSm, fontFamily: 'var(--font-family-sans)', resize: 'vertical' }} />
      <button onClick={onDone} style={{ ...btnPrimary, fontSize: 12, padding: '4px 12px', alignSelf: 'flex-end' }}>✓ Fechar</button>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
    </div>
  )
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

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
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? (danger ? '#FCEBEB' : 'var(--color-bg)') : 'none',
        border: 'none',
        padding: 6,
        borderRadius: 6,
        cursor: 'pointer',
        color: hov && danger ? '#A32D2D' : 'var(--color-text-2)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  )
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
      {children}
    </th>
  )
}

function ThSort({ children, field, current, dir, onSort }: { children: React.ReactNode; field: SortField; current: SortField; dir: SortDir; onSort: (f: SortField) => void }) {
  const active = current === field
  return (
    <th
      onClick={() => onSort(field)}
      style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 500, color: active ? '#185FA5' : 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
    >
      {children}
      {active ? (dir === 'asc' ? <IcoSortAsc /> : <IcoSortDesc />) : <IcoSort />}
    </th>
  )
}

function FilterGroup({ label, value, options, onChange }: { label: string; field: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            style={{
              fontSize: 11,
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: 20,
              border: value === opt ? '0.5px solid #B5D4F4' : '0.5px solid var(--color-border)',
              cursor: 'pointer',
              background: value === opt ? '#E6F1FB' : 'var(--color-bg)',
              color: value === opt ? '#185FA5' : 'var(--color-text-2)',
              fontFamily: 'var(--font-family-sans)',
              transition: 'background 0.15s',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  background: '#185FA5',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 500,
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


const inputSm: React.CSSProperties = {
  width: '100%',
  padding: '5px 8px',
  border: '1px solid var(--color-border-md)',
  borderRadius: 6,
  fontSize: 12,
  color: 'var(--color-text)',
  background: 'var(--color-surface)',
  fontFamily: 'var(--font-family-sans)',
  boxSizing: 'border-box',
}
