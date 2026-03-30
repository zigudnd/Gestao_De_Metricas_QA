import { useState } from 'react'
import { useSquadConfigStore } from '../../store/squadConfigStore'
import { SectionList } from './SectionList'
import { CeremoniaCard } from './CeremoniaCard'
import { StoryPointsSelector } from './StoryPointsSelector'

export function CombinadosTab() {
  const {
    dor, dod, acordos, cerimonias, storyPointsMethod, storyPointsNotas,
    addDorItem, removeDorItem, updateDorItem,
    addDodItem, removeDodItem, updateDodItem,
    addAcordo, removeAcordo, updateAcordo,
    addCerimonia, removeCerimonia,
    setStoryPointsMethod, setStoryPointsNotas,
  } = useSquadConfigStore()

  const [cerNome, setCerNome] = useState('')
  const [cerDia, setCerDia] = useState('')
  const [cerDuracao, setCerDuracao] = useState('')
  const [cerCollapsed, setCerCollapsed] = useState(false)
  const [spCollapsed, setSpCollapsed] = useState(false)

  function handleAddCerimonia() {
    if (!cerNome.trim()) return
    addCerimonia({ nome: cerNome.trim(), dia: cerDia.trim(), duracao: cerDuracao.trim() })
    setCerNome('')
    setCerDia('')
    setCerDuracao('')
  }

  return (
    <div style={{ maxWidth: 800 }}>
      {/* 1. DoR */}
      <SectionList
        title="Definition of Ready (DoR)"
        color="#378ADD"
        items={dor}
        onAdd={addDorItem}
        onRemove={removeDorItem}
        onUpdate={updateDorItem}
        placeholder="Ex: Historia tem criterios de aceite definidos..."
      />

      {/* 2. DoD */}
      <SectionList
        title="Definition of Done (DoD)"
        color="#10b981"
        items={dod}
        onAdd={addDodItem}
        onRemove={removeDodItem}
        onUpdate={updateDodItem}
        placeholder="Ex: Codigo revisado por pelo menos 1 dev..."
      />

      {/* 3. Cerimonias */}
      <div style={{
        border: '0.5px solid var(--color-border)',
        borderLeft: '4px solid #f59e0b',
        borderRadius: 10, overflow: 'hidden', marginBottom: 12,
      }}>
        <button
          onClick={() => setCerCollapsed(!cerCollapsed)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
          }}
        >
          <span style={{
            fontSize: 10, transition: 'transform 0.15s', display: 'inline-block',
            transform: cerCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            color: 'var(--color-text-3)',
          }}>▼</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Cerimonias</span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '1px 8px', borderRadius: 10,
            background: '#f59e0b18', color: '#f59e0b',
          }}>{cerimonias.length}</span>
        </button>

        {!cerCollapsed && (
          <div style={{ padding: '0 16px 14px' }}>
            {cerimonias.length === 0 && (
              <p style={{ fontSize: 12, color: 'var(--color-text-3)', fontStyle: 'italic', margin: '0 0 10px' }}>
                Nenhuma cerimonia cadastrada.
              </p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cerimonias.map((c) => (
                <CeremoniaCard key={c.id} cerimonia={c} onRemove={removeCerimonia} />
              ))}
            </div>

            {/* Add form */}
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <input
                value={cerNome} onChange={(e) => setCerNome(e.target.value)}
                placeholder="Nome (ex: Daily)"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCerimonia() }}
                style={{ ...inputSm, flex: 2, minWidth: 120 }}
              />
              <input
                value={cerDia} onChange={(e) => setCerDia(e.target.value)}
                placeholder="Dia/horario (ex: Seg a Sex — 09h30)"
                style={{ ...inputSm, flex: 3, minWidth: 180 }}
              />
              <input
                value={cerDuracao} onChange={(e) => setCerDuracao(e.target.value)}
                placeholder="Duracao (ex: 15 min)"
                style={{ ...inputSm, flex: 1, minWidth: 80 }}
              />
              <button
                onClick={handleAddCerimonia}
                disabled={!cerNome.trim()}
                style={{
                  padding: '6px 14px', borderRadius: 6, border: 'none',
                  background: cerNome.trim() ? '#f59e0b' : 'var(--color-border)',
                  color: '#fff', fontSize: 12, fontWeight: 600,
                  cursor: cerNome.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: 'var(--font-family-sans)', whiteSpace: 'nowrap',
                }}
              >
                + Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Story Points */}
      <div style={{
        border: '0.5px solid var(--color-border)',
        borderLeft: '4px solid #8b5cf6',
        borderRadius: 10, overflow: 'hidden', marginBottom: 12,
      }}>
        <button
          onClick={() => setSpCollapsed(!spCollapsed)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
          }}
        >
          <span style={{
            fontSize: 10, transition: 'transform 0.15s', display: 'inline-block',
            transform: spCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            color: 'var(--color-text-3)',
          }}>▼</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Story Points</span>
        </button>

        {!spCollapsed && (
          <div style={{ padding: '0 16px 14px' }}>
            <StoryPointsSelector
              selected={storyPointsMethod}
              notas={storyPointsNotas}
              onSelect={setStoryPointsMethod}
              onNotasChange={setStoryPointsNotas}
            />
          </div>
        )}
      </div>

      {/* 5. Acordos */}
      <SectionList
        title="Acordos de Trabalho"
        color="#06b6d4"
        items={acordos}
        onAdd={addAcordo}
        onRemove={removeAcordo}
        onUpdate={updateAcordo}
        placeholder="Ex: Pull requests respondidos em ate 4h..."
      />
    </div>
  )
}

const inputSm: React.CSSProperties = {
  padding: '6px 10px', fontSize: 12,
  border: '1px solid var(--color-border-md)', borderRadius: 6,
  background: 'var(--color-bg)', color: 'var(--color-text)',
  outline: 'none', fontFamily: 'var(--font-family-sans)',
}
