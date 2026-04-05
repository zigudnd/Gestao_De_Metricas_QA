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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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


// ─── OverviewTab ─────────────────────────────────────────────────────────────

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

  // ── Lists ─────────────────────────────────────────────────────────────────
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

  // ── Colors ────────────────────────────────────────────────────────────────
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Status Bar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          {ritmoStatus !== 'ok' && (
            <span style={{ fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: 'var(--color-red-light)', color: 'var(--color-red-mid)', border: '0.5px solid var(--color-red-mid)', letterSpacing: '0.5px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              EM ATRASO
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state.config.title || 'Sprint atual'}
          </span>
          {atrasoCasos > 0 && (
            <span style={{ fontSize: 12, color: 'var(--color-text-2)', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {atrasoPercent}% de atraso · {atrasoCasos} casos
            </span>
          )}
        </div>
        {suites.length >= 2 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {suites.map((suite) => {
              const active = filter.size === 0 || filter.has(String(suite.id))
              const cnt = state.features.filter((f) => String(f.suiteId) === String(suite.id)).length
              return (
                <button key={suite.id} onClick={() => toggleSuiteFilter(String(suite.id))} aria-label={`Filtrar suite ${suite.name || 'Suite'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, border: `0.5px solid ${active ? 'var(--color-blue)' : 'var(--color-border-md)'}`, background: active ? 'var(--color-blue)' : 'transparent', color: active ? '#fff' : 'var(--color-text-2)', fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}>
                  {suite.name || 'Suite'} <span style={{ opacity: 0.75 }}>{cnt}f</span>
                </button>
              )
            })}
            {filter.size > 0 && (
              <button onClick={clearSuiteFilter} aria-label="Limpar filtros de suite" style={{ fontSize: 11, padding: '3px 8px', borderRadius: 10, border: '0.5px solid var(--color-border-md)', background: 'transparent', color: 'var(--color-text-2)', cursor: 'pointer', fontFamily: 'var(--font-family-sans)' }}>
                ✕ Todas
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Hero Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <HeroCard label="QA Health Score" value={`${healthScore}%`} sub="saúde geral da sprint" valueColor={hsColor} barColor={healthScore >= 90 ? 'var(--color-green-mid)' : healthScore >= 70 ? 'var(--color-amber-mid)' : 'var(--color-red-mid)'} />
        <HeroCard label="Total de Testes" value={totalTests} sub="escopo total da sprint" barColor="#6b7280" />
        <HeroCard label="Executados" value={`${execPercent}%`} sub={`${totalExec} de ${testesExecutaveis} executáveis`} barColor={execPercent >= 90 ? 'var(--color-green-mid)' : execPercent >= 50 ? 'var(--color-amber-mid)' : '#6b7280'} />
        <HeroCard label="🐞 Bugs Abertos" value={openBugs} sub="aguardando resolução" valueColor={openBugs > 0 ? 'var(--color-red-mid)' : 'var(--color-green-mid)'} barColor={openBugs > 0 ? 'var(--color-red-mid)' : 'var(--color-green-mid)'} highlight={openBugs > 0} />
      </div>

      {/* ── Alert Strips ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--color-green-light)', border: '0.5px solid var(--color-green-mid)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-green-mid)' }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-green)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>OK</span>
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
        <div style={{ background: 'var(--color-red-light)', border: '0.5px solid var(--color-red-mid)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-red-mid)' }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-red)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{testesComprometidos > 0 ? 'ALERTA' : 'OK'}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-red)' }}>
              {testesComprometidos > 0 ? `${testesComprometidos} testes bloqueados` : 'Sem testes bloqueados'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-red)', opacity: 0.75, marginTop: 2 }}>
              {testesComprometidos > 0 ? `${blockedFeatureCount} funcionalidade${blockedFeatureCount !== 1 ? 's' : ''} impedindo a execução` : 'Todos os testes estão liberados para execução'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Faixas Qualitativas ────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-blue)' }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: 'var(--color-blue)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>MTTR</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              MTTR Global — {mttrGlobal !== null ? `${mttrGlobal}d` : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
              tempo médio de resolução de bugs
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, marginTop: 3 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: retestIndexColor }} />
            <span style={{ fontSize: 9, fontWeight: 800, color: retestIndexColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{retestIndexLabel}</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
              Índice de Retrabalho — {retestIndex}%
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-text-2)', marginTop: 2 }}>
              {retestIndexLabel} · proporção de revalidações
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        <KpiCard label="Testes Executáveis" value={testesExecutaveis} sub="possíveis de executar agora" />
        <KpiCard label="Capacidade Real" value={`${capacidadeReal}%`} sub="do escopo acessível" />
        <KpiCard label="Meta por Dia" value={metaPerDay} sub={`Planejado / ${sprintDays} dias`} />
        <KpiCard label="Horas Bloqueadas" value={`${totalBlockedHours}h`} sub="perdidas por impedimentos" />
      </div>

      {/* ── Report do Dia + Bloqueios Hoje ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <Card
          title="Report do Dia"
          icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="3" y="1.5" width="9" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/><path d="M5.5 5h4M5.5 7.5h4M5.5 10h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}
        >
          {todayReport
            ? <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{todayReport}</div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 100, gap: 8 }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><rect x="4" y="2" width="16" height="20" rx="2" stroke="var(--color-text-3)" strokeWidth="1.2"/><path d="M8 8h8M8 12h8M8 16h5" stroke="var(--color-text-3)" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <span style={{ fontSize: 13, color: 'var(--color-text-3)' }}>Nenhum reporte registrado hoje</span>
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

      {/* ── Burndown Chart ────────────────────────────────────────────────── */}
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

      {/* ── Bugs Abertos — tabela compacta (largura total) ───────────────── */}
      <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🐞</span>
          <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>Bugs Abertos</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-2)', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '2px 8px', fontWeight: 500 }}>
            {openBugsList.length} bug{openBugsList.length !== 1 ? 's' : ''}
          </span>
        </div>
        {openBugsList.length === 0 ? (
          <div style={{ padding: '14px 14px' }}><EmptyOk label="🎉 Nenhum bug aberto!" /></div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg)' }}>
                {['ID', 'Status', 'Responsável', 'Descrição'].map((h) => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-2)', borderBottom: '0.5px solid var(--color-border)', whiteSpace: 'nowrap', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {openBugsList.map((b) => {
                const stripeColor = b.status === 'Aberto' || b.status === 'Em Andamento' ? 'var(--color-red-mid)' : b.status === 'Falhou' ? 'var(--color-amber-mid)' : 'var(--color-green-mid)'
                const badgeStyle: React.CSSProperties = b.status === 'Aberto' || b.status === 'Em Andamento'
                  ? { background: '#FCEBEB', color: '#A32D2D', border: '0.5px solid #F7C1C1' }
                  : b.status === 'Falhou'
                  ? { background: '#FAEEDA', color: '#854F0B', border: '0.5px solid #FAC775' }
                  : { background: '#EAF3DE', color: '#3B6D11', border: '0.5px solid #C0DD97' }
                return (
                  <tr key={b.id} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', borderLeft: `3px solid ${stripeColor}` }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text)' }}>{b.id}</span>
                    </td>
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 500, borderRadius: 10, padding: '2px 8px', ...badgeStyle }}>{b.status}</span>
                    </td>
                    <td style={{ padding: '6px 8px', color: 'var(--color-text-2)', whiteSpace: 'nowrap' }}>{b.assignee || '—'}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--color-text)' }}>{b.desc || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Progresso por Funcionalidade (largura total) ──────────────────── */}
      <Card title="Progresso de Testes por Funcionalidade" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5.5 1.5h4M6.5 1.5v4.5L3.5 13h8l-3-7V1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
        {featsBySuite.length === 0 ? (
          <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
            Nenhuma funcionalidade ativa.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Legenda global */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {([['var(--color-green-mid)','Concluído'],['var(--color-red-mid)','Falha'],['var(--color-amber-mid)','Bloqueado'],['var(--color-bg)','Pendente']] as [string,string][]).map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, border: color === 'var(--color-bg)' ? '0.5px solid var(--color-border)' : 'none', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--color-text-2)' }}>{label}</span>
                </div>
              ))}
            </div>
            {featsBySuite.map(({ suite, features }, suiteIdx) => (
              <div key={suite.id} style={{ marginTop: suiteIdx > 0 ? 16 : 0 }}>
                {/* Suite label */}
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginTop: suiteIdx > 0 ? 12 : 0 }}>
                  {suite.name || 'Suite'}
                </div>
                {/* Feature rows */}
                {features.map((f) => {
                  const cases = f.cases ?? []
                  const total = cases.length
                  const concluido = cases.filter((c) => c.status === 'Concluído').length
                  const falhou    = cases.filter((c) => c.status === 'Falhou').length
                  const bloqueado = cases.filter((c) => c.status === 'Bloqueado').length
                  const pendente  = cases.filter((c) => c.status === 'Pendente').length
                  return (
                    <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-2)', flex: '0 0 150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.name || ''}>
                        {f.name || 'Sem nome'}
                      </span>
                      <div style={{ flex: 1, height: 20, borderRadius: 4, overflow: 'hidden', display: 'flex', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)' }}>
                        {total === 0 && <div style={{ flex: 1 }} />}
                        {concluido > 0 && <div style={{ flex: concluido, background: 'var(--color-green-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{concluido}</span></div>}
                        {falhou    > 0 && <div style={{ flex: falhou,    background: 'var(--color-red-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{falhou}</span></div>}
                        {bloqueado > 0 && <div style={{ flex: bloqueado, background: 'var(--color-amber-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{bloqueado}</span></div>}
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

      {/* ── Execução por Dia + MTTR ───────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card title="Execução por Dia" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M1.5 13V8.5M5.5 13V5.5M9.5 13V2.5M13.5 13V7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}>
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
        <Card title="MTTR — Tempo Médio de Resolução por Stack (dias)" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/><path d="M7.5 4.5V7.5L9.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
          <div style={{ height: 220 }}>
            <Bar
              data={{ labels: STACKS, datasets: mttrDatasets }}
              options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: 'Dias (média)' } } }, plugins: { legend: { position: 'top' as const, labels: LEGEND_LABELS }, datalabels: { display: true, anchor: 'end' as const, align: 'top' as const, color: '#64748b', font: { weight: 'bold' as const, size: 10 }, formatter: (v: number | null) => v && v > 0 ? `${v}d` : '' } } } as object}
            />
          </div>
        </Card>
      </div>

      {/* ── Bloqueios Geral + Origem dos Bugs ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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

      {/* ── Status Bugs/Stack + Bugs/Feature/Stack ────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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


      {/* ── Bloqueios de Execução + Falhas ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Bloqueios de Execução — novo padrão visual */}
        <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="var(--color-red-mid)" strokeWidth="1.5" />
                <text x="8" y="12" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--color-red-mid)">!</text>
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>Bloqueios de execução</span>
            </div>
            <span style={{ fontSize: 11, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '2px 8px', color: 'var(--color-text-2)' }}>
              {blockedItems.length} bloqueio{blockedItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Items */}
          {blockedItems.length === 0 ? (
            <EmptyOk label="Nenhum impedimento no momento." />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {blockedItems.map((item) => {
                const suiteName = suites.find((s) => String(s.id) === String(item.suiteId))?.name
                const stripeColor = item.stripe === 'blocked' ? 'var(--color-red-mid)' : 'var(--color-amber-mid)'
                return (
                  <div key={`${item.stripe}-${item.id}`} style={{ display: 'flex', border: '0.5px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ width: 3, flexShrink: 0, background: stripeColor, alignSelf: 'stretch' }} />
                    <div style={{ flex: 1, padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>
                          {item.name || 'Sem nome'}
                        </span>
                        {suiteName && (
                          <span style={{ fontSize: 10, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 8, padding: '1px 7px', color: 'var(--color-text-2)', flexShrink: 0 }}>
                            {suiteName}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: item.blockReason ? 'var(--color-text-2)' : 'var(--color-text-3)', marginTop: 3, fontStyle: item.blockReason ? 'normal' : 'italic' }}>
                        {item.blockReason || 'Motivo não informado'}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Cenários com Falha — novo padrão visual */}
        <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 12, padding: '18px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="6.5" stroke="var(--color-red-mid)" strokeWidth="1.2" />
                <path d="M5 5l5 5M10 5l-5 5" stroke="var(--color-red-mid)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>Cenários com falha</span>
            </div>
            <span style={{ fontSize: 11, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '2px 8px', color: 'var(--color-text-2)' }}>
              {failedScenarios.length} cenário{failedScenarios.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Tabela */}
          {failedScenarios.length === 0 ? (
            <EmptyOk label="Nenhum cenário com falha!" />
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'var(--color-bg)' }}>
                  {['Funcionalidade', 'Cenário'].map((h) => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-2)', borderBottom: '0.5px solid var(--color-border)', whiteSpace: 'nowrap', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {failedScenarios.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '0.5px solid var(--color-border)' }}>
                    <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', color: 'var(--color-text-2)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', borderLeft: '3px solid var(--color-red-mid)' }} title={item.featureName}>{item.featureName || '—'}</td>
                    <td style={{ padding: '6px 8px', color: 'var(--color-text)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.scenarioName}>{item.scenarioName || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Alinhamentos Técnicos e de Produto ───────────────────────────── */}
      <Card title="Alinhamentos Técnicos e de Produto" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/><circle cx="10" cy="4" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M1 13c0-2.2 1.8-4 4-4h5c2.2 0 4 1.8 4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>}>
        {state.alignments.length === 0 ? (
          <div style={{ color: 'var(--color-text-2)', fontSize: 13, fontStyle: 'italic' }}>
            Nenhum alinhamento ou débito técnico registrado no momento.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {state.alignments.map((a, i) => (
              <div key={a.id} style={{ display: 'flex', gap: 10, padding: '8px 12px', background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderLeft: '3px solid var(--color-border)', borderRadius: 6, lineHeight: 1.5 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-3)', flexShrink: 0, paddingTop: 1 }}>{i + 1}.</span>
                <span style={{ fontSize: 13, color: 'var(--color-text)' }}>{a.text || 'Não descrito'}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Premissas + Plano de Ação ─────────────────────────────────────── */}
      <Card title="Premissas e Plano de Ação" icon={<svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5v5M4.5 6.5h6M5 7v1.5a2.5 2.5 0 005 0V7M7.5 9.5V13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Premissas do Ciclo de Testes
            </div>
            {state.notes.premises ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {state.notes.premises.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--color-red-mid)', fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>{line}</div>
                ))}
              </div>
            ) : (
              <div style={{ color: 'var(--color-text-3)', fontSize: 13, fontStyle: 'italic' }}>Nenhuma premissa registrada.</div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Plano de Ação e Gatilhos
            </div>
            {state.notes.actionPlan ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {state.notes.actionPlan.split('\n').filter(Boolean).map((line, i) => (
                  <div key={i} style={{ background: 'var(--color-bg)', borderRadius: 8, padding: '10px 14px', borderLeft: '3px solid var(--color-blue)', fontSize: 12, color: 'var(--color-text)', lineHeight: 1.5 }}>{line}</div>
                ))}
              </div>
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

const HeroCard = memo(function HeroCard({ label, value, sub, valueColor, barColor, highlight }: {
  label: string; value: string | number; sub?: string; valueColor?: string; barColor?: string; highlight?: boolean
}) {
  return (
    <div style={{
      background: highlight ? 'var(--color-red-light)' : 'var(--color-surface)',
      border: `${highlight ? '1.5px' : '0.5px'} solid ${highlight ? 'var(--color-red-mid)' : 'var(--color-border)'}`,
      borderRadius: 10,
      padding: '16px 18px 18px',
      display: 'flex', flexDirection: 'column', gap: 6,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1.3 }}>{label}</div>
      <div style={{ fontSize: highlight ? 40 : 32, fontWeight: 700, color: valueColor ?? 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginBottom: 4 }}>{sub}</div>}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: barColor ?? '#6b7280' }} />
    </div>
  )
})

const KpiCard = memo(function KpiCard({ label, value, sub, valueColor, borderColor }: {
  label: string; value: string | number; sub?: string; valueColor?: string; borderColor?: string
}) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderBottom: borderColor ? `3px solid ${borderColor}` : undefined, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: valueColor ?? 'var(--color-text)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-text-3)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
})

const Card = memo(function Card({ title, icon, pill, children }: { title: string; icon?: React.ReactNode; pill?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-surface)', border: '0.5px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span style={{ color: 'var(--color-text-2)', display: 'flex', flexShrink: 0 }}>{icon}</span>}
          <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>{title}</span>
        </div>
        {pill && (
          <span style={{ fontSize: 11, background: 'var(--color-bg)', border: '0.5px solid var(--color-border)', borderRadius: 10, padding: '2px 8px', color: 'var(--color-text-2)', flexShrink: 0 }}>
            {pill}
          </span>
        )}
      </div>
      <div style={{ padding: '12px 16px' }}>{children}</div>
    </div>
  )
})

const Section = memo(function Section({ title, icon, count, children }: { title: string; icon: string; count: number; children: React.ReactNode }) {
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
})

const EmptyOk = memo(function EmptyOk({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 72, color: 'var(--color-green)', fontWeight: 600, background: 'var(--color-green-light)', borderRadius: 8, border: '1px dashed var(--color-green-mid)', fontSize: 13 }}>
      ✅ {label}
    </div>
  )
})

const Badge = memo(function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ fontSize: 10, background: color, color: '#fff', padding: '3px 8px', borderRadius: 12, fontWeight: 700, textTransform: 'uppercase', flexShrink: 0 }}>{label}</span>
  )
})

function alertCard(bg: string, border: string, accent: string): React.CSSProperties {
  return { padding: '12px 14px', background: bg, border: `1px solid ${border}`, borderLeft: `4px solid ${accent}`, borderRadius: 8 }
}
