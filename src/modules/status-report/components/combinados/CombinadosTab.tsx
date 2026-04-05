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
    addCerimonia, removeCerimonia, updateCerimonia,
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
        color="var(--color-blue)"
        items={dor}
        onAdd={addDorItem}
        onRemove={removeDorItem}
        onUpdate={updateDorItem}
        placeholder="Ex: Historia tem criterios de aceite definidos..."
      />

      {/* 2. DoD */}
      <SectionList
        title="Definition of Done (DoD)"
        color="var(--color-green-mid)"
        items={dod}
        onAdd={addDodItem}
        onRemove={removeDodItem}
        onUpdate={updateDodItem}
        placeholder="Ex: Codigo revisado por pelo menos 1 dev..."
      />

      {/* 3. Cerimônias */}
      <div className="mb-3" style={{
        border: '0.5px solid var(--color-border)',
        borderLeft: '4px solid var(--color-yellow)',
        borderRadius: 10, overflow: 'hidden',
      }}>
        <button
          onClick={() => setCerCollapsed(!cerCollapsed)}
          className="w-full flex items-center gap-2.5"
          style={{
            padding: '12px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
          }}
        >
          <span className="text-muted" style={{
            fontSize: 10, transition: 'transform 0.15s', display: 'inline-block',
            transform: cerCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}>▼</span>
          <span className="heading-sm">Cerimônias</span>
          <span className="badge badge-yellow">{cerimonias.length}</span>
        </button>

        {!cerCollapsed && (
          <div style={{ padding: '0 16px 14px' }}>
            {cerimonias.length === 0 && (
              <p className="text-small text-muted" style={{ fontStyle: 'italic', margin: '0 0 10px' }}>
                Nenhuma cerimônia cadastrada.
              </p>
            )}
            <div className="flex flex-col gap-1.5">
              {cerimonias.map((c) => (
                <CeremoniaCard key={c.id} cerimonia={c} onRemove={removeCerimonia} onUpdate={updateCerimonia} />
              ))}
            </div>

            {/* Add form */}
            <div className="flex gap-2 mt-2.5 flex-wrap">
              <input
                value={cerNome} onChange={(e) => setCerNome(e.target.value)}
                placeholder="Nome (ex: Daily)"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCerimonia() }}
                className="input-field"
                style={{ flex: 2, minWidth: 120, padding: '6px 10px', fontSize: 12 }}
              />
              <input
                value={cerDia} onChange={(e) => setCerDia(e.target.value)}
                placeholder="Dia/horário (ex: Seg a Sex — 09h30)"
                className="input-field"
                style={{ flex: 3, minWidth: 180, padding: '6px 10px', fontSize: 12 }}
              />
              <input
                value={cerDuracao} onChange={(e) => setCerDuracao(e.target.value)}
                placeholder="Duração (ex: 15 min)"
                className="input-field"
                style={{ flex: 1, minWidth: 80, padding: '6px 10px', fontSize: 12 }}
              />
              <button
                onClick={handleAddCerimonia}
                disabled={!cerNome.trim()}
                className="btn btn-sm"
                style={{
                  background: cerNome.trim() ? 'var(--color-yellow)' : 'var(--color-border)',
                  color: '#fff', whiteSpace: 'nowrap',
                }}
              >
                + Add
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Story Points */}
      <div className="mb-3" style={{
        border: '0.5px solid var(--color-border)',
        borderLeft: '4px solid var(--color-blue)',
        borderRadius: 10, overflow: 'hidden',
      }}>
        <button
          onClick={() => setSpCollapsed(!spCollapsed)}
          className="w-full flex items-center gap-2.5"
          style={{
            padding: '12px 16px', border: 'none', background: 'none',
            cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
          }}
        >
          <span className="text-muted" style={{
            fontSize: 10, transition: 'transform 0.15s', display: 'inline-block',
            transform: spCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          }}>▼</span>
          <span className="heading-sm">Story Points</span>
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
        color="var(--color-blue)"
        items={acordos}
        onAdd={addAcordo}
        onRemove={removeAcordo}
        onUpdate={updateAcordo}
        placeholder="Ex: Pull requests respondidos em ate 4h..."
      />
    </div>
  )
}
