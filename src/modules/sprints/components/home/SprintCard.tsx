import type { SprintIndexEntry } from '../../types/sprint.types'

function formatDateBR(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function sprintStatus(s: SprintIndexEntry): 'completed' | 'active' {
  if (s.status === 'concluida') return 'completed'
  return s.totalTests > 0 && s.totalExec >= s.totalTests ? 'completed' : 'active'
}

export interface SprintCardProps {
  sprint: SprintIndexEntry
  compareMode: boolean
  isSelected: boolean
  onClick: () => void
  onDragStart: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent, id: string) => void
  onToggleFavorite: (e: React.MouseEvent, id: string) => void
  onDuplicate: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

export function SprintCard({
  sprint,
  compareMode,
  isSelected,
  onClick,
  onDragStart,
  onDrop,
  onToggleFavorite,
  onDuplicate,
  onDelete,
}: SprintCardProps) {
  const status = sprintStatus(sprint)
  const pct = sprint.totalTests > 0 ? Math.round((sprint.totalExec / sprint.totalTests) * 100) : 0
  const period =
    sprint.startDate && sprint.endDate
      ? `${formatDateBR(sprint.startDate)} — ${formatDateBR(sprint.endDate)}`
      : 'Período não definido'

  const dotColor = status === 'completed' ? 'var(--color-green)' : 'var(--color-blue)'

  const subtitle = [
    sprint.squad,
    period,
    `${pct}% · ${sprint.totalExec}/${sprint.totalTests} testes`,
  ].filter(Boolean).join('  ·  ')

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
      role="button"
      tabIndex={0}
      onDragOver={(e) => { if (!compareMode) e.preventDefault() }}
      onDrop={(e) => { if (!compareMode) onDrop(e, sprint.id) }}
      className="hp-card-hover"
      style={{
        background: 'var(--color-surface)',
        border: isSelected
          ? '1.5px solid var(--color-blue)'
          : '0.5px solid var(--color-border)',
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, border-color 0.15s',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(59,130,246,0.12)'
          : 'none',
        position: 'relative',
      }}
    >
      {/* Left: checkbox (compare) or drag handle + dot */}
      {compareMode ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onClick()}
          onClick={(e) => e.stopPropagation()}
          style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-blue)', marginTop: 2, flexShrink: 0 }}
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 3 }}>
          <span
            draggable
            className="hp-drag-handle"
            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, sprint.id) }}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--color-text-3)',
              cursor: 'grab',
              fontSize: 10,
              opacity: 0,
              transition: 'opacity 0.15s',
              lineHeight: 1,
            }}
            title="Arrastar para reordenar"
          >
            ⠿
          </span>
          <div style={{
            width: 7, height: 7, borderRadius: '50%',
            background: dotColor, flexShrink: 0,
          }} />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            fontSize: 13, fontWeight: 700, color: 'var(--color-text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {sprint.title}
          </span>
          {sprint.sprintType && sprint.sprintType !== 'squad' && (
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8, flexShrink: 0,
              background: sprint.sprintType === 'regressivo' ? '#f97316' + '18' : 'var(--color-blue-light)',
              color: sprint.sprintType === 'regressivo' ? '#f97316' : 'var(--color-blue-text)',
              textTransform: 'uppercase',
            }}>
              {sprint.sprintType === 'regressivo' ? '🔄 REG' : '🔗 INT'}
              {sprint.releaseVersion && ` · ${sprint.releaseVersion}`}
            </span>
          )}
          {sprint.favorite && (
            <span style={{ fontSize: 11, color: 'var(--color-amber-mid)', flexShrink: 0 }}>★</span>
          )}
          {compareMode && isSelected && (
            <span style={{
              fontSize: 10, fontWeight: 600, color: 'var(--color-blue-text)',
              background: 'var(--color-blue-light)', padding: '1px 6px',
              borderRadius: 10, flexShrink: 0,
            }}>
              selecionada
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12, color: 'var(--color-text-2)', marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {subtitle}
        </div>
        {/* Mini progress bar */}
        <div style={{
          height: 3, borderRadius: 2,
          background: 'var(--color-border)',
          marginTop: 6, maxWidth: 180,
        }}>
          <div style={{
            height: '100%', width: `${pct}%`,
            background: dotColor, borderRadius: 2,
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Right actions — always visible at low opacity, full on hover */}
      <div
        className="hp-actions"
        style={{
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          opacity: compareMode ? 0 : 0.4,
          transition: 'opacity 0.15s',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Favoritar */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, sprint.id) }}
          aria-label={sprint.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={sprint.favorite}
          style={{
            height: 36, minWidth: 36, borderRadius: 8,
            border: '1px solid transparent',
            background: sprint.favorite ? 'var(--color-amber-light)' : 'transparent',
            color: sprint.favorite ? 'var(--color-amber-mid)' : 'var(--color-text-3)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 4,
            fontSize: 14, padding: '0 8px',
            transition: 'all 0.15s',
            fontFamily: 'var(--font-family-sans)',
          }}
          className="hp-fav-hover"
          data-active={sprint.favorite ? 'true' : undefined}
        >
          {sprint.favorite ? '★' : '☆'}
        </button>

        {/* Duplicar */}
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(e) }}
          aria-label="Duplicar sprint"
          style={{
            height: 36, minWidth: 36, borderRadius: 8,
            border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--color-text-3)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 5,
            fontSize: 12, fontWeight: 600, padding: '0 10px',
            transition: 'all 0.15s',
            fontFamily: 'var(--font-family-sans)',
          }}
          className="hp-btn-blue"
        >
          <span style={{ fontSize: 14 }}>⧉</span>
          <span style={{ fontSize: 11 }}>Duplicar</span>
        </button>

        {/* Excluir */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(e) }}
          aria-label="Excluir sprint"
          style={{
            height: 36, minWidth: 36, borderRadius: 8,
            border: '1px solid transparent',
            background: 'transparent',
            color: 'var(--color-text-3)',
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 5,
            fontSize: 12, fontWeight: 600, padding: '0 10px',
            transition: 'all 0.15s',
            fontFamily: 'var(--font-family-sans)',
          }}
          className="hp-btn-red"
        >
          <span style={{ fontSize: 13 }}>✕</span>
          <span style={{ fontSize: 11 }}>Excluir</span>
        </button>
      </div>
    </div>
  )
}
