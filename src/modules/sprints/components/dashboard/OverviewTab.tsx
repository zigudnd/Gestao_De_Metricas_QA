import { memo } from 'react'
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

// --- Helpers ---

const BASE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316']
function getColors(n: number) { return Array.from({ length: n }, (_, i) => BASE_COLORS[i % BASE_COLORS.length]) }

const DONUT_PALETTE = ['#E24B4A', '#378ADD', '#639922', '#EAB308', '#888780', '#B4B2A9', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899']
const BLOCKER_COLOR_MAP: Record<string, string> = {
  'Ambiente indisponível': '#639922',
  'Erro no login': '#E24B4A',
  'Erro no Back-End': '#EAB308',
  'Testes bloqueados': '#378ADD',
  'Bloqueio de dependência externa': '#888780',
  'Bloqueio dependência': '#888780',
  'Bug crítico impedindo testes': '#E24B4A',
  'Falta de requisitos/documentação': '#EAB308',
  'Indisponibilidade de recurso humano': '#888780',
  'Aguardando aprovação de deploy': '#378ADD',
}
const STACK_COLOR_MAP: Record<string, string> = {
  IOS: '#2C2C2A', iOS: '#2C2C2A',
  BFF: '#639922',
  Front: '#378ADD', front: '#378ADD',
  Back: '#2C2C2A', back: '#2C2C2A',
}
function uniqueColors(labels: string[], preferredMap: Record<string, string>) {
  const used = new Set<string>()
  return labels.map((l) => {
    const pref = preferredMap[l]
    if (pref && !used.has(pref)) { used.add(pref); return pref }
    for (const c of DONUT_PALETTE) {
      if (!used.has(c)) { used.add(c); return c }
    }
    return '#888780'
  })
}
function blockerColors(labels: string[]) { return uniqueColors(labels, BLOCKER_COLOR_MAP) }
function stackColors(labels: string[]) { return uniqueColors(labels, STACK_COLOR_MAP) }

const LEGEND_LABELS = {
  boxWidth: 8, boxHeight: 8, borderRadius: 4, useBorderRadius: true,
  font: { size: 11 }, color: '#888780', padding: 12,
}

function calcMTTR(bug: Bug): number | null {
  if (!bug.openedAt || !bug.resolvedAt) return null
  const ms = new Date(bug.resolvedAt + 'T00:00:00').getTime() - new Date(bug.openedAt + 'T00:00:00').getTime()
  return isNaN(ms) ? null : ms < 0 ? 0 : Math.round(ms / 86400000)
}


// --- OverviewTab ---

export function OverviewTab() {
  const state = useSprintStore((s) => s.state)
  const filter = useSprintStore((s) => s.activeSuiteFilter)
  const toggleSuiteFilter = useSprintStore((s) => s.toggleSuiteFilter)
  const clearSuiteFilter = useSprintStore((s) => s.clearSuiteFilter)
  const {
    totalTests, totalExec, execPercent, remaining, metaPerDay, exactMeta,
    totalBlockedHours, openBugs, atrasoCasos, healthScore,
    totalRetests, retestIndex, blockedFeatureCount, ritmoStatus, sprintDays,
    activeFeatures, testesComprometidos, testesExecutaveis, capacidadeReal,
  } = useSprintMetrics()

  const suites = state.suites ?? []
  const filtered = getFilteredFeatures(state, filter)

  // -- Burndown & Execucao por Dia --
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
  const excludeWeekends = state.config.excludeWeekends ?? true
  const dayLabels = Array.from({ length: sprintDays }, (_, i) => {
    if (sd) {
      const d = sprintDayToDate(sd, i + 1, excludeWeekends)
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
    }
    return `D${i + 1}`
  })

  const idealLine = Array.from({ length: sprintDays + 1 }, (_, i) => Math.max(0, testesExecutaveis - exactMeta * i))

  const realLine: (number | null)[] = [testesExecutaveis]
  let cumBurn = testesExecutaveis
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

  // -- Feature Progress (por suite) --
  const visibleSuites = suites.filter((s) =>
    activeFeatures.some((f) => String(f.suiteId) === String(s.id))
  )
  const featsBySuite = visibleSuites.map((s) => ({
    suite: s,
    features: activeFeatures.filter((f) => String(f.suiteId) === String(s.id)),
  }))

  // -- Blockers --
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

  // -- Bugs --
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

  // -- Prevention Score --
  const preventionScore = validBugs.reduce((sum, b) => {
    const w = b.severity === 'Crítica' ? (state.config.psCritical ?? 10)
      : b.severity === 'Alta' ? (state.config.psHigh ?? 5)
      : b.severity === 'Média' ? (state.config.psMedium ?? 3)
      : (state.config.psLow ?? 1)
    return sum + w
  }, 0)

  // -- MTTR --
  const resolvedBugs = validBugs.filter((b) => b.status === 'Resolvido' && b.openedAt && b.resolvedAt)
  const mttrDays = resolvedBugs.map(calcMTTR).filter((d): d is number => d !== null)
  const mttrGlobal = mttrDays.length ? (mttrDays.reduce((a, b) => a + b, 0) / mttrDays.length).toFixed(1) : null
  const STACKS = ['Front', 'BFF', 'Back']
  const SEV_COLORS: Record<string, string> = { Baixa: '#639922', Média: '#378ADD', Alta: '#EAB308', Crítica: '#E24B4A' }
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

  // -- Lists --
  type BlockedItem = { id: number; name: string; suiteId: number; blockReason: string; stripe: 'blocked' | 'pending' }
  const blockedItems: BlockedItem[] = [
    ...filtered
      .filter((f) => f.status === 'Bloqueada')
      .map((f): BlockedItem => ({ id: f.id, name: f.name, suiteId: f.suiteId, blockReason: f.blockReason, stripe: 'blocked' })),
    ...filtered
      .filter((f) => f.status !== 'Bloqueada' && (f.cases ?? []).some((c) => c.status === 'Bloqueado'))
      .map((f): BlockedItem => {
        const n = (f.cases ?? []).filter((c) => c.status === 'Bloqueado').length
        return { id: f.id, name: f.name, suiteId: f.suiteId, blockReason: `${n} caso${n > 1 ? 's' : ''} bloqueado${n > 1 ? 's' : ''}`, stripe: 'pending' }
      }),
  ]
  const blockedFeatures = filtered.filter((f) => f.status === 'Bloqueada')
  const failedScenarios: { featureName: string; scenarioName: string }[] = []
  filtered.forEach((f) => {
    ;(f.cases ?? []).forEach((c) => {
      if (c.status === 'Falhou') failedScenarios.push({ featureName: f.name, scenarioName: c.name })
    })
  })
  const openBugsList = validBugs.filter((b) => b.status !== 'Resolvido')

  // -- Colors --
  const hsColor = healthScore >= 90 ? 'var(--color-green)' : healthScore >= 70 ? 'var(--color-yellow)' : 'var(--color-red)'
  const ritmoLabel = ritmoStatus === 'ok' ? 'No Ritmo' : ritmoStatus === 'warning' ? 'Atenção' : 'Em Atraso'
  const ritmoColor = ritmoStatus === 'ok' ? 'var(--color-green)' : ritmoStatus === 'warning' ? 'var(--color-yellow)' : 'var(--color-red)'
  const atrasoPercent = testesExecutaveis > 0 ? Math.round((atrasoCasos / testesExecutaveis) * 100) : 0
  const atrasoPercentColor = atrasoPercent === 0 ? 'var(--color-green)' : atrasoPercent < 20 ? 'var(--color-yellow)' : 'var(--color-red)'
  const retestIndexColor = retestIndex <= 10 ? 'var(--color-green)' : retestIndex <= 20 ? 'var(--color-yellow)' : retestIndex <= 35 ? '#f97316' : 'var(--color-red)'
  const retestIndexLabel = retestIndex <= 10 ? 'Excelente' : retestIndex <= 20 ? 'Normal' : retestIndex <= 35 ? 'Atenção' : 'Crítico'
  const capacidadeRealColor = capacidadeReal >= 90 ? 'var(--color-green)' : capacidadeReal >= 70 ? 'var(--color-yellow)' : 'var(--color-red)'
  const todayReport = state.reports?.[state.currentDate] ?? ''

  return (
    <div className="flex flex-col gap-6">

      {/* -- Status Bar -- */}
      <div className="card-sm flex items-center gap-3 flex-wrap" style={{ padding: '14px 20px' }}>
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          {ritmoStatus !== 'ok' && (
            <span className="badge badge-red" style={{ fontWeight: 800, letterSpacing: '0.5px' }}>
              EM ATRASO
            </span>
          )}
          <span className="heading-sm" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state.config.title || 'Sprint atual'}
          </span>
          {atrasoCasos > 0 && (
            <span className="text-small shrink-0" style={{ whiteSpace: 'nowrap' }}>
              {atrasoPercent}% de atraso · {atrasoCasos} casos
            </span>
          )}
        </div>
        {suites.length >= 2 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {suites.map((suite) => {
              const active = filter.size === 0 || filter.has(String(suite.id))
              const cnt = state.features.filter((f) => String(f.suiteId) === String(suite.id)).length
              return (
                <button key={suite.id} onClick={() => toggleSuiteFilter(String(suite.id))} aria-label={`Filtrar suite ${suite.name || 'Suite'}`} className={active ? 'badge badge-blue' : 'badge badge-neutral'} style={{ cursor: 'pointer', fontWeight: 600, padding: '4px 10px', borderRadius: 20, fontFamily: 'var(--font-family-sans)' }}>
                  {suite.name || 'Suite'} <span style={{ opacity: 0.75 }}>{cnt}f</span>
                </button>
              )
            })}
            {filter.size > 0 && (
              <button onClick={clearSuiteFilter} aria-label="Limpar filtros de suite" className="badge badge-neutral" style={{ cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}>
                ✕ Todas
              </button>
            )}
          </div>
        )}
      </div>

      {/* -- Hero Cards -- */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <HeroCard label="QA Health Score" value={`${healthScore}%`} sub="saude geral da sprint" valueColor={hsColor} barColor={healthScore >= 90 ? 'var(--color-green-mid)' : healthScore >= 70 ? 'var(--color-amber-mid)' : 'var(--color-red-mid)'} />
        <HeroCard label="Total de Testes" value={totalTests} sub="escopo total da sprint" barColor="#6b7280" />
        <HeroCard label="Executados" value={`${execPercent}%`} sub={`${totalExec} de ${testesExecutaveis} executaveis`} barColor={execPercent >= 90 ? 'var(--color-green-mid)' : execPercent >= 50 ? 'var(--color-amber-mid)' : '#6b7280'} />
        <HeroCard label="🐞 Bugs Abertos" value={openBugs} sub="aguardando resolucao" valueColor={openBugs > 0 ? 'var(--color-red-mid)' : 'var(--color-green-mid)'} barColor={openBugs > 0 ? 'var(--color-red-mid)' : 'var(--color-green-mid)'} highlight={openBugs > 0} />
      </div>

      {/* -- Alert Strips -- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-sm flex items-start gap-2.5" style={{ background: 'var(--color-green-light)', border: '0.5px solid var(--color-green-mid)' }}>
          <div className="flex items-center gap-1 shrink-0" style={{ marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-green-mid)' }} />
            <span className="section-label" style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-green)', marginBottom: 0 }}>OK</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-green)' }}>
              {validBugs.length} defeito{validBugs.length !== 1 ? 's' : ''} prevenido{validBugs.length !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-green)', opacity: 0.75, marginTop: 2 }}>
              Impacto prevenido: {preventionScore} pts
            </div>
          </div>
        </div>
        <div className="card-sm flex items-start gap-2.5" style={{ background: 'var(--color-red-light)', border: '0.5px solid var(--color-red-mid)' }}>
          <div className="flex items-center gap-1 shrink-0" style={{ marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-red-mid)' }} />
            <span className="section-label" style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-red)', marginBottom: 0 }}>{testesComprometidos > 0 ? 'ALERTA' : 'OK'}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-red)' }}>
              {testesComprometidos > 0 ? `${testesComprometidos} testes bloqueados` : 'Sem testes bloqueados'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-red)', opacity: 0.75, marginTop: 2 }}>
              {testesComprometidos > 0 ? `${blockedFeatureCount} funcionalidade${blockedFeatureCount !== 1 ? 's' : ''} impedindo a execucao` : 'Todos os testes estao liberados para execucao'}
            </div>
          </div>
        </div>
      </div>

      {/* -- Faixas Qualitativas -- */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-sm flex items-start gap-2.5">
          <div className="flex items-center gap-1 shrink-0" style={{ marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-blue)' }} />
            <span className="section-label" style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-blue)', marginBottom: 0 }}>MTTR</span>
          </div>
          <div>
            <div className="heading-sm" style={{ fontSize: 13 }}>
              MTTR Global — {mttrGlobal !== null ? `${mttrGlobal}d` : '—'}
            </div>
            <div className="text-small" style={{ marginTop: 2 }}>
              tempo medio de resolucao de bugs
            </div>
          </div>
        </div>
        <div className="card-sm flex items-start gap-2.5">
          <div className="flex items-center gap-1 shrink-0" style={{ marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: retestIndexColor }} />
            <span className="section-label" style={{ fontSize: 9, fontWeight: 800, color: retestIndexColor, marginBottom: 0 }}>{retestIndexLabel}</span>
          </div>
          <div>
            <div className="heading-sm" style={{ fontSize: 13 }}>
              Indice de Retrabalho — {retestIndex}%
            </div>
            <div className="text-small" style={{ marginTop: 2 }}>
              {retestIndexLabel} · proporcao de revalidacoes
            </div>
          </div>
        </div>
      </div>

      {/* -- KPI Cards -- */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        <KpiCard label="Testes Executaveis" value={testesExecutaveis} sub="possiveis de executar agora" />
        <KpiCard label="Capacidade Real" value={`${capacidadeReal}%`} sub="do escopo acessivel" />
        <KpiCard label="Meta por Dia" value={metaPerDay} sub={`Planejado / ${sprintDays} dias`} />
        <KpiCard label="Horas Bloqueadas" value={`${totalBlockedHours}h`} sub="perdidas por impedimentos" />
      </div>

      {/* -- Report do Dia + Bloqueios Hoje -- */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '3fr 2fr' }}>
        <Card
          title="Report do Dia"
          icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="3" y="1.5" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 5h4M5.5 7.5h4M5.5 10h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
        >
          {todayReport
            ? <div className="text-body" style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text)' }}>{todayReport}</div>
            : (
              <div className="flex flex-col items-center justify-center gap-2" style={{ minHeight: 100 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="var(--color-text-3)" strokeWidth="1.2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="var(--color-text-3)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <span className="text-muted" style={{ fontSize: 13 }}>Nenhum reporte registrado hoje</span>
              </div>
            )
          }
        </Card>
        <Card
          title="Bloqueios por Motivo (Hoje)"
          pill={`${totalHorasHoje}h`}
          icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/><circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 1.5V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
        >
          <div style={{ height: 200 }}>
            <Doughnut
              data={{
                labels: Object.keys(blockersToday).length ? Object.keys(blockersToday) : ['Nenhum'],
                datasets: [{ data: Object.values(blockersToday).length ? Object.values(blockersToday) : [0], backgroundColor: blockerColors(Object.keys(blockersToday).length ? Object.keys(blockersToday) : ['Nenhum']), borderWidth: 0 }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: LEGEND_LABELS }, datalabels: { display: true, color: '#fff', font: { weight: 'bold' as const, size: 12 }, formatter: (v: number) => v > 0 ? `${v}h` : '' } } } as object}
            />
          </div>
        </Card>
      </div>

      {/* -- Burndown Chart -- */}
      <Card title="Burndown Chart" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 2.5L5.5 7l3-2.5 5.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M11 11.5h3v-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
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
              plugins: {
                legend: { position: 'top' as const, labels: LEGEND_LABELS },
                datalabels: {
                  display: (ctx: { datasetIndex: number; dataIndex: number; dataset: { data: (number | null)[] } }) => ctx.datasetIndex === 1 && ctx.dataset.data[ctx.dataIndex] !== null,
                  anchor: 'end' as const, align: 'top' as const, offset: 2,
                  color: '#378ADD', font: { size: 9, weight: 'bold' as const },
                  formatter: (v: number | null) => v !== null && v >= 0 ? v : '',
                },
              },
            } as object}
          />
        </div>
      </Card>

      {/* -- Bugs Abertos — tabela compacta (largura total) -- */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex items-center gap-2" style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border)' }}>
          <span>🐞</span>
          <span className="heading-sm" style={{ fontSize: 13 }}>Bugs Abertos</span>
          <span className="badge badge-neutral ml-auto">{openBugsList.length} bug{openBugsList.length !== 1 ? 's' : ''}</span>
        </div>
        {openBugsList.length === 0 ? (
          <div style={{ padding: '14px 14px' }}><EmptyOk label="🎉 Nenhum bug aberto!" /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)' }}>
                {['ID', 'Status', 'Responsável', 'Descrição'].map((h) => (
                  <th key={h} className="table-header" style={{ padding: '6px 8px', fontSize: 10 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openBugsList.map((b) => {
                const stripeColor = b.status === 'Aberto' || b.status === 'Em Andamento' ? 'var(--color-red-mid)' : b.status === 'Falhou' ? 'var(--color-amber-mid)' : 'var(--color-green-mid)'
                const badgeClass = b.status === 'Aberto' || b.status === 'Em Andamento'
                  ? 'badge badge-red'
                  : b.status === 'Falhou'
                  ? 'badge badge-amber'
                  : 'badge badge-green'
                return (
                  <tr key={b.id} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                    <td className="table-cell" style={{ padding: '6px 8px', whiteSpace: 'nowrap', borderLeft: `3px solid ${stripeColor}` }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{b.id}</span>
                    </td>
                    <td className="table-cell" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <span className={badgeClass}>{b.status}</span>
                    </td>
                    <td className="table-cell text-small" style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>{b.assignee || '—'}</td>
                    <td className="table-cell" style={{ padding: '6px 8px', color: 'var(--color-text)' }}>{b.desc || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* -- Progresso por Funcionalidade (largura total) -- */}
      <Card title="Progresso de Testes por Funcionalidade" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5.5 1.5h4M6.5 1.5v4.5L3.5 13h8l-3-7V1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
        {featsBySuite.length === 0 ? (
          <div className="text-muted" style={{ fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
            Nenhuma funcionalidade ativa.
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Legenda global */}
            <div className="flex gap-3" style={{ marginBottom: 16 }}>
              {([['var(--color-green-mid)','Concluido'],['var(--color-red-mid)','Falha'],['var(--color-amber-mid)','Bloqueado'],['var(--color-bg)','Pendente']] as [string,string][]).map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, border: color === 'var(--color-bg)' ? '0.5px solid var(--color-border)' : 'none', flexShrink: 0 }} />
                  <span className="text-small">{label}</span>
                </div>
              ))}
            </div>
            {featsBySuite.map(({ suite, features }, suiteIdx) => (
              <div key={suite.id} style={{ marginTop: suiteIdx > 0 ? 16 : 0 }}>
                <div className="section-label" style={{ marginBottom: 8, marginTop: suiteIdx > 0 ? 12 : 0 }}>
                  {suite.name || 'Suite'}
                </div>
                {features.map((f) => {
                  const cases = f.cases ?? []
                  const total = cases.length
                  const concluido = cases.filter((c) => c.status === 'Concluído').length
                  const falhou    = cases.filter((c) => c.status === 'Falhou').length
                  const bloqueado = cases.filter((c) => c.status === 'Bloqueado').length
                  const pendente  = cases.filter((c) => c.status === 'Pendente').length
                  return (
                    <div key={f.id} className="flex items-center gap-2.5" style={{ marginBottom: 6 }}>
                      <span className="text-small" style={{ flex: '0 0 150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name || ''}>
                        {f.name || 'Sem nome'}
                      </span>
                      <div className="flex flex-1" style={{ height: 20, borderRadius: 4, overflow: 'hidden', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)' }}>
                        {total === 0 && <div style={{ flex: 1 }} />}
                        {concluido > 0 && <div className="flex items-center justify-center" style={{ flex: concluido, background: 'var(--color-green-mid)' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{concluido}</span></div>}
                        {falhou    > 0 && <div className="flex items-center justify-center" style={{ flex: falhou,    background: 'var(--color-red-mid)' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{falhou}</span></div>}
                        {bloqueado > 0 && <div className="flex items-center justify-center" style={{ flex: bloqueado, background: 'var(--color-amber-mid)' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{bloqueado}</span></div>}
                        {pendente  > 0 && <div style={{ flex: pendente }} />}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--color-text-3)', flex: '0 0 44px', textAlign: 'right', fontFamily: 'var(--font-family-mono)' }}>
                        {concluido + falhou}/{total}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* -- Execucao por Dia + MTTR -- */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Execucao por Dia" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 13V8.5M5.5 13V5.5M9.5 13V2.5M13.5 13V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}>
          <div style={{ height: 220 }}>
            <Bar
              data={{
                labels: dayLabels,
                datasets: [{
                  label: 'Executados',
                  data: execPerDay,
                  backgroundColor: execPerDay.map((v, i) =>
                    i + 1 <= maxDay && v === 0 ? '#E24B4A' : v > 0 ? '#378ADD' : '#e2e8f0'
                  ),
                  borderRadius: 4,
                }],
              }}
              options={{
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false }, datalabels: { display: true, anchor: 'center' as const, align: 'center' as const, color: '#fff', font: { weight: 'bold' as const, size: 11 }, formatter: (v: number) => v > 0 ? v : '' } },
              } as object}
            />
          </div>
        </Card>
        <Card title="MTTR — Tempo Medio de Resolucao por Stack (dias)" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 4.5V7.5L9.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div style={{ height: 220 }}>
            <Bar
              data={{ labels: STACKS, datasets: mttrDatasets }}
              options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Dias (media)' } } }, plugins: { legend: { position: 'top' as const, labels: LEGEND_LABELS }, datalabels: { display: true, anchor: 'end' as const, align: 'top' as const, color: '#64748b', font: { weight: 'bold' as const, size: 10 }, formatter: (v: number | null) => v && v > 0 ? `${v}d` : '' } } } as object}
            />
          </div>
        </Card>
      </div>

      {/* -- Bloqueios Geral + Origem dos Bugs -- */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Bloqueios Externos (Geral Acumulado)" pill={`${totalHorasGeral}h`} icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="3" y="7" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}>
          <div style={{ height: 220 }}>
            <Doughnut
              data={{
                labels: Object.keys(blockersAll).length ? Object.keys(blockersAll) : ['Nenhum'],
                datasets: [{ data: Object.values(blockersAll).length ? Object.values(blockersAll) : [0], backgroundColor: blockerColors(Object.keys(blockersAll).length ? Object.keys(blockersAll) : ['Nenhum']), borderWidth: 0 }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: LEGEND_LABELS }, datalabels: { display: true, color: '#fff', font: { weight: 'bold' as const, size: 12 }, formatter: (v: number) => v > 0 ? `${v}h` : '' } } } as object}
            />
          </div>
        </Card>
        <Card title="Origem dos Bugs (Stack)" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5.5 3a2 2 0 014 0M3 6h9M4.5 6v5a3 3 0 006 0V6M2 8.5h2.5M10.5 8.5H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}>
          <div style={{ height: 220 }}>
            <Pie
              data={{
                labels: Object.keys(bugsGrouped).length ? Object.keys(bugsGrouped) : ['Nenhum'],
                datasets: [{ data: Object.values(bugsGrouped).length ? Object.values(bugsGrouped) : [0], backgroundColor: stackColors(Object.keys(bugsGrouped).length ? Object.keys(bugsGrouped) : ['Nenhum']), borderWidth: 0 }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: LEGEND_LABELS }, datalabels: { display: true, color: '#fff', font: { weight: 'bold' as const, size: 12 }, formatter: (v: number) => v > 0 ? v : '' } } } as object}
            />
          </div>
        </Card>
      </div>

      {/* -- Status Bugs/Stack + Bugs/Feature/Stack -- */}
      <div className="grid grid-cols-2 gap-4">
        <Card title="Status dos Bugs por Stack" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 5L7.5 2l6 3-6 3-6-3zM1.5 8.5l6 3 6-3M1.5 11.5l6 3 6-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div style={{ height: 220 }}>
            <Bar
              data={{
                labels: uniqueStacks,
                datasets: [
                  { label: 'Aberto',       data: abertoData,    backgroundColor: '#E24B4A', borderRadius: 2 },
                  { label: 'Em Andamento', data: andamentoData, backgroundColor: '#EAB308', borderRadius: 2 },
                  { label: 'Resolvido',    data: resolvidoData, backgroundColor: '#639922', borderRadius: 2 },
                ],
              }}
              options={{ maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { position: 'top' as const, labels: LEGEND_LABELS }, datalabels: { display: true, anchor: 'center' as const, align: 'center' as const, color: '#fff', font: { weight: 'bold' as const, size: 11 }, formatter: (v: number) => v > 0 ? v : '' } } } as object}
            />
          </div>
        </Card>
        <Card title="Bugs por Funcionalidade e Stack" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="1.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="1.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="8.5" y="8.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/></svg>}>
          <div style={{ height: 220 }}>
            <Bar
              data={{
                labels: uniqueFeatBugs,
                datasets: [
                  { label: 'Front', data: bugFront, backgroundColor: '#378ADD', borderRadius: 2 },
                  { label: 'BFF',   data: bugBff,   backgroundColor: '#639922', borderRadius: 2 },
                  { label: 'Back',  data: bugBack,  backgroundColor: '#2C2C2A', borderRadius: 2 },
                ],
              }}
              options={{ maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } }, plugins: { legend: { position: 'top' as const, labels: LEGEND_LABELS }, datalabels: { display: true, anchor: 'center' as const, align: 'center' as const, color: '#fff', font: { weight: 'bold' as const, size: 11 }, formatter: (v: number) => v > 0 ? v : '' } } } as object}
            />
          </div>
        </Card>
      </div>


      {/* -- Bloqueios de Execucao + Falhas -- */}
      <div className="grid grid-cols-2 gap-4">
        {/* Bloqueios de Execucao */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="var(--color-red-mid)" strokeWidth="1.5" />
                <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-red-mid)">!</text>
              </svg>
              <span className="heading-sm" style={{ fontSize: 14, fontWeight: 500 }}>Bloqueios de execucao</span>
            </div>
            <span className="badge badge-neutral">{blockedItems.length} bloqueio{blockedItems.length !== 1 ? 's' : ''}</span>
          </div>

          {blockedItems.length === 0 ? (
            <EmptyOk label="Nenhum impedimento no momento." />
          ) : (
            <div className="flex flex-col gap-2">
              {blockedItems.map((item) => {
                const suiteName = suites.find((s) => String(s.id) === String(item.suiteId))?.name
                const stripeColor = item.stripe === 'blocked' ? 'var(--color-red-mid)' : 'var(--color-amber-mid)'
                return (
                  <div key={`${item.stripe}-${item.id}`} className="flex" style={{ border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ width: 3, flexShrink: 0, background: stripeColor, alignSelf: 'stretch' }} />
                    <div style={{ flex: 1, padding: '11px 14px' }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>
                          {item.name || 'Sem nome'}
                        </span>
                        {suiteName && (
                          <span className="badge badge-neutral shrink-0">{suiteName}</span>
                        )}
                      </div>
                      <div className="text-small" style={{ marginTop: 3, fontStyle: item.blockReason ? 'normal' : 'italic', color: item.blockReason ? 'var(--color-text-2)' : 'var(--color-text-3)' }}>
                        {item.blockReason || 'Motivo nao informado'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cenarios com Falha */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div className="flex items-center gap-2">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--color-red-mid)" strokeWidth="1.2" />
                <path d="M5 5l5 5M10 5l-5 5" stroke="var(--color-red-mid)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span className="heading-sm" style={{ fontSize: 14, fontWeight: 500 }}>Cenarios com falha</span>
            </div>
            <span className="badge badge-neutral">{failedScenarios.length} cenario{failedScenarios.length !== 1 ? 's' : ''}</span>
          </div>

          {failedScenarios.length === 0 ? (
            <EmptyOk label="Nenhum cenario com falha!" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  {['Funcionalidade', 'Cenario'].map((h) => (
                    <th key={h} className="table-header" style={{ padding: '6px 8px', fontSize: 10 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failedScenarios.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                    <td className="table-cell" style={{ padding: '6px 8px', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: '3px solid var(--color-red-mid)' }} title={item.featureName}>{item.featureName || '—'}</td>
                    <td className="table-cell" style={{ padding: '6px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.scenarioName}>{item.scenarioName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* -- Alinhamentos Tecnicos e de Produto -- */}
      <Card title="Alinhamentos Tecnicos e de Produto" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="10" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 13c0-2.2 1.8-4 4-4h5c2.2 0 4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}>
        {state.alignments.length === 0 ? (
          <div className="text-body" style={{ fontStyle: 'italic' }}>
            Nenhum alinhamento ou debito tecnico registrado no momento.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {state.alignments.map((a, i) => (
              <div key={a.id} className="flex gap-2.5" style={{ padding: '8px 12px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderLeft: '3px solid var(--color-border)', borderRadius: 6, lineHeight: 1.5 }}>
                <span className="text-muted shrink-0" style={{ fontSize: 11, fontWeight: 500, paddingTop: 1 }}>{i + 1}.</span>
                <span className="text-body" style={{ color: 'var(--color-text)' }}>{a.text || 'Nao descrito'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* -- Premissas + Plano de Acao -- */}
      <Card title="Premissas e Plano de Acao" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5v5M4.5 6.5h6M5 7v1.5a2.5 2.5 0 005 0V7M7.5 9.5V13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>
              Premissas do Ciclo de Testes
            </div>
            {state.notes.premises ? (
              <div className="flex flex-col gap-1.5">
                {state.notes.premises.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--color-red-mid)', fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>{line}</div>
                ))}
              </div>
            ) : (
              <div className="text-muted" style={{ fontStyle: 'italic' }}>Nenhuma premissa registrada.</div>
            )}
          </div>
          <div>
            <div className="section-label" style={{ marginBottom: 8 }}>
              Plano de Acao e Gatilhos
            </div>
            {state.notes.actionPlan ? (
              <div className="flex flex-col gap-1.5">
                {state.notes.actionPlan.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--color-blue)', fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>{line}</div>
                ))}
              </div>
            ) : (
              <div className="text-muted" style={{ fontStyle: 'italic' }}>Nenhum plano de acao registrado.</div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

// --- Sub-components ---

const HeroCard = memo(function HeroCard({ label, value, sub, valueColor, barColor, highlight }: {
  label: string; value: string | number; sub?: string; valueColor?: string; barColor?: string; highlight?: boolean
}) {
  return (
    <div className="card-sm flex flex-col gap-1.5" style={{
      background: highlight ? 'var(--color-red-light)' : undefined,
      border: highlight ? '1.5px solid var(--color-red-mid)' : undefined,
      padding: '16px 18px 18px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div className="section-label" style={{ marginBottom: 0, lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: highlight ? 40 : 32, fontWeight: 700, color: valueColor ?? 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      {sub && <div className="text-muted" style={{ fontSize: 11, marginBottom: 4 }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: barColor ?? '#6b7280' }} />
    </div>
  )
})

const KpiCard = memo(function KpiCard({ label, value, sub, valueColor, borderColor }: {
  label: string; value: string | number; sub?: string; valueColor?: string; borderColor?: string
}) {
  return (
    <div className="card" style={{ borderBottom: borderColor ? `3px solid ${borderColor}` : undefined, padding: '14px 16px' }}>
      <div className="section-label" style={{ marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: valueColor ?? 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      {sub && <div className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  )
})

const Card = memo(function Card({ title, icon, pill, children }: { title: string; icon?: React.ReactNode; pill?: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="flex items-center justify-between" style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)' }}>
        <div className="flex items-center gap-2">
          {icon && <span className="text-small flex shrink-0">{icon}</span>}
          <span className="heading-sm" style={{ fontSize: 14, fontWeight: 500 }}>{title}</span>
        </div>
        {pill && (
          <span className="badge badge-neutral shrink-0">{pill}</span>
        )}
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  )
})

const Section = memo(function Section({ title, icon, count, children }: { title: string; icon: string; count: number; children: React.ReactNode }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="flex items-center gap-2" style={{ padding: '12px 16px', borderBottom: '1px solid var(--color-border)' }}>
        <span>{icon}</span>
        <span className="heading-sm" style={{ fontSize: 14 }}>{title}</span>
        <span className="badge badge-neutral ml-auto" style={{ fontWeight: 600 }}>{count}</span>
      </div>
      <div className="flex flex-col gap-2" style={{ padding: 12 }}>{children}</div>
    </div>
  )
})

const EmptyOk = memo(function EmptyOk({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: 72, color: 'var(--color-green)', fontWeight: 600, background: 'var(--color-green-light)', borderRadius: 8, border: '1px dashed var(--color-green-mid)', fontSize: 13 }}>
      ✅ {label}
    </div>
  )
})

const Badge = memo(function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="badge" style={{ background: color, color: '#fff', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
  )
})

function alertCard(bg: string, border: string, accent: string): React.CSSProperties {
  return { padding: '12px 14px', background: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${accent}`, borderRadius: 8 }
}
