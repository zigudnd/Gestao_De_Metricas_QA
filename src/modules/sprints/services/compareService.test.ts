import { describe, it, expect } from 'vitest'
import { computeSprintKPIs } from './compareService'
import type { SprintState, Feature, Bug, Blocker, SprintConfig } from '../types/sprint.types'

// ─── Factory Helpers ─────────────────────────────────────────────────────────

function makeConfig(overrides: Partial<SprintConfig> = {}): SprintConfig {
  return {
    sprintDays: 20,
    title: 'Test Sprint',
    startDate: '',
    endDate: '',
    targetVersion: '',
    squad: '',
    qaName: '',
    excludeWeekends: true,
    hsCritical: 15,
    hsHigh: 10,
    hsMedium: 5,
    hsLow: 2,
    hsRetest: 2,
    hsBlocked: 10,
    hsDelayed: 2,
    psCritical: 10,
    psHigh: 5,
    psMedium: 3,
    psLow: 1,
    ...overrides,
  }
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 1,
    suiteId: 1,
    name: 'Feature',
    tests: 10,
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

function makeBug(overrides: Partial<Bug> = {}): Bug {
  return {
    id: 'bug-1',
    desc: 'Bug description',
    feature: '',
    stack: 'Front',
    severity: 'Média',
    assignee: '',
    status: 'Aberto',
    retests: 0,
    ...overrides,
  }
}

function makeBlocker(overrides: Partial<Blocker> = {}): Blocker {
  return {
    id: 1,
    date: '2025-01-10',
    reason: 'Environment down',
    hours: 4,
    ...overrides,
  }
}

function makeState(overrides: Partial<SprintState> = {}): SprintState {
  return {
    config: makeConfig(),
    currentDate: '2025-01-15',
    reports: {},
    notes: { premises: '', actionPlan: '', operationalNotes: '' },
    alignments: [],
    suites: [{ id: 1, name: 'Suite 1' }],
    features: [],
    blockers: [],
    bugs: [],
    responsibles: [],
    ...overrides,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('computeSprintKPIs', () => {
  // ── Empty sprint ──────────────────────────────────────────────────────────

  describe('empty sprint (no features, no bugs)', () => {
    it('returns safe defaults for all 13 KPIs', () => {
      const kpis = computeSprintKPIs(makeState())

      expect(kpis.totalTests).toBe(0)
      expect(kpis.totalExec).toBe(0)
      expect(kpis.testesExecutaveis).toBe(0)
      expect(kpis.testesComprometidos).toBe(0)
      expect(kpis.capacidadeReal).toBe(0)
      expect(kpis.execPercent).toBe(0)
      expect(kpis.openBugs).toBe(0)
      expect(kpis.resolvedBugs).toBe(0)
      expect(kpis.mttrGlobal).toBe(0)
      expect(kpis.retestIndex).toBe(0)
      expect(kpis.totalBlockedHours).toBe(0)
      expect(kpis.atrasoCasos).toBe(0)
      expect(kpis.healthScore).toBe(100)
    })
  })

  // ── totalTests & totalExec ────────────────────────────────────────────────

  describe('totalTests and totalExec', () => {
    it('sums tests and exec across active features', () => {
      const state = makeState({
        features: [
          makeFeature({ tests: 10, exec: 5 }),
          makeFeature({ id: 2, tests: 20, exec: 15 }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.totalTests).toBe(30)
      expect(kpis.totalExec).toBe(20)
    })

    it('excludes cancelled features from totals', () => {
      const state = makeState({
        features: [
          makeFeature({ tests: 10, exec: 5 }),
          makeFeature({ id: 2, tests: 20, exec: 15, status: 'Cancelada' }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.totalTests).toBe(10)
      expect(kpis.totalExec).toBe(5)
    })
  })

  // ── testesComprometidos & testesExecutaveis & capacidadeReal ──────────────

  describe('testesComprometidos, testesExecutaveis, capacidadeReal', () => {
    it('counts all tests of a blocked feature as comprometidos', () => {
      const state = makeState({
        features: [
          makeFeature({ tests: 10, exec: 0, status: 'Bloqueada' }),
          makeFeature({ id: 2, tests: 20, exec: 10 }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.testesComprometidos).toBe(10)
      expect(kpis.testesExecutaveis).toBe(20)
      expect(kpis.capacidadeReal).toBe(67) // round(20/30 * 100)
    })

    it('counts individual blocked test cases within an active feature', () => {
      const state = makeState({
        features: [
          makeFeature({
            tests: 10,
            exec: 0,
            cases: [
              { id: 1, name: 'TC1', complexity: 'Baixa', status: 'Bloqueado', executionDay: '', gherkin: '' },
              { id: 2, name: 'TC2', complexity: 'Baixa', status: 'Bloqueado', executionDay: '', gherkin: '' },
              { id: 3, name: 'TC3', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: '' },
            ],
          }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.testesComprometidos).toBe(2)
      expect(kpis.testesExecutaveis).toBe(8)
    })

    it('returns capacidadeReal 0 when totalTests is 0', () => {
      const kpis = computeSprintKPIs(makeState())
      expect(kpis.capacidadeReal).toBe(0)
    })

    it('testesExecutaveis never goes below 0', () => {
      // Blocked feature with 10 tests, but also individual blocked cases counted
      // The Math.max(0, ...) protects against negative
      const state = makeState({
        features: [
          makeFeature({
            tests: 5,
            exec: 0,
            status: 'Bloqueada',
            cases: [
              { id: 1, name: 'TC1', complexity: 'Baixa', status: 'Bloqueado', executionDay: '', gherkin: '' },
            ],
          }),
        ],
      })
      const kpis = computeSprintKPIs(state)
      expect(kpis.testesExecutaveis).toBe(0)
    })
  })

  // ── execPercent ───────────────────────────────────────────────────────────

  describe('execPercent', () => {
    it('calculates execution percentage against testesExecutaveis', () => {
      const state = makeState({
        features: [makeFeature({ tests: 20, exec: 10 })],
      })
      const kpis = computeSprintKPIs(state)

      // testesExecutaveis = 20, exec = 10 → 50%
      expect(kpis.execPercent).toBe(50)
    })

    it('returns 0 when testesExecutaveis is 0 (division by zero protection)', () => {
      const state = makeState({
        features: [makeFeature({ tests: 10, exec: 5, status: 'Bloqueada' })],
      })
      const kpis = computeSprintKPIs(state)

      // All 10 tests are comprometidos → testesExecutaveis = 0
      expect(kpis.execPercent).toBe(0)
    })

    it('caps execPercent at 100', () => {
      const state = makeState({
        features: [makeFeature({ tests: 10, exec: 15 })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.execPercent).toBe(100)
    })
  })

  // ── All tests passed ─────────────────────────────────────────────────────

  describe('sprint with all tests passed', () => {
    it('has 100% execution and high health score', () => {
      const state = makeState({
        features: [makeFeature({ tests: 50, exec: 50 })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.execPercent).toBe(100)
      expect(kpis.totalExec).toBe(50)
      expect(kpis.healthScore).toBeLessThanOrEqual(100)
      expect(kpis.healthScore).toBeGreaterThanOrEqual(0)
    })
  })

  // ── All tests failed ──────────────────────────────────────────────────────

  describe('sprint with all tests failed (0 exec)', () => {
    it('has 0% execution', () => {
      const state = makeState({
        features: [makeFeature({ tests: 50, exec: 0 })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.execPercent).toBe(0)
      expect(kpis.totalExec).toBe(0)
    })
  })

  // ── openBugs & resolvedBugs ───────────────────────────────────────────────

  describe('openBugs and resolvedBugs', () => {
    it('correctly counts open and resolved bugs', () => {
      const state = makeState({
        bugs: [
          makeBug({ id: 'b1', status: 'Aberto' }),
          makeBug({ id: 'b2', status: 'Em Andamento' }),
          makeBug({ id: 'b3', status: 'Falhou' }),
          makeBug({ id: 'b4', status: 'Resolvido' }),
          makeBug({ id: 'b5', status: 'Resolvido' }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.openBugs).toBe(3)
      expect(kpis.resolvedBugs).toBe(2)
    })

    it('returns 0 open bugs when all are resolved', () => {
      const state = makeState({
        bugs: [
          makeBug({ id: 'b1', status: 'Resolvido' }),
          makeBug({ id: 'b2', status: 'Resolvido' }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.openBugs).toBe(0)
      expect(kpis.resolvedBugs).toBe(2)
    })
  })

  // ── mttrGlobal ────────────────────────────────────────────────────────────

  describe('mttrGlobal (mean time to resolve)', () => {
    it('calculates average resolution time in hours for resolved bugs', () => {
      const state = makeState({
        bugs: [
          makeBug({
            id: 'b1',
            status: 'Resolvido',
            openedAt: '2025-01-10T08:00:00Z',
            resolvedAt: '2025-01-10T14:00:00Z', // 6 hours
          }),
          makeBug({
            id: 'b2',
            status: 'Resolvido',
            openedAt: '2025-01-11T10:00:00Z',
            resolvedAt: '2025-01-11T20:00:00Z', // 10 hours
          }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      // average = (6 + 10) / 2 = 8 hours
      expect(kpis.mttrGlobal).toBe(8)
    })

    it('returns 0 when there are no resolved bugs', () => {
      const state = makeState({
        bugs: [makeBug({ status: 'Aberto' })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.mttrGlobal).toBe(0)
    })

    it('handles resolved bugs missing openedAt/resolvedAt gracefully', () => {
      const state = makeState({
        bugs: [
          makeBug({ id: 'b1', status: 'Resolvido' }), // no dates
          makeBug({
            id: 'b2',
            status: 'Resolvido',
            openedAt: '2025-01-10T08:00:00Z',
            resolvedAt: '2025-01-10T20:00:00Z', // 12 hours
          }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      // totalMs = 0 (skipped) + 12h in ms; divided by 2 resolved bugs
      // 12h / 2 = 6h
      expect(kpis.mttrGlobal).toBe(6)
    })

    it('returns 0 when all resolved bugs lack dates', () => {
      const state = makeState({
        bugs: [
          makeBug({ id: 'b1', status: 'Resolvido' }),
          makeBug({ id: 'b2', status: 'Resolvido' }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      // totalMs = 0, divided by 2 → 0
      expect(kpis.mttrGlobal).toBe(0)
    })
  })

  // ── retestIndex ───────────────────────────────────────────────────────────

  describe('retestIndex', () => {
    it('calculates retest proportion: retests / (totalBugs + totalRetests) * 100', () => {
      const state = makeState({
        bugs: [
          makeBug({ id: 'b1', retests: 3 }),
          makeBug({ id: 'b2', retests: 1 }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      // totalRetests = 4, totalBugs = 2, index = round(4 / (2+4) * 100) = round(66.66) = 67
      expect(kpis.retestIndex).toBe(67)
    })

    it('returns 0 when there are no bugs', () => {
      const kpis = computeSprintKPIs(makeState())
      expect(kpis.retestIndex).toBe(0)
    })

    it('returns 0 when bugs have no retests', () => {
      const state = makeState({
        bugs: [
          makeBug({ id: 'b1', retests: 0 }),
          makeBug({ id: 'b2', retests: 0 }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      // totalRetests = 0, totalBugs = 2, index = round(0 / (2+0) * 100) = 0
      expect(kpis.retestIndex).toBe(0)
    })
  })

  // ── totalBlockedHours ─────────────────────────────────────────────────────

  describe('totalBlockedHours', () => {
    it('sums hours from all blockers', () => {
      const state = makeState({
        blockers: [
          makeBlocker({ hours: 4 }),
          makeBlocker({ id: 2, hours: 8 }),
          makeBlocker({ id: 3, hours: 2.5 }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.totalBlockedHours).toBe(14.5)
    })

    it('returns 0 when there are no blockers', () => {
      const kpis = computeSprintKPIs(makeState())
      expect(kpis.totalBlockedHours).toBe(0)
    })
  })

  // ── healthScore ───────────────────────────────────────────────────────────

  describe('healthScore', () => {
    it('returns 100 for a clean sprint with no issues', () => {
      const state = makeState({
        features: [makeFeature({ tests: 10, exec: 10 })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.healthScore).toBe(100)
    })

    it('subtracts hsCritical for each open critical bug', () => {
      const state = makeState({
        bugs: [makeBug({ severity: 'Crítica', status: 'Aberto' })],
      })
      const kpis = computeSprintKPIs(state)

      // 100 - 15 = 85
      expect(kpis.healthScore).toBe(85)
    })

    it('subtracts hsHigh for each open high severity bug', () => {
      const state = makeState({
        bugs: [makeBug({ severity: 'Alta', status: 'Aberto' })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.healthScore).toBe(90)
    })

    it('subtracts hsMedium for each open medium severity bug', () => {
      const state = makeState({
        bugs: [makeBug({ severity: 'Média', status: 'Aberto' })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.healthScore).toBe(95)
    })

    it('subtracts hsLow for each open low severity bug', () => {
      const state = makeState({
        bugs: [makeBug({ severity: 'Baixa', status: 'Aberto' })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.healthScore).toBe(98)
    })

    it('does NOT subtract severity penalty for resolved bugs', () => {
      const state = makeState({
        bugs: [makeBug({ severity: 'Crítica', status: 'Resolvido' })],
      })
      const kpis = computeSprintKPIs(state)

      // Only retest penalty could apply (retests=0), so 100
      expect(kpis.healthScore).toBe(100)
    })

    it('subtracts hsRetest per retest count on every bug (even resolved)', () => {
      const state = makeState({
        bugs: [
          makeBug({ id: 'b1', severity: 'Baixa', status: 'Resolvido', retests: 3 }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      // 100 - (3 * 2) = 94 (no severity penalty for resolved)
      expect(kpis.healthScore).toBe(94)
    })

    it('subtracts hsBlocked per blocked feature', () => {
      const state = makeState({
        features: [
          makeFeature({ tests: 10, status: 'Bloqueada' }),
          makeFeature({ id: 2, tests: 10, status: 'Bloqueada' }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      // 100 - (2 * 10) = 80
      expect(kpis.healthScore).toBe(80)
    })

    it('is clamped to 0 minimum even with many penalties', () => {
      const state = makeState({
        bugs: Array.from({ length: 20 }, (_, i) =>
          makeBug({ id: `b${i}`, severity: 'Crítica', status: 'Aberto' }),
        ),
      })
      const kpis = computeSprintKPIs(state)

      // 100 - (20 * 15) = -200, clamped to 0
      expect(kpis.healthScore).toBe(0)
    })

    it('is clamped to 100 maximum', () => {
      const kpis = computeSprintKPIs(makeState())
      expect(kpis.healthScore).toBeLessThanOrEqual(100)
    })

    it('boundary: healthScore is exactly 0 on boundary', () => {
      // 100 - (10 * 10) hsBlocked → exactly 0
      const state = makeState({
        features: Array.from({ length: 10 }, (_, i) =>
          makeFeature({ id: i + 1, tests: 5, status: 'Bloqueada' }),
        ),
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.healthScore).toBe(0)
    })
  })

  // ── atrasoCasos ───────────────────────────────────────────────────────────

  describe('atrasoCasos', () => {
    it('returns 0 when no startDate/endDate is configured', () => {
      const state = makeState({
        features: [makeFeature({ tests: 20, exec: 0 })],
      })
      const kpis = computeSprintKPIs(state)

      // currentDay = 0 → exactMeta * 0 - 0 = 0
      expect(kpis.atrasoCasos).toBe(0)
    })

    it('calculates delay based on expected progress vs actual', () => {
      // Sprint: 2025-01-06 to 2025-01-31 (20 working days, excludeWeekends=true)
      // currentDate: 2025-01-15 → day 8 of sprint
      // 20 executable tests / 20 days = 1 test/day expected
      // Expected by day 8: 8, Actual: 2 → delay = 6
      const state = makeState({
        config: makeConfig({
          startDate: '2025-01-06',
          endDate: '2025-01-31',
          sprintDays: 20,
          excludeWeekends: true,
        }),
        currentDate: '2025-01-15',
        features: [makeFeature({ tests: 20, exec: 2 })],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.atrasoCasos).toBe(6)
    })

    it('returns 0 when execution is ahead of schedule', () => {
      const state = makeState({
        config: makeConfig({
          startDate: '2025-01-06',
          endDate: '2025-01-31',
          sprintDays: 20,
          excludeWeekends: true,
        }),
        currentDate: '2025-01-07', // day 2
        features: [makeFeature({ tests: 20, exec: 10 })], // way ahead
      })
      const kpis = computeSprintKPIs(state)

      // Math.max(0, ...) → 0
      expect(kpis.atrasoCasos).toBe(0)
    })

    it('uses endDate as cap when currentDate > endDate', () => {
      const state = makeState({
        config: makeConfig({
          startDate: '2025-01-06',
          endDate: '2025-01-10', // only 5 working days (Mon-Fri)
          sprintDays: 20,
          excludeWeekends: true,
        }),
        currentDate: '2025-02-15', // way past endDate
        features: [makeFeature({ tests: 20, exec: 0 })],
      })
      const kpis = computeSprintKPIs(state)

      // currentDay capped at min(countSprintDays(06→10), 20) = 5
      // exactMeta = 20/20 = 1, atraso = max(0, round(1*5 - 0)) = 5
      expect(kpis.atrasoCasos).toBe(5)
    })

    it('atrasoCasos penalty reduces healthScore via hsDelayed', () => {
      const state = makeState({
        config: makeConfig({
          startDate: '2025-01-06',
          endDate: '2025-01-31',
          sprintDays: 20,
          excludeWeekends: true,
          hsDelayed: 2,
        }),
        currentDate: '2025-01-15',
        features: [makeFeature({ tests: 20, exec: 2 })],
      })
      const kpis = computeSprintKPIs(state)

      // atrasoCasos = 6, healthScore = 100 - (6*2) = 88
      expect(kpis.atrasoCasos).toBe(6)
      expect(kpis.healthScore).toBe(88)
    })
  })

  // ── Division by zero: 0 total tests ───────────────────────────────────────

  describe('division by zero protection', () => {
    it('handles 0 totalTests safely (no NaN or Infinity)', () => {
      const state = makeState({ features: [] })
      const kpis = computeSprintKPIs(state)

      expect(Number.isFinite(kpis.execPercent)).toBe(true)
      expect(Number.isFinite(kpis.capacidadeReal)).toBe(true)
      expect(Number.isFinite(kpis.healthScore)).toBe(true)
      expect(Number.isFinite(kpis.retestIndex)).toBe(true)
      expect(Number.isFinite(kpis.mttrGlobal)).toBe(true)
      expect(Number.isFinite(kpis.atrasoCasos)).toBe(true)
    })

    it('handles features with 0 tests each', () => {
      const state = makeState({
        features: [
          makeFeature({ tests: 0, exec: 0 }),
          makeFeature({ id: 2, tests: 0, exec: 0 }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.totalTests).toBe(0)
      expect(kpis.execPercent).toBe(0)
      expect(kpis.capacidadeReal).toBe(0)
    })
  })

  // ── Combined scenario ─────────────────────────────────────────────────────

  describe('combined scenario: bugs + blockers + blocked features', () => {
    it('computes all KPIs correctly together', () => {
      const state = makeState({
        config: makeConfig({
          startDate: '2025-01-06',
          endDate: '2025-01-31',
          sprintDays: 20,
          excludeWeekends: true,
        }),
        currentDate: '2025-01-10', // day 5
        features: [
          makeFeature({ tests: 30, exec: 10 }),
          makeFeature({ id: 2, tests: 20, exec: 5, status: 'Bloqueada' }),
        ],
        blockers: [
          makeBlocker({ hours: 4 }),
          makeBlocker({ id: 2, hours: 6 }),
        ],
        bugs: [
          makeBug({ id: 'b1', severity: 'Crítica', status: 'Aberto', retests: 1 }),
          makeBug({
            id: 'b2',
            severity: 'Alta',
            status: 'Resolvido',
            retests: 2,
            openedAt: '2025-01-07T08:00:00Z',
            resolvedAt: '2025-01-08T08:00:00Z', // 24h
          }),
        ],
      })
      const kpis = computeSprintKPIs(state)

      expect(kpis.totalTests).toBe(50)
      expect(kpis.totalExec).toBe(15)
      // Feature 2 is Bloqueada → 20 tests comprometidos
      expect(kpis.testesComprometidos).toBe(20)
      expect(kpis.testesExecutaveis).toBe(30)
      expect(kpis.capacidadeReal).toBe(60) // round(30/50 * 100)
      expect(kpis.execPercent).toBe(50)    // round(15/30 * 100)
      expect(kpis.openBugs).toBe(1)
      expect(kpis.resolvedBugs).toBe(1)
      // resolvedBugsList = [b2]. totalMs = 24h. mttrGlobal = round(24h_ms / 1 / 3600000) = 24
      expect(kpis.mttrGlobal).toBe(24)
      expect(kpis.totalBlockedHours).toBe(10)
      // retestIndex: totalRetests=3, totalBugs=2 → round(3/(2+3)*100) = 60
      expect(kpis.retestIndex).toBe(60)
    })
  })
})
