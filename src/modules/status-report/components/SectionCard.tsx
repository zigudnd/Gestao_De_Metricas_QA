import { memo } from 'react'
import type { SectionDef, StatusReportItem, ComputedDatesMap, SectionId } from '../types/statusReport.types'
import { ItemRow } from './ItemRow'

interface SectionCardProps {
  section: SectionDef
  allSections: SectionDef[]
  items: StatusReportItem[]
  computedDates: ComputedDatesMap
  isCollapsed: boolean
  onToggle: () => void
  onItemClick: (id: string) => void
  onAddItem: () => void
  onMoveItem: (id: string, targetSection: SectionId) => void
}

export const SectionCard = memo(function SectionCard({
  section, allSections, items, computedDates, isCollapsed,
  onToggle, onItemClick, onAddItem, onMoveItem,
}: SectionCardProps) {
  const sectionIdx = allSections.findIndex((s) => s.id === section.id)

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Header */}
      <button
        onClick={onToggle}
        aria-expanded={!isCollapsed}
        aria-label={`${isCollapsed ? 'Expandir' : 'Recolher'} seção ${section.label}`}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'var(--color-surface)',
          border: 'none', cursor: 'pointer',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--color-border)',
        }}
      >
        <span style={{
          width: 4, height: 22, borderRadius: 2,
          background: section.color, flexShrink: 0,
        }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', flex: 1, textAlign: 'left' }}>
          {section.label}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 700, color: section.color,
          background: section.color + '18',
          padding: '2px 8px', borderRadius: 10,
        }}>
          {items.length}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--color-text-3)',
          transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)',
          transition: 'transform 0.15s',
        }}>
          ▾
        </span>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--color-text-3)', textAlign: 'center', padding: 12 }}>
              Nenhum item nesta seção
            </div>
          )}
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              computed={computedDates[item.id] ?? { start: '', end: '', isCycle: false, isLate: false }}
              sectionColor={section.color}
              onClick={() => onItemClick(item.id)}
              onMoveUp={sectionIdx > 0 ? () => onMoveItem(item.id, allSections[sectionIdx - 1].id) : undefined}
              onMoveDown={sectionIdx < allSections.length - 1 ? () => onMoveItem(item.id, allSections[sectionIdx + 1].id) : undefined}
            />
          ))}
          <button
            onClick={onAddItem}
            aria-label={`Adicionar item na seção ${section.label}`}
            className="sr-add-item-btn"
            style={{
              '--section-color': section.color,
              width: '100%', padding: '8px 0',
              background: 'none', border: '1px dashed var(--color-border-md)',
              borderRadius: 6, cursor: 'pointer',
              fontSize: 12, color: 'var(--color-text-3)',
              fontFamily: 'var(--font-family-sans)',
              transition: 'border-color 0.15s, color 0.15s',
            } as React.CSSProperties}
          >
            + Adicionar item
          </button>
          <style>{`
            .sr-add-item-btn:hover { border-color: var(--section-color) !important; color: var(--section-color) !important; }
          `}</style>
        </div>
      )}
    </div>
  )
})
