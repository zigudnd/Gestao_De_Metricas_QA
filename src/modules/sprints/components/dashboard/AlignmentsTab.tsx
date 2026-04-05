import { useSprintStore } from '../../store/sprintStore'

export function AlignmentsTab() {
  const state = useSprintStore((s) => s.state)
  const addAlignment = useSprintStore((s) => s.addAlignment)
  const updateAlignment = useSprintStore((s) => s.updateAlignment)
  const removeAlignment = useSprintStore((s) => s.removeAlignment)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="heading-sm" style={{ fontSize: 15 }}>Alinhamentos & Debitos Tecnicos</h3>
          <p className="text-body" style={{ marginTop: 4 }}>
            Registre itens acordados com o time ou debitos a resolver.
          </p>
        </div>
        <button onClick={addAlignment} className="btn btn-md btn-primary font-semibold">+ Adicionar</button>
      </div>

      {state.alignments.length === 0 ? (
        <div className="card text-center" style={{ padding: '48px 20px', color: 'var(--color-text-2)' }}>
          <p style={{ fontWeight: 600 }}>Nenhum alinhamento registrado</p>
          <p className="text-body">Adicione acordos, decisoes ou debitos tecnicos relevantes da sprint.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {state.alignments.map((a, i) => (
            <div key={a.id} className="card-sm flex gap-2.5 items-start" style={{ borderLeft: '4px solid var(--color-blue)' }}>
              <span className="shrink-0" style={{ color: 'var(--color-text-2)', fontWeight: 700, fontSize: 14, marginTop: 2 }}>{i + 1}.</span>
              <input
                type="text"
                value={a.text}
                onChange={(e) => updateAlignment(i, e.target.value)}
                placeholder="Ex: Botao na home com distanciamento errado — aprovado com debito tecnico…"
                className="input-field flex-1"
              />
              <button
                onClick={() => removeAlignment(i)}
                className="btn-destructive shrink-0"
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
