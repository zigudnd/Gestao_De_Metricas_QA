import { useMemo, useState, memo } from 'react'
import type { StatusReportItem, SectionDef, ComputedDatesMap } from '../types/statusReport.types'

interface ReportDashboardProps {
  sections: SectionDef[]
  items: StatusReportItem[]
  computedDates: ComputedDatesMap
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STACK_LABELS: Record<string, string> = {
  ios: 'iOS', android: 'Android', bff: 'BFF', back: 'Back',
}

function pctColor(pct: number): string {
  if (pct >= 80) return 'var(--color-green)'
  if (pct >= 50) return 'var(--color-amber-mid)'
  return 'var(--color-red)'
}

function priorityLabel(p: string): string {
  if (p === 'high') return 'Alta'
  if (p === 'medium') return 'Média'
  return 'Baixa'
}

// ─── Metrics computation ──────────────────────────────────────────────────────

function computeMetrics(items: StatusReportItem[], computedDates: ComputedDatesMap) {
  const total = items.length
  if (total === 0) {
    return {
      total: 0,
      avgProgress: 0,
      lateCount: 0,
      noDateCount: 0,
      highPriorityStalled: 0,
      cascadeRisk: 0,
      byResp: [] as { name: string; count: number }[],
      byStack: [] as { stack: string; label: string; count: number }[],
      bySectionPct: [] as { id: string; label: string; color: string; count: number; pct: number }[],
    }
  }

  const avgProgress = Math.round(items.reduce((sum, i) => sum + i.pct, 0) / total)
  const lateCount = items.filter((i) => computedDates[i.id]?.isLate).length
  const noDateCount = items.filter((i) => !i.startDate && !i.deadlineDate).length
  const highPriorityStalled = items.filter(
    (i) => i.priority === 'high' && i.pct < 30,
  ).length

  const lateIds = new Set(items.filter((i) => computedDates[i.id]?.isLate).map((i) => i.id))
  const cascadeRisk = items.filter(
    (i) => i.dependsOn.some((depId) => lateIds.has(depId)),
  ).length

  const respMap = new Map<string, number>()
  for (const item of items) {
    const name = item.resp?.trim() || 'Sem responsável'
    respMap.set(name, (respMap.get(name) || 0) + 1)
  }
  const byResp = [...respMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  const stackMap = new Map<string, number>()
  for (const item of items) {
    for (const s of item.stacks) {
      stackMap.set(s, (stackMap.get(s) || 0) + 1)
    }
  }
  const byStack = [...stackMap.entries()]
    .map(([stack, count]) => ({ stack, label: STACK_LABELS[stack] || stack, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    avgProgress,
    lateCount,
    noDateCount,
    highPriorityStalled,
    cascadeRisk,
    byResp,
    byStack,
    bySectionPct: [],
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const KpiCard = memo(function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent: string
}) {
  return (
    <div className="card-sm" style={{
      flex: '1 1 0', minWidth: 120,
      borderTop: `3px solid ${accent}`,
    }}>
      <div className="section-label" style={{ marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div className="text-small" style={{ marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  )
})

const ProgressRing = memo(function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const stroke = 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const color = pctColor(pct)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }} role="img" aria-label={`Progresso: ${pct}%`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--color-border)" strokeWidth={stroke}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
})

const HBar = memo(function HBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-small">
      <span style={{
        width: 90, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', color: 'var(--color-text-2)', flexShrink: 0,
      }}>
        {label}
      </span>
      <div className="flex-1" style={{ height: 8, borderRadius: 4, background: 'var(--color-border)' }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          background: color, transition: 'width 0.4s ease',
          minWidth: value > 0 ? 4 : 0,
        }} />
      </div>
      <span style={{ width: 24, textAlign: 'right', fontWeight: 700, flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
})

// ─── Main component ───────────────────────────────────────────────────────────

export function ReportDashboard({ sections, items, computedDates }: ReportDashboardProps) {
  const [collapsed, setCollapsed] = useState(false)

  const metrics = useMemo(
    () => computeMetrics(items, computedDates),
    [items, computedDates],
  )

  const sectionBars = useMemo(() => {
    return sections.map((sec) => {
      const count = items.filter((i) => i.section === sec.id).length
      const shortLabel = sec.label.split(' – ')[0].split(' / ')[0]
      return { id: sec.id, label: shortLabel, color: sec.color, count }
    })
  }, [sections, items])

  const maxResp = metrics.byResp.length > 0 ? metrics.byResp[0].count : 0
  const maxStack = metrics.byStack.length > 0 ? metrics.byStack[0].count : 0
  const maxSection = Math.max(...sectionBars.map((s) => s.count), 1)

  if (metrics.total === 0) {
    return (
      <div className="card text-center text-muted mb-4" style={{ fontSize: 13 }}>
        Nenhum item no report. Adicione itens para ver os indicadores.
      </div>
    )
  }

  return (
    <div className="mb-4" style={{
      borderRadius: 10,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-label="Expandir ou recolher dashboard"
        className="w-full flex items-center gap-2 section-label"
        style={{
          padding: '10px 16px', border: 'none', background: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
        }}
      >
        <span style={{
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s', display: 'inline-block', fontSize: 10,
        }}>
          ▼
        </span>
        Dashboard
        <span className="text-muted" style={{
          fontWeight: 500, textTransform: 'none', letterSpacing: 0,
        }}>
          — {metrics.total} itens · {metrics.avgProgress}% concluído
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Row 1: KPI cards */}
          <div className="flex flex-wrap gap-2.5 mb-3.5">
            {/* Progresso geral */}
            <div className="card-sm flex items-center gap-3" style={{
              flex: '1 1 0', minWidth: 140,
              borderTop: `3px solid ${pctColor(metrics.avgProgress)}`,
            }}>
              <ProgressRing pct={metrics.avgProgress} />
              <div>
                <div className="section-label" style={{ marginBottom: 2 }}>
                  Progresso Geral
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: pctColor(metrics.avgProgress), lineHeight: 1.1 }}>
                  {metrics.avgProgress}%
                </div>
              </div>
            </div>

            <KpiCard
              label="Atrasados"
              value={metrics.lateCount}
              sub={metrics.lateCount > 0 ? 'passaram do deadline' : 'nenhum atraso'}
              accent={metrics.lateCount > 0 ? 'var(--color-red)' : 'var(--color-green)'}
            />

            <KpiCard
              label="Sem Data"
              value={metrics.noDateCount}
              sub={metrics.noDateCount > 0 ? 'sem start/deadline' : 'todos com data'}
              accent={metrics.noDateCount > 0 ? 'var(--color-amber-mid)' : 'var(--color-green)'}
            />

            <KpiCard
              label="Risco Cadeia"
              value={metrics.cascadeRisk}
              sub={metrics.cascadeRisk > 0 ? 'dependem de atrasados' : 'sem cascata'}
              accent={metrics.cascadeRisk > 0 ? 'var(--color-red)' : 'var(--color-green)'}
            />
          </div>

          {/* Alert: alta prioridade parada */}
          {metrics.highPriorityStalled > 0 && (
            <div className="msg-error flex items-center gap-2 mb-3.5" style={{ fontWeight: 600, fontSize: 12 }}>
              <span style={{ fontSize: 14 }}>!</span>
              {metrics.highPriorityStalled} {metrics.highPriorityStalled === 1 ? 'item' : 'itens'} de alta prioridade com menos de 30% de progresso
            </div>
          )}

          {/* Row 2: Bars — Sections + Responsáveis + Stacks */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {/* Distribuição por seção */}
            <div className="card-sm">
              <div className="section-label" style={{ marginBottom: 10 }}>
                Por Seção
              </div>
              <div className="flex flex-col gap-1.5">
                {sectionBars.filter((s) => s.count > 0).map((s) => (
                  <HBar key={s.id} label={s.label} value={s.count} max={maxSection} color={s.color} />
                ))}
              </div>
            </div>

            {/* Carga por responsável */}
            <div className="card-sm">
              <div className="section-label" style={{ marginBottom: 10 }}>
                Por Responsável
              </div>
              <div className="flex flex-col gap-1.5">
                {metrics.byResp.length === 0 && (
                  <span className="text-small text-muted">Nenhum responsável atribuído</span>
                )}
                {metrics.byResp.slice(0, 6).map((r) => (
                  <HBar key={r.name} label={r.name} value={r.count} max={maxResp} color="var(--color-blue)" />
                ))}
                {metrics.byResp.length > 6 && (
                  <span className="text-small text-muted">
                    +{metrics.byResp.length - 6} outros
                  </span>
                )}
              </div>
            </div>

            {/* Cobertura por stack */}
            <div className="card-sm">
              <div className="section-label" style={{ marginBottom: 10 }}>
                Por Stack
              </div>
              <div className="flex flex-col gap-1.5">
                {metrics.byStack.length === 0 && (
                  <span className="text-small text-muted">Nenhuma stack atribuída</span>
                )}
                {metrics.byStack.map((s) => (
                  <HBar key={s.stack} label={s.label} value={s.count} max={maxStack} color="var(--color-cyan, #06b6d4)" />
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Priority breakdown mini row */}
          <div className="card-sm flex items-center gap-3.5" style={{ marginTop: 14 }}>
            <span className="section-label" style={{ flexShrink: 0, marginBottom: 0 }}>
              Prioridade
            </span>
            {(['high', 'medium', 'low'] as const).map((p) => {
              const count = items.filter((i) => i.priority === p).length
              const colors = { high: 'var(--color-red-mid)', medium: 'var(--color-amber-mid)', low: 'var(--color-text-3)' }
              return (
                <div key={p} className="flex items-center gap-1.5 text-small">
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: colors[p], flexShrink: 0,
                  }} />
                  <span style={{ color: 'var(--color-text-2)' }}>{priorityLabel(p)}</span>
                  <span style={{ fontWeight: 700 }}>{count}</span>
                </div>
              )
            })}
            <div className="flex-1" />
            <span className="text-small text-muted">
              Total: <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{metrics.total}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
