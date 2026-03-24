import { useSprintStore, getFilteredFeatures } from '../../store/sprintStore'
import { countSprintDays } from '../../services/persistence'

export function useSprintMetrics() {
  const state = useSprintStore((s) => s.state)
  const filter = useSprintStore((s) => s.activeSuiteFilter)

  const sprintDays = state.config.sprintDays || 20
  const filtered = getFilteredFeatures(state, filter)
  const activeFeatures = filtered.filter((f) => f.status !== 'Cancelada')

  const totalTests = activeFeatures.reduce((a, f) => a + (f.tests || 0), 0)
  const totalExec = activeFeatures.reduce((a, f) => a + (f.exec || 0), 0)
  const remaining = Math.max(0, totalTests - totalExec)

  // ── Capacidade Real ───────────────────────────────────────────────────────
  // Comprometidos = todos os testes de features Bloqueadas
  //               + casos individuais com status 'Bloqueado' em features ativas
  const testesComprometidos = activeFeatures.reduce((a, f) => {
    if (f.status === 'Bloqueada') return a + (f.tests || 0)
    return a + (f.cases ?? []).filter((c) => c.status === 'Bloqueado').length
  }, 0)
  const testesExecutaveis = Math.max(0, totalTests - testesComprometidos)
  const capacidadeReal = totalTests === 0
    ? 0
    : Math.round((testesExecutaveis / totalTests) * 100)

  // Features com ao menos um impedimento (feature Bloqueada ou caso Bloqueado)
  const blockedFeatureCount = activeFeatures.filter(
    (f) => f.status === 'Bloqueada' || (f.cases ?? []).some((c) => c.status === 'Bloqueado'),
  ).length

  // execPercent: base em testesExecutaveis (bloqueados não entram na meta)
  const execPercent = testesExecutaveis === 0 ? 0 : Math.min(100, Math.round((totalExec / testesExecutaveis) * 100))
  const metaPerDay = testesExecutaveis > 0 ? Math.ceil(testesExecutaveis / sprintDays) : 0

  const totalBlockedHours = state.blockers.reduce((a, b) => a + (b.hours || 0), 0)
  const openBugs = state.bugs.filter((b) => b.status !== 'Resolvido').length

  // Delay calc: dias decorridos até hoje (currentDate), capped no fim da sprint
  const excludeWeekends = state.config.excludeWeekends ?? true
  let currentDay = 0
  if (state.config.startDate) {
    const refDate = state.config.endDate && state.currentDate > state.config.endDate
      ? state.config.endDate
      : state.currentDate
    currentDay = Math.min(
      countSprintDays(state.config.startDate, refDate, excludeWeekends),
      sprintDays,
    )
  }
  // Meta baseada em testesExecutaveis — bloqueados não entram na meta diária
  const exactMeta = testesExecutaveis > 0 ? testesExecutaveis / sprintDays : 0
  const idealToday = exactMeta * currentDay
  const atrasoCasos = Math.max(0, Math.round(idealToday - totalExec))

  // Health Score
  let healthScore = 100
  let totalRetests = 0
  const { hsCritical = 15, hsHigh = 10, hsMedium = 5, hsLow = 2, hsRetest = 2, hsBlocked = 10, hsDelayed = 2 } = state.config

  state.bugs.forEach((b) => {
    const rt = b.retests || 0
    totalRetests += rt
    healthScore -= rt * hsRetest
    if (b.status !== 'Resolvido') {
      if (b.severity === 'Crítica') healthScore -= hsCritical
      else if (b.severity === 'Alta') healthScore -= hsHigh
      else if (b.severity === 'Média') healthScore -= hsMedium
      else if (b.severity === 'Baixa') healthScore -= hsLow
    }
  })

  // Health Score penaliza apenas features inteiramente bloqueadas (não casos individuais)
  const blockedFeaturesOnly = activeFeatures.filter((f) => f.status === 'Bloqueada').length
  healthScore -= blockedFeaturesOnly * hsBlocked
  if (atrasoCasos > 0) healthScore -= atrasoCasos * hsDelayed
  healthScore = Math.min(100, Math.max(0, Math.round(healthScore)))

  const totalBugs = state.bugs.length
  const retestIndex = totalBugs + totalRetests > 0
    ? Math.round((totalRetests / (totalBugs + totalRetests)) * 100)
    : 0

  let ritmoStatus: 'ok' | 'warning' | 'danger' = 'ok'
  if (atrasoCasos > 5) ritmoStatus = 'danger'
  else if (atrasoCasos > 0) ritmoStatus = 'warning'

  return {
    sprintDays,
    filtered,
    activeFeatures,
    totalTests,
    totalExec,
    execPercent,
    remaining,
    metaPerDay,
    exactMeta,
    totalBlockedHours,
    openBugs,
    atrasoCasos,
    healthScore,
    totalRetests,
    retestIndex,
    blockedFeatureCount,
    ritmoStatus,
    testesComprometidos,
    testesExecutaveis,
    capacidadeReal,
  }
}
