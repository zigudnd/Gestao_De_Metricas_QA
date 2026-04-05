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
      onDragOver={(e) => { if (!compareMode) e.preventDefault() }}
      onDrop={(e) => { if (!compareMode) onDrop(e, sprint.id) }}
      className="hp-card-hover flex items-start gap-2.5 cursor-pointer rounded-[10px] p-[10px_16px] bg-[var(--color-surface)] relative transition-[box-shadow,border-color] duration-150"
      style={{
        border: isSelected
          ? '1.5px solid var(--color-blue)'
          : '0.5px solid var(--color-border)',
        boxShadow: isSelected
          ? '0 0 0 3px rgba(59,130,246,0.12)'
          : 'none',
      }}
    >
      {/* Left: checkbox (compare) or drag handle + dot */}
      {compareMode ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onClick()}
          onClick={(e) => e.stopPropagation()}
          className="w-[15px] h-[15px] cursor-pointer mt-0.5 shrink-0"
          style={{ accentColor: 'var(--color-blue)' }}
        />
      ) : (
        <div className="flex items-center gap-1.5 shrink-0 mt-[3px]">
          <span
            draggable
            className="hp-drag-handle text-[var(--color-text-3)] cursor-grab text-[10px] opacity-0 transition-opacity duration-150 leading-none"
            onDragStart={(e) => { e.stopPropagation(); onDragStart(e, sprint.id) }}
            onClick={(e) => e.stopPropagation()}
            title="Arrastar para reordenar"
          >
            ⠿
          </span>
          <div
            className="w-[7px] h-[7px] rounded-full shrink-0"
            style={{ background: dotColor }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[var(--color-text)] overflow-hidden text-ellipsis whitespace-nowrap">
            {sprint.title}
          </span>
          {sprint.sprintType && sprint.sprintType !== 'squad' && (
            <span
              className="text-[9px] font-bold py-px px-1.5 rounded-lg shrink-0 uppercase"
              style={{
                background: sprint.sprintType === 'regressivo' ? '#f9731618' : 'var(--color-blue-light)',
                color: sprint.sprintType === 'regressivo' ? '#f97316' : 'var(--color-blue-text)',
              }}
            >
              {sprint.sprintType === 'regressivo' ? '🔄 REG' : '🔗 INT'}
              {sprint.releaseVersion && ` · ${sprint.releaseVersion}`}
            </span>
          )}
          {sprint.favorite && (
            <span className="text-[11px] text-[var(--color-amber-mid)] shrink-0">★</span>
          )}
          {compareMode && isSelected && (
            <span className="badge badge-blue shrink-0">
              selecionada
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--color-text-2)] mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {subtitle}
        </div>
        {/* Mini progress bar */}
        <div className="h-[3px] rounded-sm bg-[var(--color-border)] mt-1.5 max-w-[180px]">
          <div
            className="h-full rounded-sm transition-[width] duration-300"
            style={{ width: `${pct}%`, background: dotColor }}
          />
        </div>
      </div>

      {/* Right actions — always visible at low opacity, full on hover */}
      <div
        className="hp-actions flex items-center gap-1 shrink-0 transition-opacity duration-150"
        style={{ opacity: compareMode ? 0 : 0.4 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Favoritar */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, sprint.id) }}
          aria-label={sprint.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={sprint.favorite}
          className="hp-fav-hover h-9 min-w-9 rounded-lg border border-transparent cursor-pointer flex items-center justify-center gap-1 text-sm px-2 transition-all duration-150"
          style={{
            background: sprint.favorite ? 'var(--color-amber-light)' : 'transparent',
            color: sprint.favorite ? 'var(--color-amber-mid)' : 'var(--color-text-3)',
          }}
          data-active={sprint.favorite ? 'true' : undefined}
        >
          {sprint.favorite ? '★' : '☆'}
        </button>

        {/* Duplicar */}
        <button
          onClick={(e) => { e.stopPropagation(); onDuplicate(e) }}
          aria-label="Duplicar sprint"
          className="hp-btn-blue h-9 min-w-9 rounded-lg border border-transparent bg-transparent text-[var(--color-text-3)] cursor-pointer flex items-center justify-center gap-[5px] text-xs font-semibold px-2.5 transition-all duration-150"
        >
          <span className="text-sm">⧉</span>
          <span className="text-[11px]">Duplicar</span>
        </button>

        {/* Excluir */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(e) }}
          aria-label="Excluir sprint"
          className="hp-btn-red h-9 min-w-9 rounded-lg border border-transparent bg-transparent text-[var(--color-text-3)] cursor-pointer flex items-center justify-center gap-[5px] text-xs font-semibold px-2.5 transition-all duration-150"
        >
          <span className="text-[13px]">✕</span>
          <span className="text-[11px]">Excluir</span>
        </button>
      </div>
    </div>
  )
}
