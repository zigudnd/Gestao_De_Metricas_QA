import type { SprintIndexEntry } from '../../types/sprint.types'

function formatDateBR(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function formatShort(dateStr: string): string {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  return `${d}/${m}`
}

function sprintStatus(s: SprintIndexEntry): 'completed' | 'active' {
  if (s.status === 'concluida') return 'completed'
  return s.totalTests > 0 && s.totalExec >= s.totalTests ? 'completed' : 'active'
}

function daysLate(endDate: string): number {
  if (!endDate) return 0
  const end = new Date(endDate + 'T23:59:59')
  const now = new Date()
  const diff = now.getTime() - end.getTime()
  if (diff <= 0) return 0
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function Svg({ size = 14, children, filled }: { size?: number; children: React.ReactNode; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}
function IconGripDots() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
      <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
      <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
    </svg>
  )
}
function IconStar({ filled }: { filled: boolean }) {
  return <Svg filled={filled}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>
}
function IconCopy() {
  return <Svg><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></Svg>
}
function IconTrash2() {
  return <Svg><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></Svg>
}
function IconRefreshCw() {
  return <Svg size={10}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Svg>
}
function IconLink() {
  return <Svg size={10}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></Svg>
}
function IconClock() {
  return <Svg size={10}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></Svg>
}

// ─── MiniProgress (stacked) ──────────────────────────────────────────────────

function MiniProgress({ done, failed, blocked, total }: { done: number; failed: number; blocked: number; total: number }) {
  if (total === 0) {
    return (
      <span style={{ fontSize: 11, color: 'var(--color-text-3)', fontVariantNumeric: 'tabular-nums' }}>
        Sem testes
      </span>
    )
  }
  const pct = (n: number) => (n / total) * 100
  const execPct = Math.round(((done + failed + blocked) / total) * 100)
  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
      role="img"
      aria-label={`${done} de ${total} executados${failed > 0 ? `, ${failed} falhas` : ''}${blocked > 0 ? `, ${blocked} bloqueados` : ''}, ${execPct}% concluído`}
    >
      <span
        aria-hidden="true"
        style={{
          width: 140, height: 6,
          background: 'var(--color-surface-2)',
          borderRadius: 999,
          overflow: 'hidden',
          display: 'flex',
          flexShrink: 0,
        }}
      >
        {done > 0 && <span style={{ width: `${pct(done)}%`, background: 'var(--color-green)' }} />}
        {failed > 0 && <span style={{ width: `${pct(failed)}%`, background: 'var(--color-red)' }} />}
        {blocked > 0 && <span style={{ width: `${pct(blocked)}%`, background: 'var(--color-amber)' }} />}
      </span>
      <span style={{ fontSize: 11, color: 'var(--color-text-2)', fontVariantNumeric: 'tabular-nums' }}>
        <b style={{ color: 'var(--color-text)', fontWeight: 700 }}>{done}</b>/{total}
        <span style={{ color: 'var(--color-text-3)' }}> · {execPct}%</span>
      </span>
    </span>
  )
}

