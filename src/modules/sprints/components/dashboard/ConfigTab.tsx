import { useSprintStore } from '../../store/sprintStore'
import type { SprintConfig } from '../../types/sprint.types'

const ROLE_SUGGESTIONS = ['PO', 'TL', 'Coordenador', 'Gerente', 'Dev Lead', 'Scrum Master', 'Designer', 'Dev']

export function ConfigTab() {
  const state = useSprintStore((s) => s.state)
  const updateConfig = useSprintStore((s) => s.updateConfig)
  const addResponsible = useSprintStore((s) => s.addResponsible)
  const updateResponsible = useSprintStore((s) => s.updateResponsible)
  const removeResponsible = useSprintStore((s) => s.removeResponsible)

  function field(key: keyof SprintConfig, type: 'text' | 'number' | 'date' = 'text') {
    const value = state.config[key]
    return (
      <input
        type={type}
        value={String(value ?? '')}
        onChange={(e) => updateConfig(key, type === 'number' ? Number(e.target.value) : e.target.value)}
        style={inputStyle}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Sprint info */}
      <Card title="Informações da Sprint">
        <div style={grid2}>
          <FormGroup label="Título">
            <input
              type="text"
              value={state.config.title}
              onChange={(e) => updateConfig('title', e.target.value)}
              style={inputStyle}
              placeholder="Ex: QA Dashboard — Sprint 12"
            />
          </FormGroup>
          <FormGroup label="Squad / Time">
            {field('squad')}
          </FormGroup>
          <FormGroup label="QA Responsável">
            {field('qaName')}
          </FormGroup>
          <FormGroup label="Versão Alvo">
            {field('targetVersion')}
          </FormGroup>
          <FormGroup label="Data de Início">
            {field('startDate', 'date')}
          </FormGroup>
          <FormGroup label="Data de Fim">
            {field('endDate', 'date')}
          </FormGroup>
          <FormGroup label="Duração (dias)">
            <input
              type="number"
              value={state.config.sprintDays}
              onChange={(e) => updateConfig('sprintDays', Number(e.target.value))}
              style={inputStyle}
              min={1}
              placeholder="20"
            />
          </FormGroup>
          <FormGroup label="Fins de semana">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', paddingTop: 6 }}>
              <input
                type="checkbox"
                checked={!state.config.excludeWeekends}
                onChange={(e) => updateConfig('excludeWeekends', !e.target.checked)}
                style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-blue)' }}
              />
              <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                Incluir fins de semana na duração
              </span>
            </label>
          </FormGroup>
        </div>
      </Card>

      {/* Outros Responsáveis */}
      <Card title="Outros Responsáveis">
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16 }}>
          Adicione os demais responsáveis da sprint (PO, TL, Coordenador, Gerente, etc.).
          Eles aparecerão no Termo de Conclusão.
        </p>
        <datalist id="role-suggestions">
          {ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}
        </datalist>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {(state.responsibles ?? []).map((r, i) => (
            <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 32px', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                list="role-suggestions"
                placeholder="Cargo (ex: PO)"
                value={r.role}
                onChange={(e) => updateResponsible(i, 'role', e.target.value)}
                style={inputStyle}
              />
              <input
                type="text"
                placeholder="Nome completo"
                value={r.name}
                onChange={(e) => updateResponsible(i, 'name', e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={() => removeResponsible(i)}
                title="Remover"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--color-text-2)', lineHeight: 1 }}
              >✕</button>
            </div>
          ))}
        </div>
        <button
          onClick={addResponsible}
          style={{ padding: '7px 14px', border: '1px dashed var(--color-border-md)', borderRadius: 8, background: 'transparent', color: 'var(--color-text-2)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}
        >
          + Adicionar responsável
        </button>
      </Card>

      {/* Health Score */}
      <Card title="Health Score — Pesos das Penalidades">
        <p style={{ fontSize: 13, color: 'var(--color-text-2)', marginBottom: 16 }}>
          Configura o quanto cada evento desconta do Health Score (base 100).
        </p>
        <div style={grid4}>
          <FormGroup label="Bug Crítico">
            <input type="number" min={0} value={state.config.hsCritical} onChange={(e) => updateConfig('hsCritical', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Alto">
            <input type="number" min={0} value={state.config.hsHigh} onChange={(e) => updateConfig('hsHigh', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Médio">
            <input type="number" min={0} value={state.config.hsMedium} onChange={(e) => updateConfig('hsMedium', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Bug Baixo">
            <input type="number" min={0} value={state.config.hsLow} onChange={(e) => updateConfig('hsLow', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Reteste">
            <input type="number" min={0} value={state.config.hsRetest} onChange={(e) => updateConfig('hsRetest', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Tela Bloqueada">
            <input type="number" min={0} value={state.config.hsBlocked} onChange={(e) => updateConfig('hsBlocked', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
          <FormGroup label="Caso em Atraso">
            <input type="number" min={0} value={state.config.hsDelayed} onChange={(e) => updateConfig('hsDelayed', Number(e.target.value))} style={inputStyle} />
          </FormGroup>
        </div>
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>
        {title}
      </div>
      <div style={{ padding: 20 }}>
        {children}
      </div>
    </div>
  )
}

function FormGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  )
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

const grid2: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: 16,
}

const grid4: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
  gap: 16,
}
