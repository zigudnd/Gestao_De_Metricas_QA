import type { StoryPointsMethod } from '../../types/squadConfig.types'

interface StoryPointsSelectorProps {
  selected: StoryPointsMethod
  notas: string
  onSelect: (method: StoryPointsMethod) => void
  onNotasChange: (notas: string) => void
}

const METHOD_LABELS: Record<StoryPointsMethod, string> = {
  fibonacci:      'Fibonacci (1, 2, 3, 5, 8, 13, 21)',
  tshirt:         'T-Shirt (XS, S, M, L, XL)',
  linear:         'Linear (1, 2, 3, 4, 5)',
  powers_of_two:  'Powers of 2 (1, 2, 4, 8, 16)',
  planning_poker: 'Planning Poker',
}

const METHODS = Object.keys(METHOD_LABELS) as StoryPointsMethod[]

export function StoryPointsSelector({ selected, notas, onSelect, onNotasChange }: StoryPointsSelectorProps) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {METHODS.map((m) => (
          <button
            key={m}
            onClick={() => onSelect(m)}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
              border: selected === m ? '2px solid #8b5cf6' : '1px solid var(--color-border-md)',
              background: selected === m ? '#8b5cf618' : 'transparent',
              color: selected === m ? '#8b5cf6' : 'var(--color-text-2)',
              transition: 'all 0.15s',
            }}
          >
            {METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      <textarea
        value={notas}
        onChange={(e) => onNotasChange(e.target.value)}
        placeholder="Notas sobre a escala (opcional)"
        rows={2}
        style={{
          width: '100%', padding: '8px 10px', fontSize: 12,
          border: '1px solid var(--color-border-md)', borderRadius: 6,
          background: 'var(--color-bg)', color: 'var(--color-text)',
          outline: 'none', fontFamily: 'var(--font-family-sans)',
          resize: 'vertical', boxSizing: 'border-box',
        }}
      />
    </div>
  )
}