// ─── SprintCard ──────────────────────────────────────────────────────────────

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
  onReorder: (id: string, direction: -1 | 1) => void
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
  onReorder,
}: SprintCardProps) {
  const status = sprintStatus(sprint)
  const dotColor = status === 'completed' ? 'var(--color-green)' : 'var(--color-blue)'

  const late = status === 'active' ? daysLate(sprint.endDate || '') : 0
  const period = sprint.startDate && sprint.endDate
    ? `${formatShort(sprint.startDate)} → ${formatShort(sprint.endDate)}`
    : ''

  const isReg = sprint.sprintType === 'regressivo'
  const isInt = sprint.sprintType === 'integrado'

  return (
    <div
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).closest('[data-stop-card-key]')) return
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Abrir sprint ${sprint.title}`}
      onDragOver={(e) => { if (!compareMode) e.preventDefault() }}
      onDrop={(e) => { if (!compareMode) onDrop(e, sprint.id) }}
      className="hp-card-hover"
      style={{
        background: 'var(--color-surface)',
        border: isSelected ? '1px solid var(--color-blue)' : '1px solid var(--color-border)',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'grid',
        gridTemplateColumns: 'auto 7px 1fr auto',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        transition: 'border-color 0.12s, box-shadow 0.12s',
        boxShadow: isSelected ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
        position: 'relative',
      }}
    >
      {/* Cell 1: checkbox (compareMode) or drag handle */}
      {compareMode ? (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onClick()}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Selecionar ${sprint.title} para comparação`}
          data-stop-card-key
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--color-blue)' }}
        />
      ) : (
        <button
          data-stop-card-key
          draggable
          onDragStart={(e) => { e.stopPropagation(); onDragStart(e, sprint.id) }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); onReorder(sprint.id, -1) }
            else if (e.key === 'ArrowDown') { e.preventDefault(); onReorder(sprint.id, 1) }
          }}
          aria-label={`Reordenar "${sprint.title}" (setas ↑ e ↓ no teclado)`}
          title="Arraste ou use ↑/↓"
          className="hp-drag-btn"
          style={{
            width: 28, height: 28,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            border: 'none', borderRadius: 6,
            color: 'var(--color-text-3)',
            cursor: 'grab',
            opacity: 0.5,
            transition: 'opacity 0.12s, background 0.12s, color 0.12s',
          }}
        >
          <IconGripDots />
        </button>
      )}

      {/* Cell 2: status dot */}
      <span
        aria-hidden="true"
        style={{ width: 7, height: 7, borderRadius: 999, background: dotColor, flexShrink: 0 }}
      />

      {/* Cell 3: Main content */}
      <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 14, fontWeight: 700, color: 'var(--color-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              maxWidth: '100%',
            }}
          >
            {sprint.title}
          </span>

          {(isReg || isInt) && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 999,
                textTransform: 'uppercase',
                flexShrink: 0,
                background: isReg ? 'var(--color-amber-light)' : 'var(--color-blue-light)',
                color: isReg ? 'var(--color-amber-mid)' : 'var(--color-blue-text)',
              }}
            >
              {isReg ? <IconRefreshCw /> : <IconLink />}
              {isReg ? 'REG' : 'INT'}
              {sprint.releaseVersion ? ` · ${sprint.releaseVersion}` : ''}
            </span>
          )}

          {sprint.squad && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, fontWeight: 600,
                padding: '2px 8px',
                background: 'var(--color-surface-2)',
                color: 'var(--color-text-2)',
                borderRadius: 999,
                flexShrink: 0,
                fontFamily: 'var(--font-family-sans)',
              }}
            >
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 999, background: dotColor }} />
              {sprint.squad}
            </span>
          )}

          {late > 0 && (
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 999,
                background: 'var(--color-red-light)',
                color: 'var(--color-red)',
                flexShrink: 0,
              }}
              title={`Encerrou em ${formatDateBR(sprint.endDate)}`}
            >
              <IconClock />
              Atrasada {late} {late === 1 ? 'dia' : 'dias'}
            </span>
          )}

          {compareMode && isSelected && (
            <span
              style={{
                fontSize: 10, fontWeight: 600, color: 'var(--color-blue-text)',
                background: 'var(--color-blue-light)', padding: '1px 6px',
                borderRadius: 999, flexShrink: 0,
              }}
            >
              selecionada
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--color-text-2)', flexWrap: 'wrap' }}>
          {period && <span style={{ fontVariantNumeric: 'tabular-nums' }}>{period}</span>}
          {period && <span aria-hidden="true" style={{ color: 'var(--color-text-3)' }}>·</span>}
          <MiniProgress done={sprint.totalExec} failed={0} blocked={0} total={sprint.totalTests} />
        </div>
      </div>

      {/* Cell 4: Actions */}
      <div
        className="hp-card-actions"
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex', alignItems: 'center', gap: 2,
          flexShrink: 0,
          opacity: compareMode ? 0 : 0.7,
          transition: 'opacity 0.12s',
        }}
      >
        <button
          data-stop-card-key
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(e, sprint.id) }}
          aria-label={sprint.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          aria-pressed={sprint.favorite ? true : false}
          title={sprint.favorite ? 'Favorita' : 'Favoritar'}
          className="hp-icon-btn hp-icon-btn-fav"
          data-active={sprint.favorite ? 'true' : undefined}
          style={{
            width: 30, height: 30,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: sprint.favorite ? 'var(--color-amber-light)' : 'transparent',
            color: sprint.favorite ? 'var(--color-amber-mid)' : 'var(--color-text-3)',
            border: '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
          }}
        >
          <IconStar filled={sprint.favorite === true} />
        </button>

        <button
          data-stop-card-key
          onClick={(e) => { e.stopPropagation(); onDuplicate(e) }}
          aria-label={`Duplicar sprint ${sprint.title}`}
          title="Duplicar"
          className="hp-icon-btn"
          style={{
            width: 30, height: 30,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            color: 'var(--color-text-3)',
            border: '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
          }}
        >
          <IconCopy />
        </button>

        <button
          data-stop-card-key
          onClick={(e) => { e.stopPropagation(); onDelete(e) }}
          aria-label={`Excluir sprint ${sprint.title}`}
          title="Excluir"
          className="hp-icon-btn hp-icon-btn-danger"
          style={{
            width: 30, height: 30,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent',
            color: 'var(--color-text-3)',
            border: '1px solid transparent',
            borderRadius: 6,
            cursor: 'pointer',
            transition: 'background 0.12s, color 0.12s, border-color 0.12s',
          }}
        >
          <IconTrash2 />
        </button>
      </div>

      <style>{`
        .hp-card-hover:hover { border-color: var(--color-border-md) !important; box-shadow: 0 1px 4px rgba(17,24,39,.05) !important; }
        .hp-card-hover:hover .hp-card-actions { opacity: 1 !important; }
        .hp-card-hover:hover .hp-drag-btn { opacity: 1 !important; }
        .hp-drag-btn:hover, .hp-drag-btn:focus { background: var(--color-surface-2); color: var(--color-text-2); outline: none; opacity: 1 !important; }
        .hp-icon-btn:hover { background: var(--color-bg); color: var(--color-text); border-color: var(--color-border) !important; }
        .hp-icon-btn-fav:not([data-active="true"]):hover { background: var(--color-amber-light); color: var(--color-amber-mid); }
        .hp-icon-btn-danger:hover { background: var(--color-red-light) !important; color: var(--color-red) !important; border-color: transparent !important; }
      `}</style>
    </div>
  )
}
