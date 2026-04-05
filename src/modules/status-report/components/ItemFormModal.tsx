import { useState, useRef, useEffect } from 'react'
import type { SectionId, Priority, Stack, StatusReportItem, SectionDef } from '../types/statusReport.types'

type NewItemData = Omit<StatusReportItem, 'id' | 'createdAt' | 'updatedAt'>

interface ItemFormModalProps {
  defaultSection: SectionId
  sections: SectionDef[]
  existingItems: StatusReportItem[]
  onConfirm: (data: NewItemData) => void
  onCancel: () => void
}

const STACK_OPTIONS: { value: Stack; label: string }[] = [
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
  { value: 'bff', label: 'BFF' },
  { value: 'back', label: 'Back' },
]

export function ItemFormModal({ defaultSection, sections, existingItems, onConfirm, onCancel }: ItemFormModalProps) {
  const [title, setTitle] = useState('')
  const [section, setSection] = useState<SectionId>(defaultSection)
  const [priority, setPriority] = useState<Priority>('medium')
  const [stacks, setStacks] = useState<Stack[]>([])
  const [durationDays, setDurationDays] = useState(5)
  const [startDate, setStartDate] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [dependsOn, setDependsOn] = useState<string[]>([])
  const [pct, setPct] = useState(0)
  const [resp, setResp] = useState('')
  const [notes, setNotes] = useState('')
  const [jira, setJira] = useState('')

  function toggleStack(s: Stack) {
    setStacks((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s])
  }

  function toggleDep(id: string) {
    setDependsOn((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  const modalContentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    modalContentRef.current?.focus()
  }, [])

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [validationError, setValidationError] = useState('')

  function handleSubmit() {
    if (!title.trim()) return
    // Validar deadline >= start (Risco 5)
    if (deadlineDate && startDate && deadlineDate < startDate) {
      setValidationError('A data de deadline não pode ser anterior à data de início.')
      return
    }
    // Validar duração mínima (Risco 2)
    const safeDuration = Math.max(1, durationDays)
    setValidationError('')
    onConfirm({
      title: title.trim(),
      section, priority, stacks, resp,
      pct, startDate, durationDays: safeDuration, deadlineDate,
      dependsOn, jira, notes,
    })
  }

  // Group existing items by section for predecessor select
  const grouped = sections.map((sec) => ({
    ...sec,
    items: existingItems.filter((i) => i.section === sec.id),
  })).filter((g) => g.items.length > 0)

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { onCancel() }
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { handleSubmit() }
      }}
      className="modal-backdrop"
    >
      <div ref={modalContentRef} tabIndex={-1} className="modal-container modal-md" style={{
        borderTop: '3px solid var(--color-blue)',
        maxHeight: '90vh', overflowY: 'auto',
        outline: 'none',
      }}>
        <div className="heading-sm" style={{ marginBottom: 16 }}>
          Novo Item
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <label className="label-field">Título *</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do item" autoFocus className="input-field"
          />
        </div>

        {/* Section + Priority */}
        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
          <div>
            <label className="label-field">Seção</label>
            <select value={section} onChange={(e) => setSection(e.target.value as SectionId)} className="select-field">
              {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label-field">Prioridade</label>
            <div className="flex gap-1.5">
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  aria-pressed={priority === p}
                  className="btn btn-sm flex-1"
                  style={{
                    border: priority === p ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                    background: priority === p ? 'var(--color-blue-light)' : 'transparent',
                    color: priority === p ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                  }}
                >
                  {p === 'high' ? 'Alta' : p === 'medium' ? 'Média' : 'Baixa'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stacks */}
        <div style={{ marginBottom: 12 }}>
          <label className="label-field">Stacks</label>
          <div className="flex gap-1.5">
            {STACK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleStack(opt.value)}
                aria-pressed={stacks.includes(opt.value)}
                className="btn btn-sm"
                style={{
                  border: stacks.includes(opt.value)
                    ? '2px solid var(--color-blue)' : '1px solid var(--color-border-md)',
                  background: stacks.includes(opt.value)
                    ? 'var(--color-blue-light)' : 'transparent',
                  color: stacks.includes(opt.value)
                    ? 'var(--color-blue-text)' : 'var(--color-text-2)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pct + Resp — always visible */}
        <div className="grid grid-cols-2 gap-3" style={{ marginBottom: 12 }}>
          <div>
            <label className="label-field">% Conclusão: {pct}%</label>
            <input
              type="range" min={0} max={100} step={5} value={pct}
              onChange={(e) => setPct(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label className="label-field">Responsável</label>
            <input value={resp} onChange={(e) => setResp(e.target.value)} className="input-field" />
          </div>
        </div>

        {/* Advanced fields toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn btn-ghost flex items-center gap-1.5"
          style={{
            color: 'var(--color-blue-text)',
            padding: '4px 0', marginBottom: showAdvanced ? 12 : 16,
          }}
        >
          <span style={{
            display: 'inline-block', transition: 'transform 0.15s',
            transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
            fontSize: 10,
          }}>▶</span>
          {showAdvanced ? 'Menos opções' : 'Mais opções'} (datas, predecessores, notas, Jira)
        </button>

        {showAdvanced && (
          <>
            {/* Duration + Start + Deadline (auto-cálculo bidirecional) */}
            <div className="grid grid-cols-3 gap-3" style={{ marginBottom: 12 }}>
              <div>
                <label className="label-field">Duração (dias)</label>
                <input
                  type="number" min={1} value={durationDays}
                  onChange={(e) => {
                    const d = Math.max(1, parseInt(e.target.value) || 1)
                    setDurationDays(d)
                    // Auto-calcular deadline a partir de início + duração
                    if (startDate) {
                      const end = new Date(startDate + 'T00:00:00')
                      end.setDate(end.getDate() + d - 1)
                      setDeadlineDate(end.toISOString().split('T')[0])
                    }
                  }}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-field">
                  Início manual
                  {dependsOn.length > 0 && (
                    <span className="text-muted" style={{ fontWeight: 400, fontSize: 10, display: 'block', marginTop: 1 }}>
                      Calculado pelos predecessores
                    </span>
                  )}
                </label>
                <input
                  type="date" value={startDate}
                  onChange={(e) => {
                    const s = e.target.value
                    setStartDate(s)
                    // Auto-calcular deadline a partir de início + duração
                    if (s && durationDays > 0) {
                      const end = new Date(s + 'T00:00:00')
                      end.setDate(end.getDate() + durationDays - 1)
                      setDeadlineDate(end.toISOString().split('T')[0])
                    }
                  }}
                  disabled={dependsOn.length > 0}
                  className="input-field"
                  style={{ opacity: dependsOn.length > 0 ? 0.5 : 1 }}
                />
              </div>
              <div>
                <label className="label-field">
                  Deadline
                  <span className="text-muted" style={{ fontWeight: 400, fontSize: 10, display: 'block', marginTop: 1 }}>
                    {startDate ? 'Auto-calculado' : 'Manual'}
                  </span>
                </label>
                <input
                  type="date" value={deadlineDate}
                  min={startDate || undefined}
                  onChange={(e) => {
                    const dl = e.target.value
                    setDeadlineDate(dl)
                    // Recalcular duração a partir de início → deadline
                    if (startDate && dl) {
                      const diff = Math.round(
                        (new Date(dl + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / 86400000
                      ) + 1
                      if (diff >= 1) setDurationDays(diff)
                    }
                  }}
                  className="input-field"
                />
              </div>
            </div>

            {/* Predecessors */}
            <div style={{ marginBottom: 12 }}>
              <label className="label-field">
                Predecessores{dependsOn.length > 0 && (
                  <span className="badge badge-blue" style={{ marginLeft: 6, fontWeight: 700 }}>
                    {dependsOn.length}
                  </span>
                )}
              </label>
              <div style={{
                maxHeight: 120, overflowY: 'auto',
                border: '1px solid var(--color-border)', borderRadius: 7, padding: 6,
              }}>
                {grouped.length === 0 && (
                  <div className="text-small text-muted" style={{ padding: 4 }}>Nenhum item disponível</div>
                )}
                {grouped.map((g) => (
                  <div key={g.id}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: g.color, padding: '4px 4px 2px', textTransform: 'uppercase' }}>
                      {g.label.split(' – ')[0]}
                    </div>
                    {g.items.map((item) => (
                      <label key={item.id} className="flex items-center gap-1.5" style={{ padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={dependsOn.includes(item.id)}
                          onChange={() => toggleDep(item.id)}
                        />
                        <span>{item.title}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 12 }}>
              <label className="label-field">Notas / sub-itens (cada linha = sub-item)</label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={3} className="textarea-field" style={{ fontFamily: 'var(--font-family-mono)', fontSize: 12 }}
              />
            </div>

            {/* Jira */}
            <div style={{ marginBottom: 16 }}>
              <label className="label-field">Link Jira</label>
              <input value={jira} onChange={(e) => setJira(e.target.value)} placeholder="https://jira..." className="input-field" />
            </div>
          </>
        )}

        {/* Validation error */}
        {validationError && (
          <div className="msg-error" style={{ marginBottom: 12, fontSize: 12, fontWeight: 600 }}>
            {validationError}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="btn btn-outline btn-md">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            className="btn btn-primary btn-md"
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
