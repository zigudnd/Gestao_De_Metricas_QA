import { create } from 'zustand'
import type {
  Release, ReleaseSquad, ReleaseStatus, ReleaseIndexEntry,
  Feature, TestCase, Bug, Blocker, CalendarSlot,
} from '../types/release.types'
import {
  getMasterIndex,
  upsertMasterIndex,
  removeFromMasterIndex,
  saveToLocalStorage,
  loadFromLocalStorage,
  deleteFromLocalStorage,
  deleteFromServer,
  persistToServer,
  loadFromServer,
  normalizeRelease,
  createDefaultRelease,
  initRealtimeSubscription,
} from '../services/releasePersistence'

// ─── Remote persist queue (Supabase) ─────────────────────────────────────────

let _remotePersistTimeout: ReturnType<typeof setTimeout> | null = null
let _remotePersistInFlight = false
let _remotePersistQueued = false
let _cleanupRealtime: (() => void) | null = null
let _lastPendingState: Release | null = null

async function doPersistToServer(release: Release) {
  if (_remotePersistInFlight) { _remotePersistQueued = true; return }
  _remotePersistInFlight = true
  _remotePersistQueued = false
  _lastPendingState = null
  try {
    await persistToServer(release)
  } catch (e) {
    console.error('[Release] Erro ao sincronizar:', e)
    _lastPendingState = release
  } finally {
    _remotePersistInFlight = false
    if (_remotePersistQueued && _lastPendingState) {
      queueRemotePersist(_lastPendingState, 2000)
    } else if (_remotePersistQueued) {
      queueRemotePersist(release, 2000)
    }
  }
}

function queueRemotePersist(release: Release, delay = 700) {
  if (_remotePersistTimeout) clearTimeout(_remotePersistTimeout)
  _lastPendingState = release
  _remotePersistTimeout = setTimeout(() => doPersistToServer(release), delay)
}

// Flush pendente antes de fechar a aba
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (_lastPendingState) {
      const payload = JSON.stringify({
        id: _lastPendingState.id,
        data: _lastPendingState,
        status: _lastPendingState.status,
        version: _lastPendingState.version || null,
        production_date: _lastPendingState.productionDate || null,
        updated_at: new Date().toISOString(),
      })
      navigator.sendBeacon?.('/api/release-flush', payload)
    }
  })
}

// ─── Helper: update a squad inside the release ──────────────────────────────

function mapSquad(release: Release, squadId: string, fn: (sq: ReleaseSquad) => ReleaseSquad): Release {
  return {
    ...release,
    squads: release.squads.map((sq) => sq.id === squadId ? fn(sq) : sq),
    updatedAt: new Date().toISOString(),
  }
}

// ─── Store Interface ─────────────────────────────────────────────────────────

type ReleaseConfigField = keyof Pick<Release, 'version' | 'title' | 'description' | 'productionDate' | 'cutoffDate' | 'buildDate' | 'homologacaoStart' | 'homologacaoEnd' | 'betaDate'>
type SquadUpdatableField = keyof Pick<ReleaseSquad, 'squadName' | 'notes' | 'hasNewFeatures'>

interface ReleaseStore {
  // Calendar slots (programação oficial)
  calendarSlots: CalendarSlot[]
  loadCalendarSlots: () => void
  addCalendarSlot: (slot: Omit<CalendarSlot, 'id' | 'createdAt'>) => void
  updateCalendarSlot: (id: string, updates: Partial<CalendarSlot>) => void
  removeCalendarSlot: (id: string) => void
  linkSlotToRelease: (slotId: string, releaseId: string) => void

  // List state (for ReleasesPage)
  releases: Release[]
  index: ReleaseIndexEntry[]

  // Single-release state (for ReleaseDashboard)
  releaseId: string | null
  release: Release
  isLoading: boolean
  lastSaved: number

  // List-mode operations
  load: () => void
  addRelease: (release: Release) => void
  updateRelease: (id: string, fields: Partial<Release>) => void
  deleteRelease: (id: string) => void
  getReleaseById: (id: string) => Release | undefined
  addSquadToRelease: (releaseId: string, squad: ReleaseSquad) => void
  removeSquadFromRelease: (releaseId: string, squadId: string) => void

  // Lifecycle
  initRelease: (id: string) => Promise<void>
  resetRelease: () => void

  // Internal commit
  _commit: (next: Release) => void

  // Config
  updateConfig: (field: ReleaseConfigField, value: string) => void
  updateStatus: (status: ReleaseStatus, reason?: string) => void

