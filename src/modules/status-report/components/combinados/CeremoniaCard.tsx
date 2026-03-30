import type { Cerimonia } from '../../types/squadConfig.types'

interface CeremoniaCardProps {
  cerimonia: Cerimonia
  onRemove: (id: string) => void
}

export function CeremoniaCard({ cerimonia, onRemove }: CeremoniaCardProps) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px',
      background: 'var(--color-surface)',
      border: '0.5px solid var(--color-border)',
      borderRadius: 8,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>
          {cerimonia.nome}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
          {cerimonia.dia} · {cerimonia.duracao}
        </div>
      </div>
      <button
        onClick={() => onRemove(cerimonia.id)}
        style={{
          width: 22, height: 22, borderRadius: 4, border: 'none',
          background: 'none', color: 'var(--color-text-3)', cursor: 'pointer',
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, opacity: 0.4, transition: 'opacity 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--color-red)' }}
        onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--color-text-3)' }}
        title="Remover"
      >
        ×
      </button>
    </div>
  )
}
