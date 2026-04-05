import { describe, it, expect } from 'vitest'
import { normalizeState } from './statusReportPersistence'
import { DEFAULT_SECTIONS } from '../types/statusReport.types'

describe('normalizeState', () => {
  it('returns a fully populated state from null input', () => {
    const state = normalizeState(null)

    expect(state.id).toMatch(/^sr_/)
    expect(state.config.title).toBe('Status Report')
    expect(state.config.squad).toBe('')
    expect(state.config.period).toBe('')
    expect(state.config.periodStart).toBe('')
    expect(state.config.periodEnd).toBe('')
    expect(state.config.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.sections).toEqual(DEFAULT_SECTIONS)
    expect(state.items).toEqual([])
    expect(state.createdAt).toBeTruthy()
    expect(state.updatedAt).toBeTruthy()
  })

  it('returns a fully populated state from undefined input', () => {
    const state = normalizeState(undefined)
    expect(state.id).toMatch(/^sr_/)
    expect(state.sections).toEqual(DEFAULT_SECTIONS)
  })

  it('preserves existing valid fields', () => {
    const raw = {
      id: 'my-report',
      config: {
        title: 'Weekly Report',
        date: '2026-04-01',
        squad: 'Alpha',
        period: 'Sprint 10',
        periodStart: '2026-03-25',
        periodEnd: '2026-04-05',
      },
      sections: DEFAULT_SECTIONS,
      items: [],
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-04-01T12:00:00Z',
    }

    const state = normalizeState(raw)

    expect(state.id).toBe('my-report')
    expect(state.config.title).toBe('Weekly Report')
    expect(state.config.squad).toBe('Alpha')
    expect(state.createdAt).toBe('2026-04-01T00:00:00Z')
    expect(state.updatedAt).toBe('2026-04-01T12:00:00Z')
  })

  it('defaults missing config to DEFAULT_CONFIG shape', () => {
    const state = normalizeState({ id: 'test-1' })

    expect(state.config.title).toBe('Status Report')
    expect(state.config.squad).toBe('')
    expect(state.config.period).toBe('')
    expect(state.config.periodStart).toBe('')
    expect(state.config.periodEnd).toBe('')
  })

  it('defaults missing config.title and config.date', () => {
    const state = normalizeState({
      id: 'test-2',
      config: { squad: 'Beta' },
    })

    expect(state.config.title).toBe('Status Report')
    expect(state.config.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(state.config.squad).toBe('Beta')
  })

  it('defaults empty sections array to DEFAULT_SECTIONS', () => {
    const state = normalizeState({ id: 'test-3', sections: [] })
    expect(state.sections).toEqual(DEFAULT_SECTIONS)
  })

  it('defaults non-array sections to DEFAULT_SECTIONS', () => {
    const state = normalizeState({ id: 'test-4', sections: 'invalid' })
    expect(state.sections).toEqual(DEFAULT_SECTIONS)
  })

  it('defaults non-array items to empty array', () => {
    const state = normalizeState({ id: 'test-5', items: 'nope' })
    expect(state.items).toEqual([])
  })

  it('normalizes item fields with defaults', () => {
    const raw = {
      id: 'test-6',
      items: [
        {
          id: 'item-1',
          title: 'Fix bug',
          section: 'sprint',
          priority: 'high' as const,
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z',
          // missing: stacks, dependsOn, pct, durationDays, startDate, deadlineDate, notes, jira, resp
        },
      ],
    }

    const state = normalizeState(raw)
    const item = state.items[0]

    expect(item.stacks).toEqual([])
    expect(item.dependsOn).toEqual([])
    expect(item.pct).toBe(0)
    expect(item.durationDays).toBe(1)
    expect(item.startDate).toBe('')
    expect(item.deadlineDate).toBe('')
    expect(item.notes).toBe('')
    expect(item.jira).toBe('')
    expect(item.resp).toBe('')
  })

  it('does not overwrite existing item fields', () => {
    const raw = {
      id: 'test-7',
      items: [
        {
          id: 'item-2',
          title: 'Task',
          section: 'sprint',
          priority: 'low' as const,
          stacks: ['ios'] as const,
          dependsOn: ['item-1'],
          pct: 50,
          durationDays: 5,
          startDate: '2026-04-01',
          deadlineDate: '2026-04-05',
          notes: 'some notes',
          jira: 'PROJ-123',
          resp: 'John',
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z',
        },
      ],
    }

    const state = normalizeState(raw)
    const item = state.items[0]

    expect(item.stacks).toEqual(['ios'])
    expect(item.dependsOn).toEqual(['item-1'])
    expect(item.pct).toBe(50)
    expect(item.durationDays).toBe(5)
    expect(item.notes).toBe('some notes')
    expect(item.jira).toBe('PROJ-123')
    expect(item.resp).toBe('John')
  })

  it('generates an id for items missing one', () => {
    const raw = {
      id: 'test-8',
      items: [
        {
          title: 'No ID item',
          section: 'sprint',
          priority: 'medium' as const,
          createdAt: '2026-04-01T00:00:00Z',
          updatedAt: '2026-04-01T00:00:00Z',
        },
      ],
    }

    const state = normalizeState(raw)
    expect(state.items[0].id).toMatch(/^sr_/)
  })

  it('does not mutate the original input object', () => {
    const raw = { id: 'test-9', config: { title: 'Original' } }
    const copy = JSON.parse(JSON.stringify(raw))
    normalizeState(raw)
    expect(raw).toEqual(copy)
  })
})
