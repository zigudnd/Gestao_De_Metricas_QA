import { useSprintStore } from '../../store/sprintStore'
import type { Notes } from '../../types/sprint.types'

export function NotesTab() {
  const state = useSprintStore((s) => s.state)
  const updateNotes = useSprintStore((s) => s.updateNotes)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
      <NoteArea
        label="Premissas do Ciclo de Testes"
        field="premises"
        value={state.notes.premises}
        placeholder="Liste as premissas acordadas para este ciclo de testes…"
        onChange={(v) => updateNotes('premises', v)}
        color="#eff6ff"
        borderColor="#bfdbfe"
        textColor="#1e3a8a"
      />
      <NoteArea
        label="Plano de Ação"
        field="actionPlan"
        value={state.notes.actionPlan}
        placeholder="Descreva o plano de ação para riscos ou pontos de atenção…"
        onChange={(v) => updateNotes('actionPlan', v)}
        color="#fef2f2"
        borderColor="#fecaca"
        textColor="#991b1b"
      />
    </div>
  )
}

function NoteArea({
  label, value, placeholder, onChange, color, borderColor, textColor,
}: {
  label: string
  field: keyof Notes
  value: string
  placeholder: string
  onChange: (v: string) => void
  color: string
  borderColor: string
  textColor: string
}) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
        {label}
      </div>
      <div style={{ padding: 14 }}>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `1px solid ${borderColor}`,
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--color-text)',
            background: color,
            fontFamily: 'var(--font-family-sans)',
            resize: 'vertical',
            lineHeight: 1.6,
            boxSizing: 'border-box',
          }}
        />
        {value && (
          <div style={{ marginTop: 10, padding: '10px 12px', background: color, border: `1px solid ${borderColor}`, borderRadius: 8, fontSize: 13, color: textColor, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {value}
          </div>
        )}
      </div>
    </div>
  )
}
