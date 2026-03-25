import type { SprintState, SprintIndexEntry } from '../types/sprint.types'
import { getMasterIndex, loadFromStorage, computeFields, normalizeState, countSprintDays } from './persistence'

export interface SprintKPIs {
  healthScore: number
  execPercent: number
  totalTests: number
  totalExec: number
  testesExecutaveis: number
  testesComprometidos: number
  capacidadeReal: number
  openBugs: number
  resolvedBugs: number
  mttrGlobal: number
  retestIndex: number
  totalBlockedHours: number
  atrasoCasos: number
}

export interface SprintComparisonItem {
  entry: SprintIndexEntry
  kpis: SprintKPIs
}

export function computeSprintKPIs(state: SprintState): SprintKPIs {
  const sprintDays = state.config.sprintDays || 20
  const activeFeatures = state.features.filter((f) => f.status !== 'Cancelada')

  const totalTests = activeFeatures.reduce((a, f) => a + (f.tests || 0), 0)
  const totalExec = activeFeatures.reduce((a, f) => a + (f.exec || 0), 0)

  const testesComprometidos = activeFeatures.reduce((a, f) => {
    if (f.status === 'Bloqueada') return a + (f.tests || 0)
    return a + (f.cases ?? []).filter((c) => c.status === 'Bloqueado').length
  }, 0)
  const testesExecutaveis = Math.max(0, totalTests - testesComprometidos)
  const capacidadeReal = totalTests === 0 ? 0 : Math.round((testesExecutaveis / totalTests) * 100)
  const execPercent = testesExecutaveis === 0 ? 0 : Math.min(100, Math.round((totalExec / testesExecutaveis) * 100))

  const totalBlockedHours = state.blockers.reduce((a, b) => a + (b.hours || 0), 0)
  const openBugs = state.bugs.filter((b) => b.status !== 'Resolvido').length
  const resolvedBugsList = state.bugs.filter((b) => b.status === 'Resolvido')

  let mttrGlobal = 0
  if (resolvedBugsList.length > 0) {
    const totalMs = resolvedBugsList.reduce((a, b) => {
      if (!b.openedAt || !b.resolvedAt) return a
      return a + (new Date(b.resolvedAt).getTime() - new Date(b.openedAt).getTime())
    }, 0)
    mttrGlobal = Math.round(totalMs / resolvedBugsList.length / 3600000)
  }

  let totalRetests = 0
  state.bugs.forEach((b) => { totalRetests += b.retests || 0 })
  const totalBugs = state.bugs.length
  const retestIndex = totalBugs + totalRetests > 0
    ? Math.round((totalRetests / (totalBugs + totalRetests)) * 100)
    : 0

  let healthScore = 100
  const { hsCritical = 15, hsHigh = 10, hsMedium = 5, hsLow = 2, hsRetest = 2, hsBlocked = 10, hsDelayed = 2 } = state.config
  state.bugs.forEach((b) => {
    healthScore -= (b.retests || 0) * hsRetest
    if (b.status !== 'Resolvido') {
      if (b.severity === 'Crítica') healthScore -= hsCritical
      else if (b.severity === 'Alta') healthScore -= hsHigh
      else if (b.severity === 'Média') healthScore -= hsMedium
      else if (b.severity === 'Baixa') healthScore -= hsLow
    }
  })
  const blockedFeaturesOnly = activeFeatures.filter((f) => f.status === 'Bloqueada').length
  healthScore -= blockedFeaturesOnly * hsBlocked

  const excludeWeekends = state.config.excludeWeekends ?? true
  let currentDay = 0
  if (state.config.startDate && state.config.endDate) {
    const refDate = state.currentDate > state.config.endDate ? state.config.endDate : state.currentDate
    currentDay = Math.min(countSprintDays(state.config.startDate, refDate, excludeWeekends), sprintDays)
  }
  const exactMeta = testesExecutaveis > 0 ? testesExecutaveis / sprintDays : 0
  const atrasoCasos = Math.max(0, Math.round(exactMeta * currentDay - totalExec))
  healthScore -= atrasoCasos * hsDelayed
  healthScore = Math.min(100, Math.max(0, Math.round(healthScore)))

  return {
    healthScore, execPercent, totalTests, totalExec,
    testesExecutaveis, testesComprometidos, capacidadeReal,
    openBugs, resolvedBugs: resolvedBugsList.length,
    mttrGlobal, retestIndex, totalBlockedHours, atrasoCasos,
  }
}

export function loadSprintsForComparison(ids: string[]): SprintComparisonItem[] {
  const masterIndex = getMasterIndex()
  const result: SprintComparisonItem[] = []
  for (const id of ids) {
    const entry = masterIndex.find((s) => s.id === id)
    if (!entry) continue
    const raw = loadFromStorage(id)
    if (!raw) continue
    const state = computeFields(normalizeState(raw))
    result.push({ entry, kpis: computeSprintKPIs(state) })
  }
  return result.sort((a, b) => (a.entry.startDate || '').localeCompare(b.entry.startDate || ''))
}
