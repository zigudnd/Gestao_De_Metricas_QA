import type {
  Release, ReleaseSquad, ReleaseMetrics, SquadMetrics,
  ReleaseSquadStatus, SnapshotTotals,
} from '../types/release.types'

// ─── Squad-level totals ─────────────────────────────────────────────────────

function computeTotals(squad: ReleaseSquad): SnapshotTotals {
  let totalTests = 0
  let executedTests = 0
  let passedTests = 0
  let failedTests = 0
  let blockedTests = 0

  for (const f of squad.features) {
    totalTests += f.tests || 0
    for (const c of f.cases) {
      if (c.status === 'Concluído') { executedTests++; passedTests++ }
      else if (c.status === 'Falhou') { executedTests++; failedTests++ }
      else if (c.status === 'Bloqueado') { blockedTests++ }
    }
  }

  const openBugs = squad.bugs.filter((b) => b.status === 'Aberto' || b.status === 'Em Andamento').length
  const resolvedBugs = squad.bugs.filter((b) => b.status === 'Resolvido').length

  return {
    totalTests,
    executedTests,
    passedTests,
    failedTests,
    blockedTests,
    openBugs,
    resolvedBugs,
    blockers: squad.blockers.length,
  }
}

// ─── computeSquadMetrics ────────────────────────────────────────────────────

export function computeSquadMetrics(squad: ReleaseSquad, _release: Release): SquadMetrics {
  const t = computeTotals(squad)
  const coveragePct = t.totalTests > 0 ? Math.round((t.executedTests / t.totalTests) * 100) : 0
  const passPct = t.totalTests > 0 ? Math.round((t.passedTests / t.totalTests) * 100) : 0

  return {
    totalTests: t.totalTests,
    executedTests: t.executedTests,
    passedTests: t.passedTests,
    failedTests: t.failedTests,
    blockedTests: t.blockedTests,
    openBugs: t.openBugs,
    resolvedBugs: t.resolvedBugs,
    blockers: t.blockers,
    coveragePct,
    passPct,
  }
}

// ─── isFeatureBlocking ──────────────────────────────────────────────────────

export function isFeatureBlocking(featureId: string, nonBlockingIds: string[]): boolean {
  return !nonBlockingIds.includes(featureId)
}

// ─── computeSquadStatus ─────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  const diffMs = target.getTime() - now.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export function computeSquadStatus(squad: ReleaseSquad, release: Release): ReleaseSquadStatus {
  const metrics = computeSquadMetrics(squad, release)

  // Manual override: if squad is already marked as blocked, keep it
  if (squad.status === 'blocked') return 'blocked'

  // If there are active blockers, squad is blocked
  if (metrics.blockers > 0) return 'blocked'

  // Concluido: 100% mandatory tests executed AND 0 critical/high bugs open
  const hasCriticalOrHighBugs = squad.bugs.some(
    (b) => (b.status === 'Aberto' || b.status === 'Em Andamento') &&
           (b.severity === 'Crítica' || b.severity === 'Alta')
  )
  if (
    metrics.totalTests > 0 &&
    metrics.executedTests >= metrics.totalTests &&
    !hasCriticalOrHighBugs
  ) {
    return 'approved'
  }

  // Pendente: 0 tests executed
  if (metrics.totalTests === 0 || metrics.executedTests === 0) return 'not_started'

  // Atrasado: <=3 days to homologEnd AND mandatory < 80%
  // OR critical bugs open AND <=5 days
  const daysToEnd = daysUntil(release.homologacaoEnd)
  const mandatoryPct = metrics.totalTests > 0
    ? (metrics.executedTests / metrics.totalTests) * 100
    : 0

  const hasCriticalBugs = squad.bugs.some(
    (b) => (b.status === 'Aberto' || b.status === 'Em Andamento') &&
           (b.severity === 'Crítica')
  )

  if (
    (daysToEnd <= 3 && mandatoryPct < 80) ||
    (hasCriticalBugs && daysToEnd <= 5)
  ) {
    return 'rejected'
  }

  // Em Andamento: default
  return 'testing'
}

// ─── computeReleaseMetrics ──────────────────────────────────────────────────

export function computeReleaseMetrics(release: Release): ReleaseMetrics {
  const squadStatuses: Record<ReleaseSquadStatus, number> = {
    not_started: 0,
    testing: 0,
    em_regressivo: 0,
    blocked: 0,
    approved: 0,
    rejected: 0,
  }

  let totalTests = 0
  let executedTests = 0
  let passedTests = 0
  let failedTests = 0
  let blockedTests = 0
  let openBugs = 0
  let resolvedBugs = 0
  let blockers = 0

  for (const squad of release.squads) {
    const t = computeTotals(squad)
    totalTests += t.totalTests
    executedTests += t.executedTests
    passedTests += t.passedTests
    failedTests += t.failedTests
    blockedTests += t.blockedTests
    openBugs += t.openBugs
    resolvedBugs += t.resolvedBugs
    blockers += t.blockers

    const status = computeSquadStatus(squad, release)
    squadStatuses[status]++
  }

  const coveragePct = totalTests > 0 ? Math.round((executedTests / totalTests) * 100) : 0
  const passPct = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0

  return {
    totalSquads: release.squads.length,
    totalTests,
    executedTests,
    passedTests,
    failedTests,
    blockedTests,
    openBugs,
    resolvedBugs,
    blockers,
    coveragePct,
    passPct,
    squadStatuses,
  }
}
