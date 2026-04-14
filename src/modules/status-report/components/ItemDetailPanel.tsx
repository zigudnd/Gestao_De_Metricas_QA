import { useState, useRef, useEffect } from 'react'
import type { StatusReportItem, ComputedDates, SectionId, Priority, Stack, SectionDef } from '../types/statusReport.types'
import { ConfirmModal } from '@/app/components/ConfirmModal'
import { diffDays } from '../services/dateEngine'

interface ItemDetailPanelProps {
  item: StatusReportItem
  computed: ComputedDates
  sections: SectionDef[]
  allItems: StatusReportItem[]
  onUpdate: (id: string, updates: Partial<StatusReportItem>) => void
  onDelete: (id: string) => void
  onAddDependency: (itemId: string, depId: string) => void
  onRemoveDependency: (itemId: string, depId: string) => void
  onClose: () => void
}

const STACK_OPTIONS: { value: Stack; label: string }[] = [
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'bff', label: 'BFF' },
  { value: 'back', label: 'Back' },
]

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600,
  color: 'var(--color-text-3)', marginBottom: 3, textTransform: 'uppercase',
  letterSpacing: '0.5px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', borderRadius: 6,
  border: '1px solid var(--color-border-md)', fontSize: 13,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
  background: 'var(--color-surface)',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  padding: '6px 28px 6px 8px',
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23999'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function ItemDetailPanel({
  item, computed, sections, allItems,
  onUpdate, onDelete, onAddDependency, onRemoveDependency, onClose,
}: ItemDetailPanelProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    panelRef.current?.focus()
  }, [])

  const predecessors = allItems.filter((i) => item.dependsOn.includes(i.id))
  const availableDeps = allItems.filter(
    (i) => i.id !== item.id && !item.dependsOn.includes(i.id),
  )

  const duration = computed.start && computed.end ? diffDays(computed.start, computed.end) + 1 : 0

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 900 }}
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Detalhes do item"
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, maxWidth: '95vw',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        outline: 'none',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Detalhes do item</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Excluir"
              style={{
                padding: '5px 10px', borderRadius: 6, border: 'none',
                background: 'var(--color-red-light)', color: 'var(--color-red)', fontSize: 11,
                fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                transition: 'all 0.15s',
              }}
            >
              Excluir
            </button>
            <button
              onClick={onClose}
              aria-label="Fechar"
              style={{
                width: 28, height: 28, borderRadius: 6, border: 'none',
                background: 'var(--color-surface-2)', cursor: 'pointer',
                fontSize: 14, color: 'var(--color-text-2)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Computed dates bar */}
        <div style={{
          padding: '12px 16px', background: 'var(--color-surface-2)',
          borderBottom: '1px solid var(--color-border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8,
        }}>
          <div>
            <div style={labelStyle}>Início</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(computed.start)}</div>
          </div>
          <div>
            <div style={labelStyle}>Fim</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(computed.end)}</div>
          </div>
          <div>
            <div style={labelStyle}>Duração</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{duration > 0 ? `${duration} dias` : '—'}</div>
          </div>
          <div>
            <div style={labelStyle}>Status</div>
            {computed.isLate ? (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--color-red-light)', color: 'var(--color-red)', fontWeight: 700 }}>
                EM ATRASO
              </span>
            ) : computed.isCycle ? (
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'var(--color-yellow-light)', color: 'var(--color-yellow)', fontWeight: 700 }}>
                CICLO
              </span>
            ) : (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-green)' }}>OK</span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <div>
            <label style={labelStyle}>Título</label>
            <input
              value={item.title}
              onChange={(e) => onUpdate(item.id, { title: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Section + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Seção</label>
              <select
                value={item.section}
                onChange={(e) => onUpdate(item.id, { section: e.target.value as SectionId })}
                style={selectStyle}
              >
                {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prioridade</label>
              <div style={{ display: 'flex', gap: 4 }}>
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onUpdate(item.id, { priority: p })}
                    aria-pressed={item.priority === p}
                    style={{
                      flex: 1, padding: '5px 0', borderRadius: 5, fontSize: 11, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                      border: item.priority === p ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                      background: item.priority === p ? 'var(--color-blue-light)' : 'transparent',
                      color: item.priority === p ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                    }}
                  >
                    {p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stacks */}
          <div>
            <label style={labelStyle}>Stacks</label>
            <div style={{ display: 'flex', gap: 4 }}>
              {STACK_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    const next = item.stacks.includes(opt.value)
                      ? item.stacks.filter((s) => s !== opt.value)
                      : [...item.stacks, opt.value]
                    onUpdate(item.id, { stacks: next })
                  }}
                  aria-pressed={item.stacks.includes(opt.value)}
                  style={{
                    padding: '4px 10px', borderRadius: 5, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
                    border: item.stacks.includes(opt.value)
                      ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                    background: item.stacks.includes(opt.value)
                      ? 'var(--color-blue-light)' : 'transparent',
                    color: item.stacks.includes(opt.value)
                      ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Duration + Start + Deadline */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>Duração (dias)</label>
              <input
                type="number" min={1} value={item.durationDays}
                onChange={(e) => onUpdate(item.id, { durationDays: Math.max(1, parseInt(e.target.value) || 1) })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Início manual
                {item.dependsOn.length > 0 && (
                  <span style={{ fontWeight: 400, fontSize: 9, display: 'block', color: 'var(--color-text-3)' }}>
                    Calculado pelo predecessor
                  </span>
                )}
              </label>
              <input
                type="date" value={item.startDate}
                onChange={(e) => onUpdate(item.id, { startDate: e.target.value })}
                disabled={item.dependsOn.length > 0}
                style={{ ...inputStyle, opacity: item.dependsOn.length > 0 ? 0.5 : 1 }}
              />
            </div>
            <div>
              <label style={labelStyle}>Deadline fixo</label>
              <input
                type="date" value={item.deadlineDate}
                min={computed.start || item.startDate || undefined}
                onChange={(e) => {
                  const newDeadline = e.target.value
                  onUpdate(item.id, { deadlineDate: newDeadline })
                  if (item.startDate && newDeadline) {
                    const start = new Date(item.startDate)
                    const end = new Date(newDeadline)
                    const diffDaysCalc = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000))
                    onUpdate(item.id, { durationDays: diffDaysCalc })
                  }
                }}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Pct */}
          <div>
            <label style={labelStyle}>Conclusão: {item.pct}%</label>
            <input
              type="range" min={0} max={100} step={5} value={item.pct}
              onChange={(e) => onUpdate(item.id, { pct: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Resp */}
          <div>
            <label style={labelStyle}>Responsável</label>
            <input
              value={item.resp}
              onChange={(e) => onUpdate(item.id, { resp: e.target.value })}
              style={inputStyle}
            />
          </div>

          {/* Predecessors */}
          <div>
            <label style={labelStyle}>Predecessores</label>
            {predecessors.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {predecessors.map((dep) => (
                  <span key={dep.id} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '3px 8px', borderRadius: 5, fontSize: 11,
                    background: 'var(--color-blue-light)', color: 'var(--color-blue-text)',
                    fontWeight: 600,
                  }}>
                    {dep.title.slice(0, 30)}{dep.title.length > 30 ? '…' : ''}
                    <button
                      onClick={() => onRemoveDependency(item.id, dep.id)}
                      aria-label="Remover predecessor"
                      style={{
                        border: 'none', background: 'none', cursor: 'pointer',
                        color: 'var(--color-blue-text)', fontSize: 12, padding: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {availableDeps.length > 0 && (
              <select
                value=""
                onChange={(e) => { if (e.target.value) onAddDependency(item.id, e.target.value) }}
                style={{ ...selectStyle, fontSize: 12, color: 'var(--color-text-2)' }}
              >
                <option value="">+ Adicionar predecessor...</option>
                {availableDeps.map((dep) => (
                  <option key={dep.id} value={dep.id}>{dep.title}</option>
                ))}
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>Notas / sub-itens</label>
            <textarea
              value={item.notes}
              onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-family-mono)', fontSize: 12 }}
            />
          </div>

          {/* Jira */}
          <div>
            <label style={labelStyle}>Link Jira</label>
            <input
              value={item.jira}
              onChange={(e) => onUpdate(item.id, { jira: e.target.value })}
              placeholder="https://jira..."
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <ConfirmModal
          title="Excluir item"
          description={`Tem certeza que deseja excluir "${item.title}"? Esta ação não pode ser desfeita.`}
          onConfirm={() => { setShowDeleteConfirm(false); onDelete(item.id) }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </>
  )
}
