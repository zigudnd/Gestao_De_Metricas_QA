import { useMemo, useState } from 'react'
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

  // Progresso geral
  const avgProgress = Math.round(items.reduce((sum, i) => sum + i.pct, 0) / total)

  // Atrasados
  const lateCount = items.filter((i) => computedDates[i.id]?.isLate).length

  // Sem data
  const noDateCount = items.filter((i) => !i.startDate && !i.deadlineDate).length

  // Alta prioridade parados (high + pct < 30)
  const highPriorityStalled = items.filter(
    (i) => i.priority === 'high' && i.pct < 30,
  ).length

  // Dependências em cadeia (itens que dependem de itens atrasados)
  const lateIds = new Set(items.filter((i) => computedDates[i.id]?.isLate).map((i) => i.id))
  const cascadeRisk = items.filter(
    (i) => i.dependsOn.some((depId) => lateIds.has(depId)),
  ).length

  // Carga por responsável
  const respMap = new Map<string, number>()
  for (const item of items) {
    const name = item.resp?.trim() || 'Sem responsável'
    respMap.set(name, (respMap.get(name) || 0) + 1)
  }
  const byResp = [...respMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Cobertura por stack
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
    bySectionPct: [], // preenchido fora
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent: string
}) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: 120,
      padding: '12px 14px', borderRadius: 10,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderTop: `3px solid ${accent}`,
    }}>
      <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: accent, lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--color-text-2)', marginTop: 3 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function ProgressRing({ pct, size = 48 }: { pct: number; size?: number }) {
  const stroke = 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference
  const color = pctColor(pct)

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
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
}

function HBar({ label, value, max, color }: {
  label: string; value: number; max: number; color: string
}) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
      <span style={{
        width: 90, overflow: 'hidden', textOverflow: 'ellipsis',
        whiteSpace: 'nowrap', color: 'var(--color-text-2)', flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: 'var(--color-border)',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', borderRadius: 4,
          background: color, transition: 'width 0.4s ease',
          minWidth: value > 0 ? 4 : 0,
        }} />
      </div>
      <span style={{ width: 24, textAlign: 'right', fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
}

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
      <div style={{
        padding: '10px 16px', marginBottom: 16, borderRadius: 10,
        background: 'var(--color-surface)', border: '1px solid var(--color-border)',
        fontSize: 13, color: 'var(--color-text-3)', textAlign: 'center',
      }}>
        Nenhum item no report. Adicione itens para ver os indicadores.
      </div>
    )
  }

  return (
    <div style={{
      marginBottom: 16, borderRadius: 10,
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      overflow: 'hidden',
    }}>
      {/* Toggle header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', border: 'none', background: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-family-sans)',
          color: 'var(--color-text-2)', fontSize: 12, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}
      >
        <span style={{
          transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s', display: 'inline-block', fontSize: 10,
        }}>
          ▼
        </span>
        Dashboard
        <span style={{
          fontWeight: 500, textTransform: 'none', letterSpacing: 0,
          color: 'var(--color-text-3)',
        }}>
          — {metrics.total} itens · {metrics.avgProgress}% concluído
        </span>
      </button>

      {!collapsed && (
        <div style={{ padding: '0 16px 16px' }}>
          {/* Row 1: KPI cards */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {/* Progresso geral */}
            <div style={{
              flex: '1 1 0', minWidth: 140,
              padding: '12px 14px', borderRadius: 10,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderTop: `3px solid ${pctColor(metrics.avgProgress)}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <ProgressRing pct={metrics.avgProgress} />
              <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-3)', fontWeight: 600, marginBottom: 2 }}>
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 14px', borderRadius: 8,
              background: 'var(--color-red-light)',
              border: '1px solid var(--color-red)',
              marginBottom: 14, fontSize: 12, color: 'var(--color-red)',
              fontWeight: 600,
            }}>
              <span style={{ fontSize: 14 }}>!</span>
              {metrics.highPriorityStalled} {metrics.highPriorityStalled === 1 ? 'item' : 'itens'} de alta prioridade com menos de 30% de progresso
            </div>
          )}

          {/* Row 2: Bars — Sections + Responsáveis + Stacks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {/* Distribuição por seção */}
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--color-border)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 10,
              }}>
                Por Seção
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sectionBars.filter((s) => s.count > 0).map((s) => (
                  <HBar key={s.id} label={s.label} value={s.count} max={maxSection} color={s.color} />
                ))}
              </div>
            </div>

            {/* Carga por responsável */}
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--color-border)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 10,
              }}>
                Por Responsável
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {metrics.byResp.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Nenhum responsável atribuído</span>
                )}
                {metrics.byResp.slice(0, 6).map((r) => (
                  <HBar key={r.name} label={r.name} value={r.count} max={maxResp} color="var(--color-blue)" />
                ))}
                {metrics.byResp.length > 6 && (
                  <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                    +{metrics.byResp.length - 6} outros
                  </span>
                )}
              </div>
            </div>

            {/* Cobertura por stack */}
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              border: '1px solid var(--color-border)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
                textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: 10,
              }}>
                Por Stack
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {metrics.byStack.length === 0 && (
                  <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>Nenhuma stack atribuída</span>
                )}
                {metrics.byStack.map((s) => (
                  <HBar key={s.stack} label={s.label} value={s.count} max={maxStack} color="var(--color-cyan, #06b6d4)" />
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Priority breakdown mini row */}
          <div style={{
            display: 'flex', gap: 14, marginTop: 14,
            padding: '10px 14px', borderRadius: 10,
            border: '1px solid var(--color-border)',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)',
              textTransform: 'uppercase', letterSpacing: '0.3px', flexShrink: 0,
            }}>
              Prioridade
            </span>
            {(['high', 'medium', 'low'] as const).map((p) => {
              const count = items.filter((i) => i.priority === p).length
              const colors = { high: '#ef4444', medium: '#f59e0b', low: '#6b7280' }
              return (
                <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: colors[p], flexShrink: 0,
                  }} />
                  <span style={{ color: 'var(--color-text-2)' }}>{priorityLabel(p)}</span>
                  <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{count}</span>
                </div>
              )
            })}
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--color-text-3)' }}>
              Total: <span style={{ fontWeight: 700, color: 'var(--color-text)' }}>{metrics.total}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
