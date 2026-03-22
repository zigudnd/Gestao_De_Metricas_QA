import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import { Bar, Doughnut, Line, Pie } from 'react-chartjs-2'
import { useSprintStore, getFilteredFeatures } from '../../store/sprintStore'
import { useSprintMetrics } from './useSprintMetrics'
import { sprintDayToDate } from '../../services/persistence'
import type { Bug } from '../../types/sprint.types'

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement, PointElement,
  ArcElement, Title, Tooltip, Legend, ChartDataLabels,
)

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BASE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
function getColors(n: number) { return Array.from({ length: n }, (_, i) => BASE_COLORS[i % BASE_COLORS.length]) }

function calcMTTR(bug: Bug): number | null {
  if (!bug.openedAt || !bug.resolvedAt) return null
  const ms = new Date(bug.resolvedAt + 'T00:00:00').getTime() - new Date(bug.openedAt + 'T00:00:00').getTime()
  return isNaN(ms) ? null : ms < 0 ? 0 : Math.round(ms / 86400000)
}


// ─── OverviewTab ─────────────────────────────────────────────────────────────

export function OverviewTab() {
  const state = useSprintStore((s) => s.state)
  const filter = useSprintStore((s) => s.activeSuiteFilter)
  const toggleSuiteFilter = useSprintStore((s) => s.toggleSuiteFilter)
  const clearSuiteFilter = useSprintStore((s) => s.clearSuiteFilter)
  const {
    totalTests, totalExec, remaining, metaPerDay,
    totalBlockedHours, openBugs, atrasoCasos, healthScore,
    totalRetests, blockedFeatureCount, ritmoStatus, sprintDays,
    activeFeatures,
  } = useSprintMetrics()

  const suites = state.suites ?? []
  const filtered = getFilteredFeatures(state, filter)

  // ── Burndown & Execução por Dia ───────────────────────────────────────────
  const globalExec: Record<string, number> = {}
  let maxDay = 0
  activeFeatures.forEach((f) => {
    Object.entries(f.execution ?? {}).forEach(([k, v]) => {
      if (v > 0) {
        const n = parseInt(k.replace('D', ''))
        if (n > maxDay) maxDay = n
        globalExec[k] = (globalExec[k] || 0) + v
      }
    })
  })

  const sd = state.config.startDate
  const excludeWeekends = state.config.excludeWeekends ?? false
  const dayLabels = Array.from({ length: sprintDays }, (_, i) => {
    if (sd) {
      const d = sprintDayToDate(sd, i + 1, excludeWeekends)
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    return `D${i + 1}`
  })

  const exactMeta = totalTests > 0 ? totalTests / sprintDays : 0
  const idealLine = Array.from({ length: sprintDays + 1 }, (_, i) => Math.max(0, totalTests - exactMeta * i))

  const realLine: (number | null)[] = [totalTests]
  let cumBurn = totalTests
  for (let i = 1; i <= sprintDays; i++) {
    if (i <= maxDay) { cumBurn -= globalExec[`D${i}`] || 0; realLine.push(cumBurn) }
    else realLine.push(null)
  }

  const zeroFlags = [false, ...Array.from({ length: sprintDays }, (_, i) => {
    const d = i + 1
    return d <= maxDay && (globalExec[`D${d}`] || 0) === 0
  })]
  const ptColors = zeroFlags.map((z, idx) => z ? '#ef4444' : realLine[idx] !== null ? '#2563eb' : 'transparent')
  const ptRadius = zeroFlags.map((z, idx) => idx === 0 ? 3 : z ? 7 : realLine[idx] !== null ? 4 : 0)

  const execPerDay = Array.from({ length: sprintDays }, (_, i) => globalExec[`D${i + 1}`] || 0)

  // ── Feature Progress (por suite) ──────────────────────────────────────────
  const visibleSuites = suites.filter((s) =>
    activeFeatures.some((f) => String(f.suiteId) === String(s.id))
  )
  const featsBySuite = visibleSuites.map((s) => ({
    suite: s,
    features: activeFeatures.filter((f) => String(f.suiteId) === String(s.id)),
  }))

  // ── Blockers ──────────────────────────────────────────────────────────────
  const allBlockers = state.blockers ?? []
  const blockersAll = allBlockers.reduce<Record<string, number>>((acc, b) => {
    acc[b.reason || 'Outros'] = (acc[b.reason || 'Outros'] || 0) + (b.hours || 0)
    return acc
  }, {})
  const blockersToday = allBlockers.filter((b) => b.date === state.currentDate).reduce<Record<string, number>>((acc, b) => {
    acc[b.reason || 'Outros'] = (acc[b.reason || 'Outros'] || 0) + (b.hours || 0)
    return acc
  }, {})
  const totalHorasHoje = Object.values(blockersToday).reduce((a, b) => a + b, 0)
  const totalHorasGeral = Object.values(blockersAll).reduce((a, b) => a + b, 0)

  // ── Bugs ──────────────────────────────────────────────────────────────────
  const validBugs = state.bugs ?? []
  const bugsGrouped = validBugs.reduce<Record<string, number>>((acc, b) => {
    const st = b.stack || 'Não Informado'
    acc[st] = (acc[st] || 0) + 1
    return acc
  }, {})
  const uniqueStacks = validBugs.length ? [...new Set(validBugs.map((b) => b.stack || 'Não Informado'))] : ['Nenhum']
  const abertoData  = uniqueStacks.map((s) => validBugs.filter((b) => (b.stack || 'Não Informado') === s && b.status === 'Aberto').length)
  const andamentoData = uniqueStacks.map((s) => validBugs.filter((b) => (b.stack || 'Não Informado') === s && b.status === 'Em Andamento').length)
  const resolvidoData = uniqueStacks.map((s) => validBugs.filter((b) => (b.stack || 'Não Informado') === s && b.status === 'Resolvido').length)
  const uniqueFeatBugs = validBugs.length ? [...new Set(validBugs.map((b) => b.feature || 'Não informada'))] : ['Nenhuma']
  const bugFront = uniqueFeatBugs.map((f) => validBugs.filter((b) => (b.feature || 'Não informada') === f && b.stack === 'Front').length)
  const bugBff   = uniqueFeatBugs.map((f) => validBugs.filter((b) => (b.feature || 'Não informada') === f && b.stack === 'BFF').length)
  const bugBack  = uniqueFeatBugs.map((f) => validBugs.filter((b) => (b.feature || 'Não informada') === f && b.stack === 'Back').length)

  // ── Prevention Score ──────────────────────────────────────────────────────
  const preventionScore = validBugs.reduce((sum, b) => {
    const w = b.severity === 'Crítica' ? (state.config.psCritical ?? 10)
      : b.severity === 'Alta' ? (state.config.psHigh ?? 5)
      : b.severity === 'Média' ? (state.config.psMedium ?? 3)
      : (state.config.psLow ?? 1)
    return sum + w
  }, 0)

  // ── MTTR ──────────────────────────────────────────────────────────────────
  const resolvedBugs = validBugs.filter((b) => b.status === 'Resolvido' && b.openedAt && b.resolvedAt)
  const mttrDays = resolvedBugs.map(calcMTTR).filter((d): d is number => d !== null)
  const mttrGlobal = mttrDays.length ? (mttrDays.reduce((a, b) => a + b, 0) / mttrDays.length).toFixed(1) : null
  const STACKS = ['Front', 'BFF', 'Back']
  const SEV_COLORS: Record<string, string> = { Baixa: '#10b981', Média: '#f59e0b', Alta: '#f97316', Crítica: '#ef4444' }
  const mttrDatasets = (['Baixa', 'Média', 'Alta', 'Crítica'] as const).map((sev) => ({
    label: sev,
    backgroundColor: SEV_COLORS[sev],
    borderRadius: 4,
    data: STACKS.map((stack) => {
      const grp = resolvedBugs.filter((b) => b.stack === stack && b.severity === sev)
      if (!grp.length) return null
      const days = grp.map(calcMTTR).filter((d): d is number => d !== null)
      return days.length ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10 : null
    }),
  }))

  // ── Lists ─────────────────────────────────────────────────────────────────
  const blockedFeatures = filtered.filter((f) => f.status === 'Bloqueada')
  const failedScenarios: { featureName: string; scenarioName: string }[] = []
  filtered.forEach((f) => {
    ;(f.cases ?? []).forEach((c) => {
      if (c.status === 'Falhou') failedScenarios.push({ featureName: f.name, scenarioName: c.name })
    })
  })
  const openBugsList = validBugs.filter((b) => b.status !== 'Resolvido')

  // ── Colors ────────────────────────────────────────────────────────────────
  const hsColor = healthScore >= 90 ? 'var(--color-green)' : healthScore >= 70 ? 'var(--color-yellow)' : 'var(--color-red)'
  const ritmoLabel = ritmoStatus === 'ok' ? 'No Ritmo' : ritmoStatus === 'warning' ? 'Atenção' : 'Em Atraso'
  const ritmoColor = ritmoStatus === 'ok' ? 'var(--color-green)' : ritmoStatus === 'warning' ? 'var(--color-yellow)' : 'var(--color-red)'
  const atrasoPercent = totalTests > 0 ? Math.round((atrasoCasos / totalTests) * 100) : 0
  const atrasoPercentColor = atrasoPercent === 0 ? 'var(--color-green)' : atrasoPercent < 20 ? 'var(--color-yellow)' : 'var(--color-red)'
  const todayReport = state.reports?.[state.currentDate] ?? ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Suite Filter ───────────────────────────────────────────────────── */}
      {suites.length >= 2 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', flexShrink: 0 }}>
            Filtrar Suites:
          </span>
          {suites.map((suite) => {
            const active = filter.size === 0 || filter.has(String(suite.id))
            const cnt = state.features.filter((f) => String(f.suiteId) === String(suite.id)).length
            return (
              <button
                key={suite.id}
                onClick={() => toggleSuiteFilter(String(suite.id))}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '5px 12px', borderRadius: 20,
                  border: `2px solid ${active ? 'var(--color-blue)' : 'var(--color-border-md)'}`,
                  background: active ? 'var(--color-blue)' : 'var(--color-bg)',
                  color: active ? '#fff' : 'var(--color-text-2)',
                  fontWeight: 700, fontSize: 12, cursor: 'pointer',
                }}
              >
                {suite.name || 'Suite'} <span style={{ fontSize: 10, opacity: 0.8 }}>{cnt}f</span>
              </button>
            )
          })}
          {filter.size > 0 && (
            <button onClick={clearSuiteFilter} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 10, border: '1px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer' }}>
              ✕ Ver todas
            </button>
          )}
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        <KpiCard label="QA Health Score" value={`${healthScore}%`} valueColor={hsColor} borderColor={hsColor} />
        <KpiCard label="Status da Sprint" value={ritmoLabel} valueColor={ritmoColor} borderColor={ritmoColor} />
        <KpiCard label="Defeitos Prevenidos" value={validBugs.length} valueColor="var(--color-green)" borderColor="var(--color-green)" />
        <KpiCard label="Impacto Prevenido" value={preventionScore} valueColor="var(--color-green)" borderColor="var(--color-green)" />
        <KpiCard label="Total de Testes" value={totalTests} />
        <KpiCard label="Executados" value={totalExec} />
        <KpiCard label="Restantes" value={remaining} />
        <KpiCard label="Meta por Dia" value={metaPerDay} sub={`Planejado / ${sprintDays} dias`} />
        <KpiCard label="Bugs Abertos" value={openBugs} valueColor={openBugs > 0 ? 'var(--color-red)' : undefined} borderColor={openBugs > 0 ? 'var(--color-red)' : undefined} />
        <KpiCard label="Atraso %" value={`${atrasoPercent}%`} valueColor={atrasoPercentColor} />
        <KpiCard label="Atraso em Casos" value={atrasoCasos} />
        <KpiCard label="Telas Bloqueadas" value={blockedFeatureCount} />
        <KpiCard label="Horas Bloqueadas" value={`${totalBlockedHours}h`} />
        <KpiCard label="MTTR Global" value={mttrGlobal !== null ? `${mttrGlobal}d` : '—'} valueColor="#8b5cf6" borderColor="#8b5cf6" />
        <KpiCard label="Total Retestes" value={totalRetests} />
      </div>

      {/* ── Report do Dia + Bloqueios Hoje ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="📋 Report do Dia">
          {todayReport
            ? <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{todayReport}</div>
            : <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontStyle: 'italic' }}>Nenhum report registrado para hoje.</div>
          }
        </Card>
        <Card title={`🔴 Bloqueios por Motivo (Hoje) — ${totalHorasHoje}h`}>
          <div style={{ height: 200 }}>
            <Doughnut
              data={{
                labels: Object.keys(blockersToday).length ? Object.keys(blockersToday) : ['Nenhum'],
                datasets: [{ data: Object.values(blockersToday).length ? Object.values(blockersToday) : [0], backgroundColor: getColors(Math.max(Object.keys(blockersToday).length, 1)), borderWidth: 1 }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color: '#fff', font: { weight: 'bold', size: 13 }, formatter: (v: number) => v > 0 ? `${v}h` : '' } } } as object}
            />
          </div>
        </Card>
      </div>

      {/* ── Burndown Chart ────────────────────────────────────────────────── */}
      <Card title="📉 Burndown Chart">
        <div style={{ height: 280 }}>
          <Line
            data={{
              labels: ['Início', ...dayLabels],
              datasets: [
                {
                  label: 'Ideal', data: idealLine,
                  borderColor: '#ef4444', borderDash: [5, 5], borderWidth: 2,
                  pointRadius: 0, tension: 0,
                },
                {
                  label: 'Real', data: realLine,
                  borderColor: '#2563eb', borderWidth: 2,
                  pointBackgroundColor: ptColors, pointBorderColor: ptColors,
                  pointRadius: ptRadius, tension: 0.1, spanGaps: false,
                },
              ],
            }}
            options={{
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Testes Restantes' } },
                x: { ticks: { maxRotation: 45, autoSkip: false } },
              },
              plugins: { legend: { position: 'top' }, datalabels: { display: false } },
            } as object}
          />
        </div>
      </Card>

      {/* ── Bugs Abertos — tabela compacta (largura total) ───────────────── */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🐞</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>Bugs Abertos</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-2)', background: 'var(--color-border)', borderRadius: 20, padding: '2px 7px', fontWeight: 600 }}>
            {openBugsList.length}
          </span>
        </div>
        {openBugsList.length === 0 ? (
          <div style={{ padding: '14px 14px' }}><EmptyOk label="🎉 Nenhum bug aberto!" /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)' }}>
                {['ID', 'Status', 'Responsável', 'Descrição'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-2)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openBugsList.map((b, i) => {
                const sevColor = b.severity === 'Crítica' ? '#dc2626' : b.severity === 'Alta' ? '#ea580c' : b.severity === 'Média' ? '#d97706' : '#64748b'
                const statusColor = b.status === 'Aberto' ? '#dc2626' : '#d97706'
                return (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg)' }}>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: sevColor, background: `${sevColor}18`, padding: '2px 5px', borderRadius: 4 }}>{b.id}</span>
                    </td>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: statusColor }}>{b.status}</span>
                    </td>
                    <td style={{ padding: '5px 8px', color: 'var(--color-text-2)', whiteSpace: 'nowrap' }}>{b.assignee || '—'}</td>
                    <td style={{ padding: '5px 8px', color: 'var(--color-text)' }}>{b.desc || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Progresso por Funcionalidade (largura total) ──────────────────── */}
      <Card title="🧪 Progresso de Testes por Funcionalidade">
        {featsBySuite.length === 0 ? (
          <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
            Nenhuma funcionalidade ativa.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {featsBySuite.map(({ suite, features }, suiteIdx) => {
              const labels     = features.map((f) => f.name || 'Sem Nome')
              const concluido  = features.map((f) => (f.cases ?? []).filter((c) => c.status === 'Concluído').length)
              const falhou     = features.map((f) => (f.cases ?? []).filter((c) => c.status === 'Falhou').length)
              const bloqueado  = features.map((f) => (f.cases ?? []).filter((c) => c.status === 'Bloqueado').length)
              const pendente   = features.map((f) => (f.cases ?? []).filter((c) => c.status === 'Pendente').length)
              const total      = features.reduce((a, f) => a + (f.cases ?? []).length, 0)
              const done       = features.reduce((a, f) => a + (f.cases ?? []).filter((c) => c.status === 'Concluído' || c.status === 'Falhou').length, 0)
              return (
                <div key={suite.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {suite.name || 'Suite'}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--color-text-3)' }}>
                      {done}/{total} casos executados
                    </span>
                  </div>
                  <div style={{ height: Math.max(120, features.length * 42) }}>
                    <Bar
                      data={{
                        labels,
                        datasets: [
                          { label: 'Concluído', data: concluido, backgroundColor: '#10b981', borderRadius: 4 },
                          { label: 'Falhou',    data: falhou,    backgroundColor: '#ef4444', borderRadius: 4 },
                          { label: 'Bloqueado', data: bloqueado, backgroundColor: '#f59e0b', borderRadius: 4 },
                          { label: 'Pendente',  data: pendente,  backgroundColor: '#e2e8f0', borderRadius: 4 },
                        ],
                      }}
                      options={{
                        indexAxis: 'y' as const,
                        maintainAspectRatio: false,
                        scales: { x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } }, y: { stacked: true } },
                        plugins: {
                          legend: suiteIdx === 0
                            ? { position: 'top' as const }
                            : { display: false },
                          datalabels: { anchor: 'center', align: 'center', color: '#fff', font: { weight: 'bold', size: 11 }, formatter: (v: number) => v > 0 ? v : '' },
                        },
                      } as object}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── Execução por Dia + MTTR ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="📊 Execução por Dia">
          <div style={{ height: 220 }}>
            <Bar
              data={{
                labels: dayLabels,
                datasets: [{
                  label: 'Executados',
                  data: execPerDay,
                  backgroundColor: execPerDay.map((v, i) =>
                    i + 1 <= maxDay && v === 0 ? '#ef4444' : v > 0 ? '#2563eb' : '#e2e8f0'
                  ),
                  borderRadius: 4,
                }],
              }}
              options={{
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false }, datalabels: { anchor: 'end', align: 'top', color: '#64748b', font: { weight: 'bold', size: 11 }, formatter: (v: number) => v > 0 ? v : '' } },
              } as object}
            />
          </div>
        </Card>
        <Card title="⏱️ MTTR — Tempo Médio de Resolução por Stack e Criticidade (dias)">
          <div style={{ height: 220 }}>
            <Bar
              data={{ labels: STACKS, datasets: mttrDatasets }}
              options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Dias (média)' } } }, plugins: { legend: { position: 'top' }, datalabels: { anchor: 'end', align: 'top', color: '#64748b', font: { weight: 'bold', size: 10 }, formatter: (v: number | null) => v && v > 0 ? `${v}d` : '' } } } as object}
            />
          </div>
        </Card>
      </div>

      {/* ── Bloqueios Geral + Origem dos Bugs ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title={`🚧 Bloqueios Externos (Geral Acumulado) — ${totalHorasGeral}h`}>
          <div style={{ height: 220 }}>
            <Doughnut
              data={{
                labels: Object.keys(blockersAll).length ? Object.keys(blockersAll) : ['Nenhum'],
                datasets: [{ data: Object.values(blockersAll).length ? Object.values(blockersAll) : [0], backgroundColor: getColors(Math.max(Object.keys(blockersAll).length, 1)), borderWidth: 1 }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color: '#fff', font: { weight: 'bold', size: 13 }, formatter: (v: number) => v > 0 ? `${v}h` : '' } } } as object}
            />
          </div>
        </Card>
        <Card title="🐛 Origem dos Bugs (Stack)">
          <div style={{ height: 220 }}>
            <Pie
              data={{
                labels: Object.keys(bugsGrouped).length ? Object.keys(bugsGrouped) : ['Nenhum'],
                datasets: [{ data: Object.values(bugsGrouped).length ? Object.values(bugsGrouped) : [0], backgroundColor: ['#3b82f6', '#10b981', '#0f172a', '#f59e0b'], borderWidth: 1 }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right' }, datalabels: { color: '#fff', font: { weight: 'bold', size: 12 }, formatter: (v: number) => v > 0 ? v : '' } } } as object}
            />
          </div>
        </Card>
      </div>

      {/* ── Status Bugs/Stack + Bugs/Feature/Stack ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="📋 Status dos Bugs por Stack">
          <div style={{ height: 220 }}>
            <Bar
              data={{
                labels: uniqueStacks,
                datasets: [
                  { label: 'Aberto',       data: abertoData,    backgroundColor: '#ef4444', borderRadius: 2 },
                  { label: 'Em Andamento', data: andamentoData, backgroundColor: '#f59e0b', borderRadius: 2 },
                  { label: 'Resolvido',    data: resolvidoData, backgroundColor: '#10b981', borderRadius: 2 },
                ],
              }}
              options={{ maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { position: 'top' }, datalabels: { anchor: 'center', align: 'center', color: '#fff', font: { weight: 'bold', size: 11 }, formatter: (v: number) => v > 0 ? v : '' } } } as object}
            />
          </div>
        </Card>
        <Card title="🔍 Bugs por Funcionalidade e Stack">
          <div style={{ height: 220 }}>
            <Bar
              data={{
                labels: uniqueFeatBugs,
                datasets: [
                  { label: 'Front', data: bugFront, backgroundColor: '#3b82f6', borderRadius: 2 },
                  { label: 'BFF',   data: bugBff,   backgroundColor: '#10b981', borderRadius: 2 },
                  { label: 'Back',  data: bugBack,  backgroundColor: '#0f172a', borderRadius: 2 },
                ],
              }}
              options={{ maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { position: 'top' }, datalabels: { anchor: 'center', align: 'center', color: '#fff', font: { weight: 'bold', size: 11 }, formatter: (v: number) => v > 0 ? v : '' } } } as object}
            />
          </div>
        </Card>
      </div>


      {/* ── Impedimentos + Falhas ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Section title="Impedimentos" icon="🛑" count={blockedFeatures.length}>
          {blockedFeatures.length === 0 ? <EmptyOk label="Nenhum impedimento no momento." /> : (
            blockedFeatures.map((f) => (
              <div key={f.id} style={alertCard('#fef2f2', '#fecaca', '#ef4444')}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <strong style={{ color: '#991b1b', fontSize: 14 }}>🖥️ {f.name || 'Sem nome'}</strong>
                  <Badge label="Bloqueada" color="#ef4444" />
                </div>
                <p style={{ fontSize: 13, color: '#7f1d1d', background: '#fee2e2', padding: '8px 10px', borderRadius: 6, margin: 0, lineHeight: 1.5 }}>
                  📌 <strong>Motivo:</strong> {f.blockReason || 'Não informado.'}
                </p>
              </div>
            ))
          )}
        </Section>

        <Section title="Cenários com Falha" icon="❌" count={failedScenarios.length}>
          {failedScenarios.length === 0 ? <EmptyOk label="Nenhum cenário com falha!" /> : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  {['Funcionalidade', 'Cenário'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-2)', borderBottom: '1px solid var(--color-border)', whiteSpace: 'nowrap', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failedScenarios.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-bg)' }}>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap', color: 'var(--color-text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.featureName}>{item.featureName || '—'}</td>
                    <td style={{ padding: '5px 8px', color: 'var(--color-text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.scenarioName}>{item.scenarioName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      {/* ── Alinhamentos Técnicos e de Produto ───────────────────────────── */}
      <Card title="🤝 Alinhamentos Técnicos e de Produto" borderLeftColor="var(--color-blue)">
        {state.alignments.length === 0 ? (
          <div style={{ color: 'var(--color-text-2)', fontSize: 13, fontStyle: 'italic' }}>
            Nenhum alinhamento ou débito técnico registrado no momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.alignments.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderLeft: '4px solid var(--color-blue)', borderRadius: 6, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5 }}>
                <span style={{ color: 'var(--color-blue)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                <span>{a.text || 'Não descrito'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Premissas + Plano de Ação ─────────────────────────────────────── */}
      <Card title="📌 Premissas e Plano de Ação" borderLeftColor="var(--color-amber)">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Premissas do Ciclo de Testes
            </div>
            {state.notes.premises ? (
              <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{state.notes.premises}</div>
            ) : (
              <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma premissa registrada.</div>
            )}
          </div>
          <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              Plano de Ação e Gatilhos
            </div>
            {state.notes.actionPlan ? (
              <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{state.notes.actionPlan}</div>
            ) : (
              <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontStyle: 'italic' }}>Nenhum plano de ação registrado.</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, valueColor, borderColor }: {
  label: string; value: string | number; sub?: string; valueColor?: string; borderColor?: string
}) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderBottom: borderColor ? `3px solid ${borderColor}` : undefined, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: valueColor ?? 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function Card({ title, children, borderLeftColor }: { title: string; children: React.ReactNode; borderLeftColor?: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderLeft: borderLeftColor ? `4px solid ${borderLeftColor}` : undefined, borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--color-border)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{title}</div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  )
}

function Section({ title, icon, count, children }: { title: string; icon: string; count: number; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--color-text)' }}>{title}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-2)', background: 'var(--color-border)', borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>{count}</span>
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  )
}

function EmptyOk({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 72, color: 'var(--color-green)', fontWeight: 600, background: '#ecfdf5', borderRadius: 8, border: '1px dashed #a7f3d0', fontSize: 13 }}>
      ✅ {label}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 10, background: color, color: '#fff', padding: '3px 8px', borderRadius: 12, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
  )
}

function alertCard(bg: string, border: string, accent: string): React.CSSProperties {
  return { padding: '12px 14px', background: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${accent}`, borderRadius: 8 }
}
