import { describe, it, expect } from 'vitest'
import {
  normalizeState,
  countSprintDays,
  sprintDayToDate,
  dateToSprintDayKey,
  computeFields,
  DEFAULT_CONFIG,
  DEFAULT_NOTES,
} from './persistence'
import type { SprintState, Feature } from '../types/sprint.types'

// ─── Helper: minimal valid state ─────────────────────────────────────────────

function makeState(overrides: Partial<SprintState> = {}): SprintState {
  return {
    config: { ...DEFAULT_CONFIG },
    currentDate: '2025-01-06',
    reports: {},
    notes: { ...DEFAULT_NOTES },
    alignments: [],
    suites: [{ id: 1, name: 'Suite A' }],
    features: [],
    blockers: [],
    bugs: [],
    responsibles: [],
    ...overrides,
  }
}

function makeFeature(overrides: Partial<Feature> = {}): Feature {
  return {
    id: 1,
    suiteId: 1,
    name: 'Feat',
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

// ═════════════════════════════════════════════════════════════════════════════
// normalizeState
// ═════════════════════════════════════════════════════════════════════════════

describe('normalizeState', () => {
  it('returns default state when given null', () => {
    const result = normalizeState(null)
    expect(result.config).toBeDefined()
    expect(result.suites.length).toBeGreaterThanOrEqual(1)
    expect(Array.isArray(result.features)).toBe(true)
    expect(Array.isArray(result.blockers)).toBe(true)
    expect(Array.isArray(result.bugs)).toBe(true)
    expect(Array.isArray(result.responsibles)).toBe(true)
  })

  it('returns default state when given undefined', () => {
    const result = normalizeState(undefined)
    expect(result.config.sprintDays).toBe(20)
    expect(result.notes.premises).toBe('')
  })

  it('fills missing config fields with defaults', () => {
    const raw = { config: { sprintDays: 10, title: 'Test' } }
    const result = normalizeState(raw)
    expect(result.config.sprintDays).toBe(10)
    expect(result.config.squad).toBe('')
    expect(result.config.qaName).toBe('')
    expect(result.config.excludeWeekends).toBe(true)
    expect(result.config.hsCritical).toBe(15)
    expect(result.config.psLow).toBe(1)
  })

  it('migrates legacy data without suites — assigns suiteId to existing features', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      features: [
        { id: 1, name: 'F1', tests: 2, manualTests: 0, exec: 0, execution: {}, manualExecData: {}, gherkinExecs: {}, mockupImage: '', status: 'Ativa', blockReason: '', activeFilter: 'Todos', cases: [] },
      ],
      // no suites field
    }
    const result = normalizeState(raw)
    expect(result.suites.length).toBe(1)
    expect(result.suites[0].name).toBe('Suite Principal')
    // every feature should have the newly created suiteId
    result.features.forEach((f) => {
      expect(f.suiteId).toBe(result.suites[0].id)
    })
  })

  it('migrates legacy data with empty suites array', () => {
    const raw = { config: { ...DEFAULT_CONFIG }, suites: [], features: [] }
    const result = normalizeState(raw)
    expect(result.suites.length).toBe(1)
  })

  it('fills missing notes with defaults', () => {
    const raw = { config: { ...DEFAULT_CONFIG } }
    const result = normalizeState(raw)
    expect(result.notes.premises).toBe('')
    expect(result.notes.actionPlan).toBe('')
    expect(result.notes.operationalNotes).toBe('')
  })

  it('fills missing operationalNotes when notes exists but field is missing', () => {
    const raw = { config: { ...DEFAULT_CONFIG }, notes: { premises: 'x', actionPlan: 'y' } }
    const result = normalizeState(raw)
    expect(result.notes.operationalNotes).toBe('')
  })

  it('fills missing arrays with empty defaults', () => {
    const raw = { config: { ...DEFAULT_CONFIG } }
    const result = normalizeState(raw)
    expect(result.alignments).toEqual([])
    expect(result.blockers).toEqual([])
    expect(result.bugs).toEqual([])
    expect(result.responsibles).toEqual([])
  })

  it('fills missing bug fields', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      bugs: [{ id: 'b1', desc: 'bug', stack: 'Front', severity: 'Alta', status: 'Aberto' }],
    }
    const result = normalizeState(raw)
    expect(result.bugs[0].feature).toBe('')
    expect(result.bugs[0].assignee).toBe('')
    expect(result.bugs[0].retests).toBe(0)
  })

  it('fills missing feature fields with defaults', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      suites: [{ id: 1, name: 'S' }],
      features: [{ id: 1, suiteId: 1, name: 'F' }],
    }
    const result = normalizeState(raw)
    const f = result.features[0]
    expect(f.exec).toBe(0)
    expect(f.manualTests).toBe(0)
    expect(f.status).toBe('Ativa')
    expect(f.blockReason).toBe('')
    expect(f.activeFilter).toBe('Todos')
    expect(f.mockupImage).toBe('')
    expect(f.cases).toEqual([])
    expect(f.gherkinExecs).toEqual({})
  })

  it('resets "Concluída" status to "Ativa"', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      suites: [{ id: 1, name: 'S' }],
      features: [{ id: 1, suiteId: 1, name: 'F', status: 'Concluída' }],
    }
    const result = normalizeState(raw)
    expect(result.features[0].status).toBe('Ativa')
  })

  it('populates manualExecData from execution when missing', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      suites: [{ id: 1, name: 'S' }],
      features: [{ id: 1, suiteId: 1, name: 'F', execution: { D1: 3, D2: 2 } }],
    }
    const result = normalizeState(raw)
    expect(result.features[0].manualExecData).toEqual({ D1: 3, D2: 2 })
  })

  it('populates manualExecData from exec when no execution and no manualExecData', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      suites: [{ id: 1, name: 'S' }],
      features: [{ id: 1, suiteId: 1, name: 'F', exec: 5 }],
    }
    const result = normalizeState(raw)
    expect(result.features[0].manualExecData).toEqual({ D1: 5 })
  })

  it('does not mutate the input object', () => {
    const raw = { config: { ...DEFAULT_CONFIG, squad: 'Alpha' }, suites: [{ id: 1, name: 'S' }], features: [] }
    const originalSquad = raw.config.squad
    normalizeState(raw)
    expect(raw.config.squad).toBe(originalSquad)
  })

  it('fills missing case fields with defaults', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      suites: [{ id: 1, name: 'S' }],
      features: [{
        id: 1, suiteId: 1, name: 'F', manualExecData: {},
        cases: [{ id: 100, name: 'TC' }],
      }],
    }
    const result = normalizeState(raw)
    const c = result.features[0].cases[0]
    expect(c.complexity).toBe('Baixa')
    expect(c.status).toBe('Pendente')
    expect(c.executionDay).toBe('')
  })

  it('assigns firstSuiteId to features without suiteId', () => {
    const raw = {
      config: { ...DEFAULT_CONFIG },
      suites: [{ id: 42, name: 'S' }],
      features: [{ id: 1, name: 'F', manualExecData: {} }],
    }
    const result = normalizeState(raw)
    expect(result.features[0].suiteId).toBe(42)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// countSprintDays
// ═════════════════════════════════════════════════════════════════════════════

describe('countSprintDays', () => {
  it('counts a single day (start = end)', () => {
    expect(countSprintDays('2025-01-06', '2025-01-06', false)).toBe(1)
    // 2025-01-06 is Monday
    expect(countSprintDays('2025-01-06', '2025-01-06', true)).toBe(1)
  })

  it('returns 0 when end < start', () => {
    expect(countSprintDays('2025-01-10', '2025-01-06', true)).toBe(0)
    expect(countSprintDays('2025-01-10', '2025-01-06', false)).toBe(0)
  })

  it('counts all 7 days without excluding weekends', () => {
    // Mon 6 Jan to Sun 12 Jan = 7 days
    expect(countSprintDays('2025-01-06', '2025-01-12', false)).toBe(7)
  })

  it('counts only weekdays when excluding weekends', () => {
    // Mon 6 Jan to Sun 12 Jan = 5 weekdays (Mon-Fri)
    expect(countSprintDays('2025-01-06', '2025-01-12', true)).toBe(5)
  })

  it('counts multi-week span correctly', () => {
    // Mon 6 Jan to Fri 17 Jan = 10 weekdays
    expect(countSprintDays('2025-01-06', '2025-01-17', true)).toBe(10)
  })

  it('returns 0 for weekend-only range with excludeWeekends', () => {
    // Sat 11 Jan to Sun 12 Jan
    expect(countSprintDays('2025-01-11', '2025-01-12', true)).toBe(0)
  })

  it('counts weekend-only range as 2 without excludeWeekends', () => {
    expect(countSprintDays('2025-01-11', '2025-01-12', false)).toBe(2)
  })

  it('handles month boundary correctly', () => {
    // Fri 31 Jan to Mon 3 Feb = 2 weekdays (Fri + Mon)
    expect(countSprintDays('2025-01-31', '2025-02-03', true)).toBe(2)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// sprintDayToDate
// ═════════════════════════════════════════════════════════════════════════════

describe('sprintDayToDate', () => {
  it('D1 equals the start date', () => {
    const result = sprintDayToDate('2025-01-06', 1, true)
    expect(result.toISOString().slice(0, 10)).toBe('2025-01-06')
  })

  it('D1 equals start date without excludeWeekends', () => {
    const result = sprintDayToDate('2025-01-06', 1, false)
    expect(result.toISOString().slice(0, 10)).toBe('2025-01-06')
  })

  it('skips weekends when excludeWeekends=true', () => {
    // Mon 6 Jan → D5 = Fri 10 Jan, D6 = Mon 13 Jan (skips Sat/Sun)
    const d5 = sprintDayToDate('2025-01-06', 5, true)
    expect(d5.toISOString().slice(0, 10)).toBe('2025-01-10')
    const d6 = sprintDayToDate('2025-01-06', 6, true)
    expect(d6.toISOString().slice(0, 10)).toBe('2025-01-13')
  })

  it('does not skip weekends when excludeWeekends=false', () => {
    // Mon 6 Jan + 5 days = Sat 11 Jan
    const d6 = sprintDayToDate('2025-01-06', 6, false)
    expect(d6.toISOString().slice(0, 10)).toBe('2025-01-11')
  })

  it('handles D10 across two weeks', () => {
    // Mon 6 Jan → D10 = Fri 17 Jan
    const d10 = sprintDayToDate('2025-01-06', 10, true)
    expect(d10.toISOString().slice(0, 10)).toBe('2025-01-17')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// dateToSprintDayKey
// ═════════════════════════════════════════════════════════════════════════════

describe('dateToSprintDayKey', () => {
  // Sprint: Mon 6 Jan, 10 working days
  const start = '2025-01-06'
  const days = 10

  it('returns D1 for the start date', () => {
    expect(dateToSprintDayKey('2025-01-06', start, days, true)).toBe('D1')
  })

  it('returns null for a date before the start', () => {
    expect(dateToSprintDayKey('2025-01-03', start, days, true)).toBeNull()
  })

  it('returns null for a weekend date when excludeWeekends', () => {
    // Sat 11 Jan
    expect(dateToSprintDayKey('2025-01-11', start, days, true)).toBeNull()
    // Sun 12 Jan
    expect(dateToSprintDayKey('2025-01-12', start, days, true)).toBeNull()
  })

  it('returns correct day key for weekdays', () => {
    expect(dateToSprintDayKey('2025-01-07', start, days, true)).toBe('D2')  // Tue
    expect(dateToSprintDayKey('2025-01-10', start, days, true)).toBe('D5')  // Fri
    expect(dateToSprintDayKey('2025-01-13', start, days, true)).toBe('D6')  // Mon next week
    expect(dateToSprintDayKey('2025-01-17', start, days, true)).toBe('D10') // Fri
  })

  it('returns null for a date beyond the sprint range', () => {
    // D11 would be Mon 20 Jan, beyond 10-day sprint
    expect(dateToSprintDayKey('2025-01-20', start, days, true)).toBeNull()
  })

  it('works without excludeWeekends', () => {
    expect(dateToSprintDayKey('2025-01-06', start, days, false)).toBe('D1')
    expect(dateToSprintDayKey('2025-01-11', start, days, false)).toBe('D6') // Sat is included
    expect(dateToSprintDayKey('2025-01-15', start, days, false)).toBe('D10')
    expect(dateToSprintDayKey('2025-01-16', start, days, false)).toBeNull() // D11 out of range
  })

  it('is the inverse of sprintDayToDate', () => {
    for (let n = 1; n <= 10; n++) {
      const date = sprintDayToDate(start, n, true)
      const dateStr = date.toISOString().slice(0, 10)
      expect(dateToSprintDayKey(dateStr, start, days, true)).toBe(`D${n}`)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// computeFields
// ═════════════════════════════════════════════════════════════════════════════

describe('computeFields', () => {
  it('computes sprintDays from start/end dates', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, startDate: '2025-01-06', endDate: '2025-01-17', excludeWeekends: true },
    })
    const result = computeFields(state)
    expect(result.config.sprintDays).toBe(10)
  })

  it('falls back to config.sprintDays when dates are empty', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 15, startDate: '', endDate: '' },
    })
    const result = computeFields(state)
    expect(result.config.sprintDays).toBe(15)
  })

  it('counts tests = cases.length + manualTests', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 5, startDate: '', endDate: '' },
      features: [
        makeFeature({
          manualTests: 3,
          cases: [
            { id: 1, name: 'TC1', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: '' },
            { id: 2, name: 'TC2', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: '' },
          ],
        }),
      ],
    })
    const result = computeFields(state)
    expect(result.features[0].tests).toBe(5) // 2 cases + 3 manual
  })

  it('aggregates gherkinExecs from completed/failed cases', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 5, startDate: '', endDate: '' },
      features: [
        makeFeature({
          cases: [
            { id: 1, name: 'TC1', complexity: 'Baixa', status: 'Concluído', executionDay: 'D1', gherkin: '' },
            { id: 2, name: 'TC2', complexity: 'Baixa', status: 'Falhou', executionDay: 'D1', gherkin: '' },
            { id: 3, name: 'TC3', complexity: 'Baixa', status: 'Pendente', executionDay: 'D2', gherkin: '' },
          ],
        }),
      ],
    })
    const result = computeFields(state)
    expect(result.features[0].gherkinExecs).toEqual({ D1: 2 })
  })

  it('sums manual + gherkin execution into execution map', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 5, startDate: '', endDate: '' },
      features: [
        makeFeature({
          manualExecData: { D1: 2, D3: 1 },
          cases: [
            { id: 1, name: 'TC1', complexity: 'Baixa', status: 'Concluído', executionDay: 'D1', gherkin: '' },
          ],
        }),
      ],
    })
    const result = computeFields(state)
    // D1: 2 manual + 1 gherkin = 3
    expect(result.features[0].execution.D1).toBe(3)
    // D3: 1 manual + 0 gherkin = 1
    expect(result.features[0].execution.D3).toBe(1)
  })

  it('caps exec at total tests', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 5, startDate: '', endDate: '' },
      features: [
        makeFeature({
          manualTests: 0,
          manualExecData: { D1: 100 },
          cases: [
            { id: 1, name: 'TC1', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: '' },
          ],
        }),
      ],
    })
    const result = computeFields(state)
    // tests = 1 case + 0 manual = 1, exec should be capped at 1
    expect(result.features[0].exec).toBe(1)
  })

  it('handles empty suites/features', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 10, startDate: '', endDate: '' },
      features: [],
    })
    const result = computeFields(state)
    expect(result.features).toEqual([])
    expect(result.config.sprintDays).toBe(10)
  })

  it('treats non-numeric manualTests as 0', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 5, startDate: '', endDate: '' },
      features: [
        makeFeature({ manualTests: 'abc' as unknown as number }),
      ],
    })
    const result = computeFields(state)
    expect(result.features[0].manualTests).toBe(0)
    expect(result.features[0].tests).toBe(0) // 0 cases + 0 manual
  })

  it('does not mutate the input state', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 5, startDate: '', endDate: '' },
      features: [makeFeature({ manualExecData: { D1: 2 } })],
    })
    const originalExec = state.features[0].exec
    computeFields(state)
    expect(state.features[0].exec).toBe(originalExec)
  })

  it('only counts execution within sprintDays range', () => {
    const state = makeState({
      config: { ...DEFAULT_CONFIG, sprintDays: 2, startDate: '', endDate: '' },
      features: [
        makeFeature({
          manualTests: 10,
          manualExecData: { D1: 1, D2: 2, D5: 99 },
        }),
      ],
    })
    const result = computeFields(state)
    // D5 is beyond sprintDays=2, should not be counted
    expect(result.features[0].exec).toBe(3) // D1:1 + D2:2
    expect(result.features[0].execution.D5).toBeUndefined()
  })
})
