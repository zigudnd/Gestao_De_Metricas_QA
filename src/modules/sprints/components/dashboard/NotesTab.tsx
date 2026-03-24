import { useSprintStore } from '../../store/sprintStore'
import type { Notes } from '../../types/sprint.types'

export function NotesTab() {
  const state = useSprintStore((s) => s.state)
  const updateNotes = useSprintStore((s) => s.updateNotes)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-blue)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>🗒️ Notas Operacionais</span>
          <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>massas de teste · anotações diárias · observações pessoais</span>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <textarea
            value={state.notes.operationalNotes}
            onChange={(e) => updateNotes('operationalNotes', e.target.value)}
            placeholder="Use este espaço livremente: massas de dados, cenários manuais, observações do dia, links úteis, comandos de teste…"
            rows={10}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--color-border-md)',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.7,
              color: 'var(--color-text)',
              background: 'var(--color-bg)',
              fontFamily: 'var(--font-family-mono)',
              resize: 'vertical',
              boxSizing: 'border-box',
              outline: 'none',
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-blue)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-md)')}
          />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
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
