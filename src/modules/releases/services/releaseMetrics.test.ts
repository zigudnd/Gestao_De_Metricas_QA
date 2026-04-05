import type {
  Release, ReleaseSquad, Bug, Blocker, Feature, TestCase,
  ReleaseSquadStatus,
} from '../types/release.types'
import {
  computeSquadMetrics,
  computeSquadStatus,
  computeReleaseMetrics,
} from './releaseMetrics'

// ─── Factory Helpers ────────────────────────────────────────────────────────

function makeTestCase(overrides: Partial<TestCase> = {}): TestCase {
  return {
    id: 1,
    name: 'TC',
    complexity: 'Baixa',
    status: 'Pendente',
    executionDay: '',
    gherkin: '',
    ...overrides,
  }
}

function makeBug(overrides: Partial<Bug> = {}): Bug {
  return {
    id: '1',
    desc: 'bug',
    feature: 'feat',
    stack: 'Front',
    severity: 'Baixa',
    assignee: 'dev',
    status: 'Aberto',
    retests: 0,
    ...overrides,
  }
}

function makeBlocker(overrides: Partial<Blocker> = {}): Blocker {
  return { id: 1, date: '2026-01-01', reason: 'env down', hours: 2, ...overrides }
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 1,
    suiteId: 1,
    name: 'Feature',
    tests: 0,
    manualTests: 0,
    exec: 0,
    execution: {},
    manualExecData: {},
    gherkinExecs: {},
    mockupImage: '',
    status: 'Ativa',
    blockReason: '',
    activeFilter: 'Todos',
    cases: [],
    ...overrides,
  }
}

function makeSquad(overrides: Partial<ReleaseSquad> = {}): ReleaseSquad {
  return {
    id: '1',
    squadId: 's1',
    squadName: 'Squad A',
    status: 'testing',
    suites: [],
    features: [],
    bugs: [],
    blockers: [],
    notes: '',
    hasNewFeatures: false,
    ...overrides,
  }
}

