import { useSprintStore, getFilteredFeatures } from '../../store/sprintStore'

export function useSprintMetrics() {
  const state = useSprintStore((s) => s.state)
  const filter = useSprintStore((s) => s.activeSuiteFilter)

  const sprintDays = state.config.sprintDays || 20
  const filtered = getFilteredFeatures(state, filter)
  const activeFeatures = filtered.filter((f) => f.status !== 'Cancelada')

  const totalTests = activeFeatures.reduce((a, f) => a + (f.tests || 0), 0)
  const totalExec = activeFeatures.reduce((a, f) => a + (f.exec || 0), 0)
  const remaining = Math.max(0, totalTests - totalExec)
  const execPercent = totalTests === 0 ? 0 : Math.round((totalExec / totalTests) * 100)
  const metaPerDay = totalTests > 0 ? Math.ceil(totalTests / sprintDays) : 0

  // ── Capacidade Real ───────────────────────────────────────────────────────
  const testesComprometidos = activeFeatures
    .filter((f) => f.status === 'Bloqueada')
    .reduce((a, f) => a + (f.tests || 0), 0)
  const testesExecutaveis = totalTests - testesComprometidos
  const capacidadeReal = totalTests === 0
    ? 100
    : Math.round((testesExecutaveis / totalTests) * 100)

  const totalBlockedHours = state.blockers.reduce((a, b) => a + (b.hours || 0), 0)
  const openBugs = state.bugs.filter((b) => b.status !== 'Resolvido').length

  // Delay calc: latest day with any execution
  let maxDay = 1
  activeFeatures.forEach((f) => {
    Object.keys(f.execution ?? {}).forEach((k) => {
      const v = f.execution[k]
      if (v > 0) {
        const n = parseInt(k.replace('D', ''))
        if (n > maxDay) maxDay = n
      }
    })
  })
  const exactMeta = totalTests > 0 ? totalTests / sprintDays : 0
  const idealToday = exactMeta * maxDay
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

  const blockedFeatureCount = activeFeatures.filter((f) => f.status === 'Bloqueada').length
  healthScore -= blockedFeatureCount * hsBlocked
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
