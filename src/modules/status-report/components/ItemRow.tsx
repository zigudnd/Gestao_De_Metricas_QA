import { memo } from 'react'
import type { StatusReportItem, ComputedDates } from '../types/statusReport.types'

interface ItemRowProps {
  item: StatusReportItem
  computed: ComputedDates
  onClick: () => void
  sectionColor: string
  onMoveUp?: () => void
  onMoveDown?: () => void
}

const PRIORITY_COLORS: Record<string, string> = {
  high: 'var(--color-red-mid)',
  medium: 'var(--color-amber-mid)',
  low: 'var(--color-green-mid)',
}

const STACK_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  bff: 'BFF',
  back: 'Back',
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}`
}

export const ItemRow = memo(function ItemRow({ item, computed, onClick, sectionColor, onMoveUp, onMoveDown }: ItemRowProps) {

  return (
    <div
      onClick={onClick}
      className="sr-item-row card-sm flex items-center gap-2.5"
      style={{
        borderLeft: `3px solid ${PRIORITY_COLORS[item.priority] ?? '#6b7280'}`,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        position: 'relative',
      }}
    >
      {/* Title + stacks */}
      <div className="flex-1 min-w-0">
        <div className="heading-sm" style={{
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title || 'Sem título'}
        </div>
        <div className="flex gap-1 mt-1 flex-wrap">
          {item.stacks.map((s) => (
            <span key={s} className="badge badge-neutral">
              {STACK_LABELS[s] ?? s}
            </span>
          ))}
          {item.resp && (
            <span className="text-small text-muted">
              {item.resp}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>
          {item.pct}%
        </div>
        <div style={{ height: 4, borderRadius: 2, background: 'var(--color-surface-2)' }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: sectionColor,
            width: `${Math.min(100, item.pct)}%`,
            transition: 'width 0.2s',
          }} />
        </div>
      </div>

      {/* Dates */}
      <div className="text-small" style={{ width: 90, flexShrink: 0, textAlign: 'right' }}>
        {computed.start && computed.end
          ? `${formatDate(computed.start)} → ${formatDate(computed.end)}`
          : '—'}
      </div>

      {/* Badges */}
      <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
        {computed.isLate && (
          <span className="badge badge-red" style={{ fontWeight: 700 }}>
            ⚠ ATRASO
          </span>
        )}
        {computed.isCycle && (
          <span className="badge badge-yellow" style={{ fontWeight: 700 }}>
            ↻ CICLO
          </span>
        )}
        {!computed.isLate && !computed.isCycle && !computed.start && !computed.end && (
          <span className="badge badge-neutral">
            Sem datas
          </span>
        )}
      </div>

      {/* Move arrows — always visible at low opacity, full on hover */}
      {(onMoveUp || onMoveDown) && (
        <div
          className="move-arrows flex flex-col gap-0.5"
          style={{
            opacity: 0.3, transition: 'opacity 0.15s',
            position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onMoveUp && (
            <button
              onClick={onMoveUp}
              title="Mover para seção anterior"
              aria-label="Mover para seção anterior"
              className="btn btn-ghost"
              style={{
                width: 28, height: 28,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              ↑
            </button>
          )}
          {onMoveDown && (
            <button
              onClick={onMoveDown}
              title="Mover para próxima seção"
              aria-label="Mover para próxima seção"
              className="btn btn-ghost"
              style={{
                width: 28, height: 28,
                border: '1px solid var(--color-border)',
                background: 'var(--color-surface)',
              }}
            >
              ↓
            </button>
          )}
        </div>
      )}

      {/* Inline CSS for hover */}
      <style>{`
        .sr-item-row:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08) !important; }
        div:hover > .move-arrows { opacity: 1 !important; }
      `}</style>
    </div>
  )
})
