import { useMemo } from 'react'

// ─── Types ────────────────────���───────────────────────────���──────────────────

interface ReleaseTimelineProps {
  cutoffDate: string
  buildDate: string
  homologStartDate: string
  homologEndDate: string
  betaDate: string
  productionDate: string
}

interface Milestone {
  key: string
  label: string
  date: string
  dateEnd?: string
  color: string
  position: number // 0–100%
}

// ─── Helpers ──��──────────────────────────────────────────────────────────────

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDateBR(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000)
}

function todayISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── Colors ───────���───────────────────────────────────────���──────────────────

const MILESTONE_COLORS: Record<string, string> = {
  cutoff: '#8b5cf6',
  build: '#3b82f6',
  homolog: '#06b6d4',
  beta: '#f59e0b',
  production: '#10b981',
}

const TODAY_COLOR = 'var(--color-blue)'

// ─── Component ─────────────────────────────────────────���─────────────────────

export function ReleaseTimeline({
  cutoffDate,
  buildDate,
  homologStartDate,
  homologEndDate,
  betaDate,
  productionDate,
}: ReleaseTimelineProps) {
  const data = useMemo(() => {
    const allDates = [cutoffDate, buildDate, homologStartDate, homologEndDate, betaDate, productionDate].filter(Boolean)
    if (allDates.length === 0) return null

    const parsedDates = allDates.map(parseDate)
    const minTime = Math.min(...parsedDates.map((d) => d.getTime()))
    const maxTime = Math.max(...parsedDates.map((d) => d.getTime()))
    const minDate = new Date(minTime)
    const maxDate = new Date(maxTime)

    const totalDays = daysBetween(minDate, maxDate)
    const paddingDays = Math.max(Math.round(totalDays * 0.08), 1)
    const spanDays = totalDays + paddingDays * 2

    function toPosition(iso: string): number {
      const d = parseDate(iso)
      const fromStart = daysBetween(minDate, d) + paddingDays
      return (fromStart / spanDays) * 100
    }

    // Build milestones — skip ones with empty dates
    const milestones: Milestone[] = []

    if (cutoffDate) {
      milestones.push({
        key: 'cutoff', label: 'Corte', date: cutoffDate,
        color: MILESTONE_COLORS.cutoff, position: toPosition(cutoffDate),
      })
    }

    if (buildDate) {
      milestones.push({
        key: 'build', label: 'Build', date: buildDate,
        color: MILESTONE_COLORS.build, position: toPosition(buildDate),
      })
    }

    if (homologStartDate || homologEndDate) {
      const dateForPos = homologStartDate || homologEndDate
      milestones.push({
        key: 'homolog', label: 'Homolog.', date: dateForPos,
        dateEnd: homologStartDate && homologEndDate ? homologEndDate : undefined,
        color: MILESTONE_COLORS.homolog, position: toPosition(dateForPos),
      })
    }

    if (betaDate) {
      milestones.push({
        key: 'beta', label: 'Beta', date: betaDate,
        color: MILESTONE_COLORS.beta, position: toPosition(betaDate),
      })
    }

    if (productionDate) {
      milestones.push({
        key: 'production', label: 'Produção', date: productionDate,
        color: MILESTONE_COLORS.production, position: toPosition(productionDate),
      })
    }

    const today = todayISO()
    const todayDate = parseDate(today)
    const todayPos = (() => {
      const fromStart = daysBetween(minDate, todayDate) + paddingDays
      return Math.max(0, Math.min(100, (fromStart / spanDays) * 100))
    })()

    const isPastProduction = productionDate && todayDate > parseDate(productionDate)
    const fillPct = Math.max(0, Math.min(100, todayPos))

    return { milestones, todayPos, fillPct, isPastProduction, today }
  }, [cutoffDate, buildDate, homologStartDate, homologEndDate, betaDate, productionDate])

  if (!data) {
    return (
      <div className="card text-body text-muted" style={{ textAlign: 'center' }}>
        Configure as datas da release para visualizar a timeline.
      </div>
    )
  }

  const { milestones, todayPos, fillPct, isPastProduction } = data

  const BAR_HEIGHT = 36
  const BAR_TOP = 28

  return (
    <div className="card" style={{ paddingBottom: 12 }}>
      {/* Status tag */}
      {isPastProduction && (
        <span className="badge badge-green" style={{ marginBottom: 10 }}>
          Concluída
        </span>
      )}

      {/* Timeline bar area */}
      <div style={{ position: 'relative', minHeight: BAR_TOP + BAR_HEIGHT + 30, marginBottom: 8 }}>
        {/* Background bar */}
        <div style={{
          position: 'absolute', top: BAR_TOP, left: 0, right: 0,
          height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2,
          background: 'var(--color-surface-2)',
        }} />

        {/* Fill bar */}
        <div style={{
          position: 'absolute', top: BAR_TOP, left: 0,
          height: BAR_HEIGHT, borderRadius: BAR_HEIGHT / 2,
          width: `${fillPct}%`,
          background: 'linear-gradient(90deg, var(--color-blue-light), rgba(24,95,165,0.3))',
          transition: 'width 0.5s ease',
        }} />

        {/* Milestones */}
        {milestones.map((m) => (
          <div
            key={m.key}
            style={{
              position: 'absolute', left: `${m.position}%`, transform: 'translateX(-50%)',
              top: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
              width: 'max-content',
            }}
          >
            <div style={{
              fontSize: 8, fontWeight: 600, color: m.color,
              whiteSpace: 'nowrap', marginBottom: 4, textTransform: 'uppercase',
            }}>
              {m.label}
            </div>
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: m.color, border: '2px solid var(--color-bg)',
              position: 'relative', zIndex: 2,
              marginTop: (BAR_HEIGHT - 12) / 2,
            }} />
            <div style={{
              fontSize: 10, fontWeight: 600, color: 'var(--color-text-2)',
              fontFamily: 'var(--font-family-mono)',
              marginTop: (BAR_HEIGHT - 12) / 2 + 4, whiteSpace: 'nowrap',
            }}>
              {m.dateEnd
                ? `${formatDateBR(m.date)}–${formatDateBR(m.dateEnd)}`
                : formatDateBR(m.date)}
            </div>
          </div>
        ))}

        {/* Today indicator */}
        {todayPos >= 0 && todayPos <= 100 && !isPastProduction && (
          <div style={{
            position: 'absolute', left: `${todayPos}%`, top: BAR_TOP - 12,
            transform: 'translateX(-50%)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 3,
          }}>
            <div style={{
              fontSize: 7, fontWeight: 800, color: TODAY_COLOR,
              textTransform: 'uppercase', letterSpacing: '0.5px',
              fontFamily: 'var(--font-family-mono)',
              marginBottom: 2, whiteSpace: 'nowrap',
            }}>
              HOJE
            </div>
            <div style={{
              width: 3, height: BAR_HEIGHT + 8,
              background: TODAY_COLOR, borderRadius: 2,
            }} />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex gap-3.5 flex-wrap" style={{ paddingTop: 8, borderTop: '1px solid var(--color-border)' }}>
        {milestones.map((m) => (
          <div key={m.key} className="flex items-center gap-1.5" style={{ fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, flexShrink: 0 }} />
            <span className="text-small" style={{ fontWeight: 500 }}>{m.label}</span>
          </div>
        ))}
        {!isPastProduction && (
          <div className="flex items-center gap-1.5" style={{ fontSize: 10 }}>
            <span style={{ width: 8, height: 2, background: TODAY_COLOR, flexShrink: 0 }} />
            <span className="text-small" style={{ fontWeight: 500 }}>Hoje</span>
          </div>
        )}
      </div>
    </div>
  )
}