function makeRelease(overrides: Partial<Release> = {}): Release {
  return {
    id: 'r1',
    version: '1.0.0',
    title: 'Release 1',
    description: '',
    status: 'em_homologacao',
    productionDate: '2026-12-31',
    cutoffDate: '2026-01-01',
    buildDate: '2026-01-05',
    homologacaoStart: '2026-01-10',
    homologacaoEnd: '2026-12-31',
    betaDate: '2026-12-25',
    squads: [],
    checkpoints: [],
    statusHistory: [],
    platforms: ['iOS'],
    nonBlockingFeatures: [],
    rolloutPct: 0,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── computeSquadMetrics ────────────────────────────────────────────────────

describe('computeSquadMetrics', () => {
  it('returns all zeros for a squad with no features', () => {
    const squad = makeSquad()
    const release = makeRelease()
    const m = computeSquadMetrics(squad, release)

    expect(m.totalTests).toBe(0)
    expect(m.executedTests).toBe(0)
    expect(m.passedTests).toBe(0)
    expect(m.failedTests).toBe(0)
    expect(m.blockedTests).toBe(0)
    expect(m.coveragePct).toBe(0)
    expect(m.passPct).toBe(0)
    expect(m.openBugs).toBe(0)
    expect(m.resolvedBugs).toBe(0)
    expect(m.blockers).toBe(0)
  })

  it('computes coveragePct and passPct correctly', () => {
    const squad = makeSquad({
      features: [
        makeFeature({
          tests: 10,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Falhou' }),
            makeTestCase({ status: 'Bloqueado' }),
            makeTestCase({ status: 'Pendente' }),
          ],
        }),
      ],
    })
    const m = computeSquadMetrics(squad, makeRelease())

    // totalTests = max(10, 5) = 10
    expect(m.totalTests).toBe(10)
    // executed = 2 passed + 1 failed = 3
    expect(m.executedTests).toBe(3)
    expect(m.passedTests).toBe(2)
    expect(m.failedTests).toBe(1)
    expect(m.blockedTests).toBe(1)
    // coveragePct = round(3/10 * 100) = 30
    expect(m.coveragePct).toBe(30)
    // passPct = round(2/10 * 100) = 20
    expect(m.passPct).toBe(20)
  })

  it('uses cases.length as totalTests when it exceeds feature.tests', () => {
    const squad = makeSquad({
      features: [
        makeFeature({
          tests: 2,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
    })
    const m = computeSquadMetrics(squad, makeRelease())

    // max(2, 5) = 5
    expect(m.totalTests).toBe(5)
    expect(m.executedTests).toBe(5)
    expect(m.coveragePct).toBe(100)
    expect(m.passPct).toBe(100)
  })

  it('counts bugs by status', () => {
    const squad = makeSquad({
      bugs: [
        makeBug({ status: 'Aberto' }),
        makeBug({ status: 'Em Andamento' }),
        makeBug({ status: 'Resolvido' }),
        makeBug({ status: 'Resolvido' }),
        makeBug({ status: 'Falhou' }),
      ],
    })
    const m = computeSquadMetrics(squad, makeRelease())

    expect(m.openBugs).toBe(2)
    expect(m.resolvedBugs).toBe(2)
  })

  it('counts blockers', () => {
    const squad = makeSquad({
      blockers: [makeBlocker(), makeBlocker({ id: 2 })],
    })
    const m = computeSquadMetrics(squad, makeRelease())
    expect(m.blockers).toBe(2)
  })

  it('aggregates across multiple features', () => {
    const squad = makeSquad({
      features: [
        makeFeature({
          tests: 3,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Falhou' }),
          ],
        }),
        makeFeature({
          tests: 2,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
    })
    const m = computeSquadMetrics(squad, makeRelease())

    expect(m.totalTests).toBe(5) // 3 + 2
    expect(m.executedTests).toBe(4) // 2 + 2
    expect(m.passedTests).toBe(3) // 1 + 2
    expect(m.failedTests).toBe(1)
  })
})

// ─── computeSquadStatus (state machine — 7 branches) ───────────────────────

describe('computeSquadStatus', () => {
  // Helper: future date far enough to avoid rejected branch
  const farFuture = '2099-12-31'
  // Helper: date very close (today + 1 day)
  function daysFromNow(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }

  it('returns "blocked" when squad.status is manually set to blocked', () => {
    const squad = makeSquad({ status: 'blocked' })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).toBe('blocked')
  })

  it('returns "blocked" when squad.status is blocked even if no blockers/bugs', () => {
    const squad = makeSquad({
      status: 'blocked',
      features: [
        makeFeature({
          tests: 5,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
    })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).toBe('blocked')
  })

  it('returns "blocked" when there are active blockers', () => {
    const squad = makeSquad({
      status: 'testing',
      blockers: [makeBlocker()],
      features: [
        makeFeature({
          tests: 1,
          cases: [makeTestCase({ status: 'Concluído' })],
        }),
      ],
    })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).toBe('blocked')
  })

  it('returns "approved" when 100% executed and no critical/high bugs', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 3,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
      bugs: [makeBug({ severity: 'Baixa', status: 'Aberto' })],
    })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).toBe('approved')
  })

  it('does NOT return "approved" when there are critical open bugs even at 100%', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 2,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
      bugs: [makeBug({ severity: 'Crítica', status: 'Aberto' })],
    })
    const release = makeRelease({ homologacaoEnd: farFuture })
    // Not approved; with far future should be 'testing'
    expect(computeSquadStatus(squad, release)).not.toBe('approved')
  })

  it('does NOT return "approved" when there are high open bugs even at 100%', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 2,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
      bugs: [makeBug({ severity: 'Alta', status: 'Em Andamento' })],
    })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).not.toBe('approved')
  })

  it('returns "not_started" when totalTests is 0', () => {
    const squad = makeSquad({ features: [] })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).toBe('not_started')
  })

  it('returns "not_started" when executedTests is 0', () => {
    const squad = makeSquad({
      features: [
        makeFeature({
          tests: 5,
          cases: [
            makeTestCase({ status: 'Pendente' }),
            makeTestCase({ status: 'Bloqueado' }),
          ],
        }),
      ],
    })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).toBe('not_started')
  })

  it('returns "rejected" when <=3 days to end and coverage < 80%', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: [
            makeTestCase({ status: 'Concluído' }), // 1 of 10 = 10%
          ],
        }),
      ],
    })
    const release = makeRelease({ homologacaoEnd: daysFromNow(2) })
    expect(computeSquadStatus(squad, release)).toBe('rejected')
  })

  it('returns "rejected" at exactly 3 days to end with coverage < 80%', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
    })
    const release = makeRelease({ homologacaoEnd: daysFromNow(3) })
    expect(computeSquadStatus(squad, release)).toBe('rejected')
  })

  it('returns "testing" at 4 days to end with coverage < 80% (no critical bugs)', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: [makeTestCase({ status: 'Concluído' })],
        }),
      ],
    })
    const release = makeRelease({ homologacaoEnd: daysFromNow(4) })
    expect(computeSquadStatus(squad, release)).toBe('testing')
  })

  it('returns "rejected" when critical bugs exist and <=5 days to end', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: Array.from({ length: 9 }, () => makeTestCase({ status: 'Concluído' })),
        }),
      ],
      bugs: [makeBug({ severity: 'Crítica', status: 'Aberto' })],
    })
    // 90% coverage, so the <=3 days branch won't fire, but critical bug + <=5 days will
    const release = makeRelease({ homologacaoEnd: daysFromNow(5) })
    expect(computeSquadStatus(squad, release)).toBe('rejected')
  })

  it('returns "testing" when critical bugs exist but >5 days to end', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: Array.from({ length: 9 }, () => makeTestCase({ status: 'Concluído' })),
        }),
      ],
      bugs: [makeBug({ severity: 'Crítica', status: 'Aberto' })],
    })
    const release = makeRelease({ homologacaoEnd: daysFromNow(6) })
    expect(computeSquadStatus(squad, release)).toBe('testing')
  })

  it('returns "testing" as the default fallback', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
    })
    const release = makeRelease({ homologacaoEnd: farFuture })
    expect(computeSquadStatus(squad, release)).toBe('testing')
  })

  it('does NOT return "rejected" when coverage is exactly 80% near deadline', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: Array.from({ length: 8 }, () => makeTestCase({ status: 'Concluído' })),
        }),
      ],
    })
    // Exactly 80% (8/10) and 2 days to end — should NOT be rejected because mandatoryPct is not < 80
    const release = makeRelease({ homologacaoEnd: daysFromNow(2) })
    expect(computeSquadStatus(squad, release)).toBe('testing')
  })

  it('ignores resolved critical bugs for the rejected branch', () => {
    const squad = makeSquad({
      status: 'testing',
      features: [
        makeFeature({
          tests: 10,
          cases: Array.from({ length: 9 }, () => makeTestCase({ status: 'Concluído' })),
        }),
      ],
      bugs: [makeBug({ severity: 'Crítica', status: 'Resolvido' })],
    })
    const release = makeRelease({ homologacaoEnd: daysFromNow(4) })
    expect(computeSquadStatus(squad, release)).toBe('testing')
  })
})

