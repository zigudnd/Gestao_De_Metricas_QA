import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import type { StatusReportItem, ComputedDatesMap, SectionDef } from '../types/statusReport.types'
import { diffDays } from '../services/dateEngine'

interface GanttViewProps {
  sections: SectionDef[]
  items: StatusReportItem[]
  computedDates: ComputedDatesMap
  onItemClick: (id: string) => void
}

const ROW_H = 34
const NAME_W = 200
const DAY_W = 20
const PAD_TOP = 36

// getSectionColor is defined inside the component to use props

function formatWeekLabel(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  return `${day}/${mon}`
}

export function GanttView({ sections, items, computedDates, onItemClick }: GanttViewProps) {
  function getSectionColor(sectionId: string): string {
    return sections.find((s) => s.id === sectionId)?.color ?? '#6b7280'
  }

  // Filter items that have computed dates
  const visibleItems = useMemo(() =>
    items.filter((i) => {
      const c = computedDates[i.id]
      return c && c.start && c.end && !c.isCycle
    }),
  [items, computedDates])

  // Compute timeline range
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (visibleItems.length === 0) return { minDate: '', maxDate: '', totalDays: 0 }
    let min = '9999-12-31'
    let max = '0000-01-01'
    for (const item of visibleItems) {
      const c = computedDates[item.id]
      if (c.start < min) min = c.start
      if (c.end > max) max = c.end
    }
    // Add 2 days padding on each side
    const dMin = new Date(min + 'T00:00:00')
    dMin.setDate(dMin.getDate() - 2)
    const dMax = new Date(max + 'T00:00:00')
    dMax.setDate(dMax.getDate() + 5)
    const mStr = dMin.toISOString().split('T')[0]
    const xStr = dMax.toISOString().split('T')[0]
    return { minDate: mStr, maxDate: xStr, totalDays: diffDays(mStr, xStr) + 1 }
  }, [visibleItems, computedDates])

  const svgW = totalDays * DAY_W
  const svgH = PAD_TOP + visibleItems.length * ROW_H + 20

  // Generate week ticks
  const weekTicks = useMemo(() => {
    if (!minDate || totalDays === 0) return []
    const ticks: { x: number; label: string }[] = []
    const d = new Date(minDate + 'T00:00:00')
    // Find first Monday
    while (d.getDay() !== 1) d.setDate(d.getDate() + 1)
    while (true) {
      const iso = d.toISOString().split('T')[0]
      const dayOffset = diffDays(minDate, iso)
      if (dayOffset > totalDays) break
      ticks.push({ x: dayOffset * DAY_W, label: formatWeekLabel(d) })
      d.setDate(d.getDate() + 7)
    }
    return ticks
  }, [minDate, totalDays])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 10)
  }, [])

  useEffect(() => {
    checkScroll()
    const el = scrollRef.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    return () => { el.removeEventListener('scroll', checkScroll); window.removeEventListener('resize', checkScroll) }
  }, [checkScroll, visibleItems.length])

  if (visibleItems.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 200, color: 'var(--color-text-3)', fontSize: 14,
      }}>
        Nenhum item com datas calculadas para exibir no Gantt.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: 10 }}>
      {/* Names column */}
      <div style={{
        width: NAME_W, flexShrink: 0,
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
      }}>
        <div style={{ height: PAD_TOP, borderBottom: '1px solid var(--color-border)' }} />
        {visibleItems.map((item) => (
          <div
            key={item.id}
            onClick={() => onItemClick(item.id)}
            style={{
              height: ROW_H, display: 'flex', alignItems: 'center',
              padding: '0 10px', cursor: 'pointer',
              borderBottom: '1px solid var(--color-border)',
              fontSize: 12, color: 'var(--color-text)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
            title={item.title}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: getSectionColor(item.section),
              marginRight: 8, flexShrink: 0,
            }} />
            {item.title.length > 22 ? item.title.slice(0, 22) + '…' : item.title}
          </div>
        ))}
      </div>

      {/* SVG timeline */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {canScrollRight && (
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 32,
            background: 'linear-gradient(to right, transparent, var(--color-bg))',
            pointerEvents: 'none', zIndex: 1,
          }} />
        )}
      <div ref={scrollRef} style={{ overflowX: 'auto', overflowY: 'hidden' }}>
        <svg width={svgW} height={svgH} style={{ display: 'block' }}>
          {/* Week ticks */}
          {weekTicks.map((tick, i) => (
            <g key={i}>
              <line x1={tick.x} y1={0} x2={tick.x} y2={svgH} stroke="var(--color-border)" strokeWidth={1} />
              <text x={tick.x + 3} y={14} fontSize={10} fill="var(--color-text-3)">
                {tick.label}
              </text>
            </g>
          ))}

          {/* Today line */}
          {(() => {
            const today = new Date().toISOString().split('T')[0]
            const offset = diffDays(minDate, today)
            if (offset < 0 || offset > totalDays) return null
            const x = offset * DAY_W
            return <line x1={x} y1={0} x2={x} y2={svgH} stroke="var(--color-red-mid)" strokeWidth={1.5} strokeDasharray="4 2" />
          })()}

          {/* Header border */}
          <line x1={0} y1={PAD_TOP} x2={svgW} y2={PAD_TOP} stroke="var(--color-border)" strokeWidth={1} />

          {/* Row borders + bars */}
          {visibleItems.map((item, idx) => {
            const c = computedDates[item.id]
            const startOffset = diffDays(minDate, c.start)
            const endOffset = diffDays(minDate, c.end)
            const barX = startOffset * DAY_W
            const barW = Math.max((endOffset - startOffset + 1) * DAY_W, 4)
            const y = PAD_TOP + idx * ROW_H
            const color = getSectionColor(item.section)

            return (
              <g key={item.id}>
                {/* Row border */}
                <line x1={0} y1={y + ROW_H} x2={svgW} y2={y + ROW_H} stroke="var(--color-border)" strokeWidth={0.5} />

                {/* Background bar */}
                <rect
                  x={barX} y={y + 8} width={barW} height={ROW_H - 16}
                  rx={4} fill={color} opacity={0.25}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onItemClick(item.id)}
                />

                {/* Progress overlay */}
                <rect
                  x={barX} y={y + 8}
                  width={Math.max(barW * (item.pct / 100), 0)}
                  height={ROW_H - 16}
                  rx={4} fill={color} opacity={0.85}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onItemClick(item.id)}
                />

                {/* Pct label */}
                {barW > 30 && (
                  <text
                    x={barX + 6} y={y + ROW_H / 2 + 4}
                    fontSize={10} fill="#fff" fontWeight={700}
                  >
                    {item.pct}%
                  </text>
                )}

                {/* Late badge */}
                {c.isLate && (
                  <g>
                    <rect x={barX + barW + 4} y={y + 10} width={46} height={14} rx={3} fill="var(--color-red-light)" />
                    <text x={barX + barW + 8} y={y + 20} fontSize={9} fill="var(--color-red)" fontWeight={700}>
                      ATRASO
                    </text>
                  </g>
                )}
              </g>
            )
          })}

          {/* Dependency lines */}
          {visibleItems.map((item) => {
            const c = computedDates[item.id]
            const itemIdx = visibleItems.indexOf(item)

            return item.dependsOn.map((depId) => {
              const depItem = visibleItems.find((i) => i.id === depId)
              if (!depItem) return null
              const depC = computedDates[depId]
              if (!depC || !depC.end || !c.start) return null
              const depIdx = visibleItems.indexOf(depItem)

              const fromX = diffDays(minDate, depC.end) * DAY_W + DAY_W
              const fromY = PAD_TOP + depIdx * ROW_H + ROW_H / 2
              const toX = diffDays(minDate, c.start) * DAY_W
              const toY = PAD_TOP + itemIdx * ROW_H + ROW_H / 2
              const midX = (fromX + toX) / 2

              return (
                <g key={`${depId}-${item.id}`}>
                  <path
                    d={`M${fromX},${fromY} C${midX},${fromY} ${midX},${toY} ${toX},${toY}`}
                    fill="none" stroke="var(--color-text-3)" strokeWidth={1}
                    strokeDasharray="4 3" opacity={0.6}
                  />
                  {/* Arrow head */}
                  <polygon
                    points={`${toX},${toY} ${toX - 5},${toY - 3} ${toX - 5},${toY + 3}`}
                    fill="var(--color-text-3)" opacity={0.6}
                  />
                </g>
              )
            })
          })}
        </svg>
      </div>
      </div>
    </div>
  )
}
