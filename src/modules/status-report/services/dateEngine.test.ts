import { addDays, diffDays, computeAllDates } from './dateEngine'
import type { StatusReportItem } from '../types/statusReport.types'

// ─── Helper to build a minimal StatusReportItem ────────────────────────────
function makeItem(overrides: Partial<StatusReportItem> & { id: string }): StatusReportItem {
  return {
    title: overrides.id,
    section: 'sprint',
    priority: 'medium',
    stacks: [],
    resp: '',
    pct: 0,
    startDate: '',
    durationDays: 0,
    deadlineDate: '',
    dependsOn: [],
    jira: '',
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// addDays
// ═══════════════════════════════════════════════════════════════════════════════
describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2025-01-01', 5)).toBe('2025-01-06')
  })

  it('adds negative days', () => {
    expect(addDays('2025-01-10', -3)).toBe('2025-01-07')
  })

  it('adds zero days', () => {
    expect(addDays('2025-06-15', 0)).toBe('2025-06-15')
  })

  it('crosses month boundary', () => {
    expect(addDays('2025-01-30', 3)).toBe('2025-02-02')
  })

  it('crosses year boundary', () => {
    expect(addDays('2025-12-30', 5)).toBe('2026-01-04')
  })

  it('handles leap year', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2024-02-28', 2)).toBe('2024-03-01')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// diffDays
// ═══════════════════════════════════════════════════════════════════════════════
describe('diffDays', () => {
  it('returns 0 for the same date', () => {
    expect(diffDays('2025-03-15', '2025-03-15')).toBe(0)
  })

  it('returns positive when b > a', () => {
    expect(diffDays('2025-01-01', '2025-01-11')).toBe(10)
  })

  it('returns negative when b < a', () => {
    expect(diffDays('2025-01-11', '2025-01-01')).toBe(-10)
  })

  it('handles cross-month gap', () => {
    expect(diffDays('2025-01-28', '2025-02-04')).toBe(7)
  })

  it('handles cross-year gap', () => {
    expect(diffDays('2024-12-31', '2025-01-01')).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// computeAllDates
// ═══════════════════════════════════════════════════════════════════════════════
describe('computeAllDates', () => {
  // ── Empty ──────────────────────────────────────────────────────────────────
  it('returns empty map for empty items array', () => {
    expect(computeAllDates([])).toEqual({})
  })

  // ── Standalone items (no dependencies) ─────────────────────────────────────
  it('computes dates for a standalone item with startDate and duration', () => {
    const items = [makeItem({ id: 'A', startDate: '2025-03-01', durationDays: 5 })]
    const result = computeAllDates(items)

    expect(result.A).toEqual({
      start: '2025-03-01',
      end: '2025-03-05', // startDate + 4 days (duration - 1)
      isCycle: false,
      isLate: expect.any(Boolean),
    })
  })

  it('uses minimum duration of 1 when durationDays is 0', () => {
    const items = [makeItem({ id: 'A', startDate: '2025-06-01', durationDays: 0 })]
    const result = computeAllDates(items)

    // safeDuration = max(1, 0 || 1) = 1 → end = start + 0 = start
    expect(result.A.start).toBe('2025-06-01')
    expect(result.A.end).toBe('2025-06-01')
  })

  it('handles item with startDate but no duration (defaults to 1)', () => {
    const items = [makeItem({ id: 'A', startDate: '2025-04-10' })]
    const result = computeAllDates(items)

    expect(result.A.start).toBe('2025-04-10')
    expect(result.A.end).toBe('2025-04-10') // duration defaults to 1 → end = start
  })

  it('handles item with no startDate and no dependencies (empty dates)', () => {
    const items = [makeItem({ id: 'A', durationDays: 5 })]
    const result = computeAllDates(items)

    expect(result.A.start).toBe('')
    expect(result.A.end).toBe('')
  })

  // ── Deadline ───────────────────────────────────────────────────────────────
  it('uses deadlineDate as end when provided and >= start', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-03-01', durationDays: 5, deadlineDate: '2025-03-20' }),
    ]
    const result = computeAllDates(items)

    expect(result.A.start).toBe('2025-03-01')
    expect(result.A.end).toBe('2025-03-20')
  })

  it('ignores deadline that is before start and uses duration instead', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-03-10', durationDays: 3, deadlineDate: '2025-03-05' }),
    ]
    const result = computeAllDates(items)

    expect(result.A.start).toBe('2025-03-10')
    expect(result.A.end).toBe('2025-03-12') // start + 2
  })

  // ── Linear chain (A → B → C) ──────────────────────────────────────────────
  it('resolves a linear dependency chain', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-01-01', durationDays: 3 }),
      makeItem({ id: 'B', durationDays: 2, dependsOn: ['A'] }),
      makeItem({ id: 'C', durationDays: 4, dependsOn: ['B'] }),
    ]
    const result = computeAllDates(items)

    // A: start=01-01, end=01-03
    expect(result.A).toMatchObject({ start: '2025-01-01', end: '2025-01-03' })
    // B: start = A.end + 1 = 01-04, end = 01-04 + 1 = 01-05
    expect(result.B).toMatchObject({ start: '2025-01-04', end: '2025-01-05' })
    // C: start = B.end + 1 = 01-06, end = 01-06 + 3 = 01-09
    expect(result.C).toMatchObject({ start: '2025-01-06', end: '2025-01-09' })
  })

  // ── Diamond dependency (A → B, A → C, B+C → D) ────────────────────────────
  it('resolves diamond dependency taking max end from predecessors', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-02-01', durationDays: 2 }),
      makeItem({ id: 'B', durationDays: 5, dependsOn: ['A'] }),  // ends 02-07
      makeItem({ id: 'C', durationDays: 2, dependsOn: ['A'] }),  // ends 02-04
      makeItem({ id: 'D', durationDays: 1, dependsOn: ['B', 'C'] }),
    ]
    const result = computeAllDates(items)

    // A: 02-01 → 02-02
    expect(result.A).toMatchObject({ start: '2025-02-01', end: '2025-02-02' })
    // B: 02-03 → 02-07
    expect(result.B).toMatchObject({ start: '2025-02-03', end: '2025-02-07' })
    // C: 02-03 → 02-04
    expect(result.C).toMatchObject({ start: '2025-02-03', end: '2025-02-04' })
    // D: max(02-07, 02-04) + 1 = 02-08 → 02-08
    expect(result.D).toMatchObject({ start: '2025-02-08', end: '2025-02-08' })
  })

  // ── Cycle detection ────────────────────────────────────────────────────────
  it('detects direct cycle (A → B → A)', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-01-01', durationDays: 2, dependsOn: ['B'] }),
      makeItem({ id: 'B', durationDays: 3, dependsOn: ['A'] }),
    ]
    const result = computeAllDates(items)

    // Both should be marked as cycle
    expect(result.A.isCycle).toBe(true)
    expect(result.B.isCycle).toBe(true)
    expect(result.A.start).toBe('')
    expect(result.B.start).toBe('')
  })

  it('detects cycle in a 3-node ring (A → B → C → A)', () => {
    const items = [
      makeItem({ id: 'A', durationDays: 1, dependsOn: ['C'] }),
      makeItem({ id: 'B', durationDays: 1, dependsOn: ['A'] }),
      makeItem({ id: 'C', durationDays: 1, dependsOn: ['B'] }),
    ]
    const result = computeAllDates(items)

    expect(result.A.isCycle).toBe(true)
    expect(result.B.isCycle).toBe(true)
    expect(result.C.isCycle).toBe(true)
  })

  // ── Dependency on non-existent item ────────────────────────────────────────
  it('ignores dependencies on items not in the array', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-05-01', durationDays: 3, dependsOn: ['Z'] }),
    ]
    const result = computeAllDates(items)

    // Z is filtered out because it is not in map → treated as no deps
    expect(result.A).toMatchObject({ start: '2025-05-01', end: '2025-05-03', isCycle: false })
  })

  // ── Item with duration computed from predecessor ───────────────────────────
  it('computes startDate from predecessor when item has no startDate', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-04-01', durationDays: 3 }),
      makeItem({ id: 'B', durationDays: 5, dependsOn: ['A'] }),
    ]
    const result = computeAllDates(items)

    // B.start = A.end + 1 = 2025-04-04
    expect(result.B.start).toBe('2025-04-04')
    expect(result.B.end).toBe('2025-04-08')
  })

  // ── isLate ─────────────────────────────────────────────────────────────────
  it('flags item as late when end is in the past and pct < 100', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2020-01-01', durationDays: 5, pct: 50 }),
    ]
    const result = computeAllDates(items)

    expect(result.A.end).toBe('2020-01-05')
    expect(result.A.isLate).toBe(true)
  })

  it('does NOT flag as late when pct is 100', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2020-01-01', durationDays: 5, pct: 100 }),
    ]
    const result = computeAllDates(items)

    expect(result.A.isLate).toBe(false)
  })

  it('does NOT flag as late when end is in the future', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2099-01-01', durationDays: 5, pct: 0 }),
    ]
    const result = computeAllDates(items)

    expect(result.A.isLate).toBe(false)
  })

  // ── Percentage completion with dates ───────────────────────────────────────
  it('correctly handles items with various pct values', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2020-06-01', durationDays: 10, pct: 0 }),
      makeItem({ id: 'B', startDate: '2020-06-01', durationDays: 10, pct: 50 }),
      makeItem({ id: 'C', startDate: '2020-06-01', durationDays: 10, pct: 99 }),
      makeItem({ id: 'D', startDate: '2020-06-01', durationDays: 10, pct: 100 }),
    ]
    const result = computeAllDates(items)

    expect(result.A.isLate).toBe(true)
    expect(result.B.isLate).toBe(true)
    expect(result.C.isLate).toBe(true)
    expect(result.D.isLate).toBe(false) // 100% complete → not late
  })

  // ── Multiple independent items ─────────────────────────────────────────────
  it('processes multiple independent items correctly', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-01-01', durationDays: 3 }),
      makeItem({ id: 'B', startDate: '2025-02-01', durationDays: 5 }),
      makeItem({ id: 'C', startDate: '2025-03-01', durationDays: 1 }),
    ]
    const result = computeAllDates(items)

    expect(result.A).toMatchObject({ start: '2025-01-01', end: '2025-01-03' })
    expect(result.B).toMatchObject({ start: '2025-02-01', end: '2025-02-05' })
    expect(result.C).toMatchObject({ start: '2025-03-01', end: '2025-03-01' })
  })

  // ── Predecessor with deadline that is used as end ──────────────────────────
  it('uses predecessor deadline as end when computing dependent start', () => {
    const items = [
      makeItem({ id: 'A', startDate: '2025-01-01', durationDays: 3, deadlineDate: '2025-01-20' }),
      makeItem({ id: 'B', durationDays: 2, dependsOn: ['A'] }),
    ]
    const result = computeAllDates(items)

    // A.end = deadline = 01-20, so B.start = 01-21
    expect(result.A.end).toBe('2025-01-20')
    expect(result.B.start).toBe('2025-01-21')
    expect(result.B.end).toBe('2025-01-22')
  })
})