  // Squads (single-release mode)
  addSquad: (partial: Pick<ReleaseSquad, 'squadId' | 'squadName'>) => void
  removeSquad: (squadId: string) => void
  updateSquad: (squadId: string, field: SquadUpdatableField, value: string | boolean) => void

  // Squad-level: Suites
  addSuite: (squadId: string) => void
  removeSuite: (squadId: string, suiteIndex: number) => void

  // Squad-level: Features
  addFeature: (squadId: string, suiteId: number) => void
  removeFeature: (squadId: string, featureIndex: number) => void
  updateFeature: (squadId: string, featureIndex: number, field: keyof Feature, value: unknown) => void

  // Squad-level: Test Cases
  addTestCase: (squadId: string, featureIndex: number) => void
  removeTestCase: (squadId: string, featureIndex: number, caseIndex: number) => void
  updateTestCase: (squadId: string, featureIndex: number, caseIndex: number, field: keyof TestCase, value: unknown) => void

  // Squad-level: Bugs
  addBug: (squadId: string) => void
  removeBug: (squadId: string, bugIndex: number) => void
  updateBug: (squadId: string, bugIndex: number, field: keyof Bug, value: unknown) => void

  // Squad-level: Blockers
  addBlocker: (squadId: string) => void
  removeBlocker: (squadId: string, blockerIndex: number) => void

  // Squad-level: Suite name
  updateSuiteName: (squadId: string, suiteIndex: number, name: string) => void

  // Squad-level: Import features
  importFeatures: (squadId: string, suiteId: number, newFeatures: Array<Omit<Feature, 'id'>>) => void

  // Non-blocking features
  updateNonBlockingFeatures: (features: string[]) => void
}

// ─── Store ───────────────────────────────────────────────────────────────────

const EMPTY_RELEASE = createDefaultRelease('')

const CALENDAR_LS_KEY = 'releaseCalendarSlots'

function loadSlotsFromLS(): CalendarSlot[] {
  try {
    const raw = localStorage.getItem(CALENDAR_LS_KEY)
    return raw ? JSON.parse(raw) as CalendarSlot[] : []
  } catch { return [] }
}

function saveSlotsToLS(slots: CalendarSlot[]): void {
  localStorage.setItem(CALENDAR_LS_KEY, JSON.stringify(slots))
}