// ─── computeReleaseMetrics ──────────────────────────────────────────────────

describe('computeReleaseMetrics', () => {
  const farFuture = '2099-12-31'

  it('returns zeroed metrics for a release with no squads', () => {
    const release = makeRelease({ squads: [] })
    const m = computeReleaseMetrics(release)

    expect(m.totalSquads).toBe(0)
    expect(m.totalTests).toBe(0)
    expect(m.coveragePct).toBe(0)
    expect(m.passPct).toBe(0)
    expect(m.squadStatuses).toEqual({
      not_started: 0,
      testing: 0,
      em_regressivo: 0,
      blocked: 0,
      approved: 0,
      rejected: 0,
    })
  })

  it('aggregates metrics across multiple squads', () => {
    const squad1 = makeSquad({
      id: '1',
      features: [
        makeFeature({
          tests: 4,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Falhou' }),
            makeTestCase({ status: 'Pendente' }),
          ],
        }),
      ],
      bugs: [makeBug({ status: 'Aberto' })],
    })

    const squad2 = makeSquad({
      id: '2',
      features: [
        makeFeature({
          tests: 6,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Bloqueado' }),
          ],
        }),
      ],
      bugs: [makeBug({ status: 'Resolvido' })],
      blockers: [makeBlocker()],
    })

    const release = makeRelease({
      squads: [squad1, squad2],
      homologacaoEnd: farFuture,
    })
    const m = computeReleaseMetrics(release)

    expect(m.totalSquads).toBe(2)
    expect(m.totalTests).toBe(10) // 4 + 6
    expect(m.executedTests).toBe(6) // 3 + 3
    expect(m.passedTests).toBe(5) // 2 + 3
    expect(m.failedTests).toBe(1)
    expect(m.blockedTests).toBe(1)
    expect(m.openBugs).toBe(1)
    expect(m.resolvedBugs).toBe(1)
    expect(m.blockers).toBe(1)
    expect(m.coveragePct).toBe(60) // 6/10 * 100
    expect(m.passPct).toBe(50) // 5/10 * 100
  })

  it('correctly tallies squad statuses', () => {
    // Squad 1: no tests → not_started
    const squad1 = makeSquad({ id: '1', features: [] })

    // Squad 2: has blockers → blocked
    const squad2 = makeSquad({
      id: '2',
      features: [
        makeFeature({
          tests: 2,
          cases: [makeTestCase({ status: 'Concluído' })],
        }),
      ],
      blockers: [makeBlocker()],
    })

    // Squad 3: 100% executed, no critical bugs → approved
    const squad3 = makeSquad({
      id: '3',
      features: [
        makeFeature({
          tests: 2,
          cases: [
            makeTestCase({ status: 'Concluído' }),
            makeTestCase({ status: 'Concluído' }),
          ],
        }),
      ],
    })

    const release = makeRelease({
      squads: [squad1, squad2, squad3],
      homologacaoEnd: farFuture,
    })
    const m = computeReleaseMetrics(release)

    expect(m.squadStatuses.not_started).toBe(1)
    expect(m.squadStatuses.blocked).toBe(1)
    expect(m.squadStatuses.approved).toBe(1)
    expect(m.squadStatuses.testing).toBe(0)
    expect(m.totalSquads).toBe(3)
  })

  it('computes coveragePct and passPct as 0 when totalTests is 0', () => {
    const release = makeRelease({
      squads: [makeSquad(), makeSquad({ id: '2' })],
    })
    const m = computeReleaseMetrics(release)

    expect(m.totalTests).toBe(0)
    expect(m.coveragePct).toBe(0)
    expect(m.passPct).toBe(0)
  })
})
