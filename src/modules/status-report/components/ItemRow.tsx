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
      className="sr-item-row"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 12px',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${PRIORITY_COLORS[item.priority] ?? '#6b7280'}`,
        borderRadius: 8,
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
        position: 'relative',
      }}
    >
      {/* Title + stacks */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--color-text)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.title || 'Sem título'}
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {item.stacks.map((s) => (
            <span key={s} style={{
              fontSize: 10, padding: '1px 6px', borderRadius: 4,
              background: 'var(--color-surface-2)', color: 'var(--color-text-2)',
              fontWeight: 600,
            }}>
              {STACK_LABELS[s] ?? s}
            </span>
          ))}
          {item.resp && (
            <span style={{ fontSize: 10, color: 'var(--color-text-3)' }}>
              {item.resp}
            </span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text)', marginBottom: 3 }}>
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
      <div style={{ width: 90, flexShrink: 0, textAlign: 'right', fontSize: 11, color: 'var(--color-text-2)' }}>
        {computed.start && computed.end
          ? `${formatDate(computed.start)} → ${formatDate(computed.end)}`
          : '—'}
      </div>

      {/* Badges */}
      <div style={{ width: 60, flexShrink: 0, textAlign: 'right' }}>
        {computed.isLate && (
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--color-red-light)', color: 'var(--color-red)', fontWeight: 700,
          }}>
            ⚠ ATRASO
          </span>
        )}
        {computed.isCycle && (
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--color-yellow-light)', color: 'var(--color-yellow)', fontWeight: 700,
          }}>
            ↻ CICLO
          </span>
        )}
        {!computed.isLate && !computed.isCycle && !computed.start && !computed.end && (
          <span style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 4,
            background: 'var(--color-surface-2)', color: 'var(--color-text-3)', fontWeight: 600,
          }}>
            Sem datas
          </span>
        )}
      </div>

      {/* Move arrows — always visible at low opacity, full on hover */}
      {(onMoveUp || onMoveDown) && (
        <div
          className="move-arrows"
          style={{
            display: 'flex', flexDirection: 'column', gap: 2,
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
              style={{
                width: 28, height: 28, border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', borderRadius: 6,
                cursor: 'pointer', fontSize: 12, lineHeight: 1,
                color: 'var(--color-text-2)',
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
              style={{
                width: 28, height: 28, border: '1px solid var(--color-border)',
                background: 'var(--color-surface)', borderRadius: 6,
                cursor: 'pointer', fontSize: 12, lineHeight: 1,
                color: 'var(--color-text-2)',
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
