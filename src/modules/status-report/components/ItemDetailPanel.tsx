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
        onKeyDown={(e) => { if (e.key === 'Escape') onClose() }}
        className="flex flex-col"
        style={{
          position: 'fixed', top: 0, right: 0, bottom: 0,
          width: 420, maxWidth: '95vw',
          background: 'var(--color-surface)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
          zIndex: 1000,
          overflow: 'hidden',
          outline: 'none',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)' }}>
          <span className="heading-sm">Detalhes do item</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              aria-label="Excluir"
              className="btn btn-destructive"
            >
              Excluir
            </button>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="btn btn-ghost flex items-center justify-center"
              style={{ width: 28, height: 28 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Computed dates bar */}
        <div className="grid gap-2" style={{
          padding: '12px 16px', background: 'var(--color-surface-2)',
          borderBottom: '1px solid var(--color-border)',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
        }}>
          <div>
            <div className="section-label">Início</div>
            <div className="heading-sm">{formatDate(computed.start)}</div>
          </div>
          <div>
            <div className="section-label">Fim</div>
            <div className="heading-sm">{formatDate(computed.end)}</div>
          </div>
          <div>
            <div className="section-label">Duração</div>
            <div className="heading-sm">{duration > 0 ? `${duration} dias` : '—'}</div>
          </div>
          <div>
            <div className="section-label">Status</div>
            {computed.isLate ? (
              <span className="badge badge-red" style={{ fontWeight: 700 }}>
                EM ATRASO
              </span>
            ) : computed.isCycle ? (
              <span className="badge badge-yellow" style={{ fontWeight: 700 }}>
                CICLO
              </span>
            ) : (
              <span className="heading-sm" style={{ color: 'var(--color-green)' }}>OK</span>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 flex flex-col gap-3.5" style={{ overflowY: 'auto', padding: 16 }}>
          {/* Title */}
          <div>
            <label className="section-label">Título</label>
            <input
              value={item.title}
              onChange={(e) => onUpdate(item.id, { title: e.target.value })}
              className="input-field"
            />
          </div>

          {/* Section + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label">Seção</label>
              <select
                value={item.section}
                onChange={(e) => onUpdate(item.id, { section: e.target.value as SectionId })}
                className="select-field"
              >
                {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="section-label">Prioridade</label>
              <div className="flex gap-1">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onUpdate(item.id, { priority: p })}
                    aria-pressed={item.priority === p}
                    className="btn btn-sm flex-1"
                    style={{
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
            <label className="section-label">Stacks</label>
            <div className="flex gap-1">
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
                  className="btn btn-sm"
                  style={{
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
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="section-label">Duração (dias)</label>
              <input
                type="number" min={1} value={item.durationDays}
                onChange={(e) => onUpdate(item.id, { durationDays: Math.max(1, parseInt(e.target.value) || 1) })}
                className="input-field"
              />
            </div>
            <div>
              <label className="section-label">
                Início manual
                {item.dependsOn.length > 0 && (
                  <span className="text-muted" style={{ fontWeight: 400, fontSize: 9, display: 'block' }}>
                    Calculado pelo predecessor
                  </span>
                )}
              </label>
              <input
                type="date" value={item.startDate}
                onChange={(e) => onUpdate(item.id, { startDate: e.target.value })}
                disabled={item.dependsOn.length > 0}
                className="input-field"
                style={{ opacity: item.dependsOn.length > 0 ? 0.5 : 1 }}
              />
            </div>
            <div>
              <label className="section-label">Deadline fixo</label>
              <input
                type="date" value={item.deadlineDate}
                min={computed.start || item.startDate || undefined}
                onChange={(e) => onUpdate(item.id, { deadlineDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          {/* Pct */}
          <div>
            <label className="section-label">Conclusão: {item.pct}%</label>
            <input
              type="range" min={0} max={100} step={5} value={item.pct}
              onChange={(e) => onUpdate(item.id, { pct: parseInt(e.target.value) })}
              style={{ width: '100%' }}
            />
          </div>

          {/* Resp */}
          <div>
            <label className="section-label">Responsável</label>
            <input
              value={item.resp}
              onChange={(e) => onUpdate(item.id, { resp: e.target.value })}
              className="input-field"
            />
          </div>

          {/* Predecessors */}
          <div>
            <label className="section-label">Predecessores</label>
            {predecessors.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5">
                {predecessors.map((dep) => (
                  <span key={dep.id} className="badge badge-blue flex items-center gap-1" style={{ fontWeight: 600 }}>
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
                className="select-field text-small"
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
            <label className="section-label">Notas / sub-itens</label>
            <textarea
              value={item.notes}
              onChange={(e) => onUpdate(item.id, { notes: e.target.value })}
              rows={4}
              className="textarea-field"
              style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}
            />
          </div>

          {/* Jira */}
          <div>
            <label className="section-label">Link Jira</label>
            <input
              value={item.jira}
              onChange={(e) => onUpdate(item.id, { jira: e.target.value })}
              placeholder="https://jira..."
              className="input-field"
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