export const useReleaseStore = create<ReleaseStore>((set, get) => ({
  // Calendar slots
  calendarSlots: [],

  loadCalendarSlots: () => {
    set({ calendarSlots: loadSlotsFromLS() })
  },

  addCalendarSlot: (slot) => {
    const newSlot: CalendarSlot = {
      ...slot,
      id: 'slot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      createdAt: new Date().toISOString(),
    }
    const updated = [...get().calendarSlots, newSlot]
    saveSlotsToLS(updated)
    set({ calendarSlots: updated })
  },

  updateCalendarSlot: (id, updates) => {
    const updated = get().calendarSlots.map((s) => s.id === id ? { ...s, ...updates } : s)
    saveSlotsToLS(updated)
    set({ calendarSlots: updated })
  },

  removeCalendarSlot: (id) => {
    const updated = get().calendarSlots.filter((s) => s.id !== id)
    saveSlotsToLS(updated)
    set({ calendarSlots: updated })
  },

  linkSlotToRelease: (slotId, releaseId) => {
    const updated = get().calendarSlots.map((s) => s.id === slotId ? { ...s, releaseId } : s)
    saveSlotsToLS(updated)
    set({ calendarSlots: updated })
  },

  // List state
  releases: [],
  index: [],

  // Single-release state
  releaseId: null,
  release: JSON.parse(JSON.stringify(EMPTY_RELEASE)),
  isLoading: false,
  lastSaved: 0,

  // ── List-mode operations ───────────────────────────────────────────────────

  load: () => {
    const index = getMasterIndex()
    const releases: Release[] = []
    for (const entry of index) {
      const rel = loadFromLocalStorage(entry.id)
      if (rel) releases.push(rel)
    }
    set({ index, releases })
  },

  addRelease: (release) => {
    saveToLocalStorage(release)
    upsertMasterIndex(release)
    persistToServer(release).catch(() => {})
    const releases = [...get().releases, release]
    const index = getMasterIndex()
    set({ releases, index })
  },

  updateRelease: (id, fields) => {
    const releases = get().releases.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, ...fields, updatedAt: new Date().toISOString() }
      saveToLocalStorage(updated)
      upsertMasterIndex(updated)
      persistToServer(updated).catch(() => {})
      return updated
    })
    const index = getMasterIndex()
    set({ releases, index })
  },

  deleteRelease: (id) => {
    deleteFromLocalStorage(id)
    removeFromMasterIndex(id)
    deleteFromServer(id).catch(() => {})
    const releases = get().releases.filter((r) => r.id !== id)
    const index = getMasterIndex()
    set({ releases, index })
  },

  getReleaseById: (id) => {
    return get().releases.find((r) => r.id === id)
  },

  addSquadToRelease: (releaseId, squad) => {
    const releases = get().releases.map((r) => {
      if (r.id !== releaseId) return r
      const updated = { ...r, squads: [...r.squads, squad], updatedAt: new Date().toISOString() }
      saveToLocalStorage(updated)
      upsertMasterIndex(updated)
      persistToServer(updated).catch(() => {})
      return updated
    })
    const index = getMasterIndex()
    set({ releases, index })
  },

  removeSquadFromRelease: (releaseId, squadId) => {
    const releases = get().releases.map((r) => {
      if (r.id !== releaseId) return r
      const updated = {
        ...r,
        squads: r.squads.filter((s) => s.squadId !== squadId),
        updatedAt: new Date().toISOString(),
      }
      saveToLocalStorage(updated)
      upsertMasterIndex(updated)
      persistToServer(updated).catch(() => {})
      return updated
    })
    const index = getMasterIndex()
    set({ releases, index })
  },

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  initRelease: async (id: string) => {
    set({ isLoading: true })

    let state = await loadFromServer(id)
    if (!state) state = loadFromLocalStorage(id)
    if (!state) state = createDefaultRelease(id)

    const normalized = normalizeRelease(state)
    saveToLocalStorage(normalized)
    upsertMasterIndex(normalized)
    queueRemotePersist(normalized)

    set({
      releaseId: normalized.id,
      release: normalized,
      isLoading: false,
    })

    // Realtime subscription
    if (_cleanupRealtime) _cleanupRealtime()
    _cleanupRealtime = initRealtimeSubscription(id, (incoming) => {
      set({ release: incoming })
    })
  },

  resetRelease: () => {
    if (_cleanupRealtime) {
      _cleanupRealtime()
      _cleanupRealtime = null
    }
    set({
      releaseId: null,
      release: JSON.parse(JSON.stringify(EMPTY_RELEASE)),
      isLoading: false,
    })
  },

  // ── Internal commit ────────────────────────────────────────────────────────

  _commit: (next: Release) => {
    const updated = { ...next, updatedAt: new Date().toISOString() }
    saveToLocalStorage(updated)
    upsertMasterIndex(updated)
    queueRemotePersist(updated)
    set({ release: updated, lastSaved: Date.now() })
  },

  // ── Config ─────────────────────────────────────────────────────────────────

  updateConfig: (field, value) => {
    const { release, _commit } = get()
    _commit({ ...release, [field]: value })
  },

  updateStatus: (status, reason = '') => {
    const { release, _commit } = get()
    const change = {
      from: release.status,
      to: status,
      timestamp: new Date().toISOString(),
      reason,
    }
    _commit({
      ...release,
      status,
      statusHistory: [...release.statusHistory, change],
    })
  },

  // ── Squads (single-release mode) ───────────────────────────────────────────

  addSquad: (partial) => {
    const { release, _commit } = get()
    const newSquad: ReleaseSquad = {
      id: 'rsq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      squadId: partial.squadId,
      squadName: partial.squadName,
      status: 'not_started',
      suites: [{ id: Date.now(), name: 'Suite Principal' }],
      features: [],
      bugs: [],
      blockers: [],
      notes: '',
      hasNewFeatures: false,
    }
    _commit({ ...release, squads: [...release.squads, newSquad] })
  },

  removeSquad: (squadId) => {
    const { release, _commit } = get()
    _commit({ ...release, squads: release.squads.filter((sq) => sq.id !== squadId) })
  },

  updateSquad: (squadId, field, value) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({ ...sq, [field]: value })))
  },

  // ── Squad-level: Suites ────────────────────────────────────────────────────

  addSuite: (squadId) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      suites: [...sq.suites, { id: Date.now(), name: '' }],
    })))
  },

  removeSuite: (squadId, suiteIndex) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => {
      const suiteToRemove = sq.suites[suiteIndex]
      return {
        ...sq,
        suites: sq.suites.filter((_, i) => i !== suiteIndex),
        features: suiteToRemove
          ? sq.features.filter((f) => f.suiteId !== suiteToRemove.id)
          : sq.features,
      }
    }))
  },

  // ── Squad-level: Features ──────────────────────────────────────────────────

  addFeature: (squadId, suiteId) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      features: [...sq.features, {
        id: Date.now(),
        suiteId,
        name: '',
        tests: 0,
        manualTests: 0,
        exec: 0,
        execution: {},
        manualExecData: {},
        gherkinExecs: {},
        mockupImage: '',
        status: 'Ativa' as const,
        blockReason: '',
        activeFilter: 'Todos' as const,
        cases: [],
      }],
    })))
  },

  removeFeature: (squadId, featureIndex) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      features: sq.features.filter((_, i) => i !== featureIndex),
    })))
  },

  updateFeature: (squadId, featureIndex, field, value) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      features: sq.features.map((f, i) =>
        i === featureIndex ? { ...f, [field]: value } : f
      ),
    })))
  },

  // ── Squad-level: Test Cases ────────────────────────────────────────────────

  addTestCase: (squadId, featureIndex) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      features: sq.features.map((f, i) => {
        if (i !== featureIndex) return f
        const newCase: TestCase = {
          id: Date.now(),
          name: '',
          complexity: 'Baixa',
          status: 'Pendente',
          executionDay: '',
          gherkin: '',
        }
        return { ...f, cases: [...f.cases, newCase] }
      }),
    })))
  },

  removeTestCase: (squadId, featureIndex, caseIndex) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      features: sq.features.map((f, i) => {
        if (i !== featureIndex) return f
        return { ...f, cases: f.cases.filter((_, ci) => ci !== caseIndex) }
      }),
    })))
  },

  updateTestCase: (squadId, featureIndex, caseIndex, field, value) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      features: sq.features.map((f, fi) => {
        if (fi !== featureIndex) return f
        return {
          ...f,
          cases: f.cases.map((c, ci) =>
            ci === caseIndex ? { ...c, [field]: value } : c
          ),
        }
      }),
    })))
  },

  // ── Squad-level: Bugs ──────────────────────────────────────────────────────

  addBug: (squadId) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      bugs: [...sq.bugs, {
        id: 'bug_' + Date.now(),
        desc: '',
        feature: '',
        stack: 'Front' as const,
        severity: 'Média' as const,
        assignee: '',
        status: 'Aberto' as const,
        retests: 0,
      }],
    })))
  },

  removeBug: (squadId, bugIndex) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      bugs: sq.bugs.filter((_, i) => i !== bugIndex),
    })))
  },

  updateBug: (squadId, bugIndex, field, value) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      bugs: sq.bugs.map((b, i) =>
        i === bugIndex ? { ...b, [field]: value } : b
      ),
    })))
  },

  // ── Squad-level: Blockers ──────────────────────────────────────────────────

  addBlocker: (squadId) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      blockers: [...sq.blockers, {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        reason: '',
        hours: 0,
      }],
    })))
  },

  removeBlocker: (squadId, blockerIndex) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      blockers: sq.blockers.filter((_, i) => i !== blockerIndex),
    })))
  },

  // ── Squad-level: Suite name ────────────────────────────────────────────────

  updateSuiteName: (squadId, suiteIndex, name) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      suites: sq.suites.map((s, i) => i === suiteIndex ? { ...s, name } : s),
    })))
  },

  // ── Squad-level: Import features ─────────────────────────────────────────

  importFeatures: (squadId, suiteId, newFeatures) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => {
      const now = Date.now()
      const toAdd = newFeatures.map((f, idx) => {
        const existing = sq.features.find(
          (ef) => ef.name.toLowerCase() === f.name.toLowerCase() && String(ef.suiteId) === String(suiteId)
        )
        if (existing) {
          return { ...existing, cases: [...(existing.cases ?? []), ...(f.cases ?? [])] }
        }
        return { ...f, id: now + idx, suiteId } as Feature
      })
      const existingNames = new Set(
        toAdd.filter((f) => sq.features.some((ef) => ef.id === f.id)).map((f) => f.id)
      )
      const merged = sq.features.map((ef) => {
        const replacement = toAdd.find((t) => t.id === ef.id)
        return replacement ?? ef
      })
      const brandNew = toAdd.filter((f) => !existingNames.has(f.id))
      return { ...sq, features: [...merged, ...brandNew] }
    }))
  },

  // ── Non-blocking features ──────────────────────────────────────────────────

  updateNonBlockingFeatures: (features) => {
    const { release, _commit } = get()
    _commit({ ...release, nonBlockingFeatures: features })
  },
}))
