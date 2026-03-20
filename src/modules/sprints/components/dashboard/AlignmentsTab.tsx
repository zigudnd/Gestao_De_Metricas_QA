import { useSprintStore } from '../../store/sprintStore'

export function AlignmentsTab() {
  const state = useSprintStore((s) => s.state)
  const addAlignment = useSprintStore((s) => s.addAlignment)
  const updateAlignment = useSprintStore((s) => s.updateAlignment)
  const removeAlignment = useSprintStore((s) => s.removeAlignment)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Alinhamentos & Débitos Técnicos</h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginTop: 4 }}>
            Registre itens acordados com o time ou débitos a resolver.
          </p>
        </div>
        <button onClick={addAlignment} style={btnPrimary}>+ Adicionar</button>
      </div>

      {state.alignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-text-2)', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
          <p style={{ fontWeight: 600 }}>Nenhum alinhamento registrado</p>
          <p style={{ fontSize: 13 }}>Adicione acordos, decisões ou débitos técnicos relevantes da sprint.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {state.alignments.map((a, i) => (
            <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-blue)', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ color: 'var(--color-text-2)', fontWeight: 700, fontSize: 14, flexShrink: 0, marginTop: 2 }}>{i + 1}.</span>
              <input
                type="text"
                value={a.text}
                onChange={(e) => updateAlignment(i, e.target.value)}
                placeholder="Ex: Botão na home com distanciamento errado — aprovado com débito técnico…"
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  border: '1px solid var(--color-border-md)',
                  borderRadius: 6,
                  fontSize: 13,
                  color: 'var(--color-text)',
                  background: 'var(--color-bg)',
                  fontFamily: 'var(--font-family-sans)',
                }}
              />
              <button
                onClick={() => removeAlignment(i)}
                style={{ background: 'transparent', border: '1px solid var(--color-border-md)', borderRadius: 6, padding: '5px 8px', cursor: 'pointer', color: 'var(--color-red)', fontSize: 13, flexShrink: 0 }}
              >
                🗑
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  background: 'var(--color-blue)',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
  fontFamily: 'var(--font-family-sans)',
}
