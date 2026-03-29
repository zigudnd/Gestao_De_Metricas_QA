import { useState } from 'react'
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

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600,
  color: 'var(--color-text-2)', marginBottom: 4,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: 7,
  border: '1px solid var(--color-border-md)', fontSize: 13,
  fontFamily: 'var(--font-family-sans)', color: 'var(--color-text)',
  background: 'var(--color-surface)',
}

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
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.45)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderTop: '3px solid var(--color-blue)',
        borderRadius: 12, padding: 24,
        width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)', marginBottom: 16 }}>
          Novo Item
        </div>

        {/* Title */}
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Título *</label>
          <input
            value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Nome do item" autoFocus style={inputStyle}
          />
        </div>

        {/* Section + Priority */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Seção</label>
            <select value={section} onChange={(e) => setSection(e.target.value as SectionId)} style={inputStyle}>
              {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Prioridade</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPriority(p)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
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
          <label style={labelStyle}>Stacks</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {STACK_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleStack(opt.value)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>% Conclusão: {pct}%</label>
            <input
              type="range" min={0} max={100} step={5} value={pct}
              onChange={(e) => setPct(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={labelStyle}>Responsável</label>
            <input value={resp} onChange={(e) => setResp(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Advanced fields toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 600, color: 'var(--color-blue-text)',
            padding: '4px 0', marginBottom: showAdvanced ? 12 : 16,
            fontFamily: 'var(--font-family-sans)',
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
            {/* Duration + Start + Deadline */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Duração (dias)</label>
                <input
                  type="number" min={1} value={durationDays}
                  onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Início manual</label>
                <input
                  type="date" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={dependsOn.length > 0}
                  style={{ ...inputStyle, opacity: dependsOn.length > 0 ? 0.5 : 1 }}
                />
              </div>
              <div>
                <label style={labelStyle} title="Sobrescreve a data calculada">Deadline fixo</label>
                <input
                  type="date" value={deadlineDate}
                  onChange={(e) => setDeadlineDate(e.target.value)}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Predecessors */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Predecessores</label>
              <div style={{
                maxHeight: 120, overflowY: 'auto',
                border: '1px solid var(--color-border)', borderRadius: 7, padding: 6,
              }}>
                {grouped.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--color-text-3)', padding: 4 }}>Nenhum item disponível</div>
                )}
                {grouped.map((g) => (
                  <div key={g.id}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: g.color, padding: '4px 4px 2px', textTransform: 'uppercase' }}>
                      {g.label.split(' – ')[0]}
                    </div>
                    {g.items.map((item) => (
                      <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={dependsOn.includes(item.id)}
                          onChange={() => toggleDep(item.id)}
                        />
                        <span style={{ color: 'var(--color-text)' }}>{item.title}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Notas / sub-itens (cada linha = sub-item)</label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--font-family-mono)', fontSize: 12 }}
              />
            </div>

            {/* Jira */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Link Jira</label>
              <input value={jira} onChange={(e) => setJira(e.target.value)} placeholder="https://jira..." style={inputStyle} />
            </div>
          </>
        )}

        {/* Actions */}
        {/* Validation error */}
        {validationError && (
          <div style={{
            padding: '8px 12px', borderRadius: 7, marginBottom: 12,
            background: 'var(--color-red-light)', color: 'var(--color-red)',
            fontSize: 12, fontWeight: 600,
          }}>
            {validationError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 18px', borderRadius: 8,
              border: '1px solid var(--color-border-md)',
              background: 'transparent', color: 'var(--color-text-2)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim()}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: title.trim() ? 'var(--color-blue)' : '#ccc',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-family-sans)',
            }}
          >
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
