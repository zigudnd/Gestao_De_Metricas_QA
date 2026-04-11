import { create } from 'zustand'
import { useAuthStore } from '@/modules/auth/store/authStore'
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
import { logAudit } from '@/lib/auditService'
import { uid } from '@/lib/uid'

// ─── Valid status transitions ────────────────────────────────────────────────

export const VALID_TRANSITIONS: Record<ReleaseStatus, ReleaseStatus[]> = {
  planejada: ['em_desenvolvimento', 'cancelada'],
  em_desenvolvimento: ['corte', 'cancelada'],
  corte: ['em_homologacao', 'em_qa', 'cancelada'],
  em_homologacao: ['em_regressivo', 'cancelada'],
  em_qa: ['em_regressivo', 'aguardando_aprovacao', 'cancelada'],
  em_regressivo: ['aprovada', 'aguardando_aprovacao', 'cancelada'],
  aguardando_aprovacao: ['aprovada', 'em_regressivo', 'cancelada'],
  aprovada: ['em_producao', 'cancelada'],
  em_producao: ['concluida', 'rollback'],
  concluida: [],
  rollback: ['em_desenvolvimento', 'cancelada'],
  cancelada: ['planejada'],
  uniu_escopo: ['em_desenvolvimento'],
}

// ─── Remote persist queue (Supabase) ─────────────────────────────────────────

let _remotePersistTimeout: ReturnType<typeof setTimeout> | null = null
let _remotePersistInFlight = false
let _remotePersistQueued = false
let _cleanupRealtime: (() => void) | null = null
let _lastPendingState: Release | null = null
let _lastPersistedAt: string | null = null
let _syncResetTimeout: ReturnType<typeof setTimeout> | null = null

async function doPersistToServer(release: Release, updatedAt?: string) {
  if (_remotePersistInFlight) { _remotePersistQueued = true; return }
  _remotePersistInFlight = true
  _remotePersistQueued = false
  useReleaseStore.setState({ syncStatus: 'saving' })
  // Save and clear pending state locally — new calls may set it again while we await
  const pendingSnapshot = _lastPendingState
  _lastPendingState = null
  try {
    await persistToServer(release, updatedAt)
    useReleaseStore.setState({ syncStatus: 'saved' })
    if (_syncResetTimeout) clearTimeout(_syncResetTimeout)
    _syncResetTimeout = setTimeout(() => useReleaseStore.setState({ syncStatus: 'idle' }), 3000)
  } catch (e) {
    if (import.meta.env.DEV) console.error('[Release] Erro ao sincronizar:', e)
    _lastPendingState = _lastPendingState ?? release
    useReleaseStore.setState({ syncStatus: 'error' })
  } finally {
    _remotePersistInFlight = false
    if (_remotePersistQueued) {
      // Use _lastPendingState (set by a newer incoming call) instead of the stale `release` parameter
      const next = _lastPendingState ?? pendingSnapshot ?? release
      queueRemotePersist(next, 2000)
    }
  }
}

function queueRemotePersist(release: Release, delay = 2500, updatedAt?: string) {
  if (_remotePersistTimeout) clearTimeout(_remotePersistTimeout)
  _lastPendingState = release
  useReleaseStore.setState({ syncStatus: 'saving' })
  _remotePersistTimeout = setTimeout(() => doPersistToServer(release, updatedAt), delay)
}

// Flush pendente antes de fechar a aba
function getActiveSquadId(): string | null {
  try {
    const saved = localStorage.getItem('activeSquadId')
    return saved || null
  } catch { return null }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (_lastPendingState) {
      const token = useAuthStore.getState().session?.access_token ?? null
      const payload = JSON.stringify({
        id: _lastPendingState.id,
        data: _lastPendingState,
        squad_id: getActiveSquadId(),
        status: _lastPendingState.status,
        version: _lastPendingState.version || null,
        production_date: _lastPendingState.productionDate || null,
        updated_at: new Date().toISOString(),
        token,
      })
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon?.('/api/release-flush', blob)
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
  syncStatus: 'idle' | 'saving' | 'saved' | 'error'

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
  addFeature: (squadId: string, suiteId: number | string) => void
  removeFeature: (squadId: string, featureIndex: number) => void
  updateFeature: (squadId: string, featureIndex: number, field: keyof Feature, value: unknown) => void

  // Squad-level: Test Cases
  addTestCase: (squadId: string, featureIndex: number) => void
  removeTestCase: (squadId: string, featureIndex: number, caseIndex: number) => void
  updateTestCase: (squadId: string, featureIndex: number, caseIndex: number, field: keyof TestCase, value: unknown) => void

  // Squad-level: Bugs
  addBug: (squadId: string, initialFields?: Partial<Bug>) => void
  removeBug: (squadId: string, bugIndex: number) => void
  updateBug: (squadId: string, bugIndex: number, field: keyof Bug, value: unknown) => void

  // Squad-level: Blockers
  addBlocker: (squadId: string) => void
  removeBlocker: (squadId: string, blockerIndex: number) => void

  // Squad-level: Suite name
  updateSuiteName: (squadId: string, suiteIndex: number, name: string) => void

  // Squad-level: Import features
  importFeatures: (squadId: string, suiteId: number | string, newFeatures: Array<Omit<Feature, 'id'>>) => void

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
  } catch (e) { if (import.meta.env.DEV) console.warn('[Releases] Failed to load calendar slots from localStorage:', e); return [] }
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
      id: 'slot_' + uid(),
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
  release: structuredClone(EMPTY_RELEASE),
  isLoading: false,
  lastSaved: 0,
  syncStatus: 'idle',

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
    // Duplicate prevention: skip if a release with the same version already exists
    const existing = get().releases
    if (release.version && existing.some((r) => r.version === release.version)) {
      if (import.meta.env.DEV) console.warn(`[Releases] Release duplicada ignorada: versão "${release.version}" já existe`)
      return
    }

    saveToLocalStorage(release)
    upsertMasterIndex(release)
    persistToServer(release).catch((e) => { if (import.meta.env.DEV) console.warn('[Releases] Failed to persist new release:', e) })
    const releases = [...existing, release]
    const index = getMasterIndex()
    set({ releases, index })
    logAudit('release', release.id, 'create', { title: { old: null, new: release.title }, version: { old: null, new: release.version } })
  },

  updateRelease: (id, fields) => {
    const original = get().releases.find((r) => r.id === id)
    const releases = get().releases.map((r) => {
      if (r.id !== id) return r
      const updated = { ...r, ...fields, updatedAt: new Date().toISOString() }
      saveToLocalStorage(updated)
      upsertMasterIndex(updated)
      persistToServer(updated).catch((e) => { if (import.meta.env.DEV) console.warn('[Releases] Failed to persist update:', e) })
      return updated
    })
    const index = getMasterIndex()
    set({ releases, index })
    if (original && 'rolloutPct' in fields && fields.rolloutPct !== original.rolloutPct) {
      logAudit('release', id, 'update', { rolloutPct: { old: original.rolloutPct, new: fields.rolloutPct } })
    }
  },

  deleteRelease: (id) => {
    deleteFromLocalStorage(id)
    removeFromMasterIndex(id)
    deleteFromServer(id).catch((e) => { if (import.meta.env.DEV) console.warn('[Releases] Failed to delete from server:', e) })
    const releases = get().releases.filter((r) => r.id !== id)
    const index = getMasterIndex()
    set({ releases, index })
    logAudit('release', id, 'delete', {})
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
      persistToServer(updated).catch((e) => { if (import.meta.env.DEV) console.warn('[Releases] Failed to persist squad addition:', e) })
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
      persistToServer(updated).catch((e) => { if (import.meta.env.DEV) console.warn('[Releases] Failed to persist squad removal:', e) })
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

    // Update the releases array so list views stay in sync with single-release state
    const currentReleases = get().releases
    const idx = currentReleases.findIndex((r) => r.id === normalized.id)
    const updatedReleases = idx >= 0
      ? currentReleases.map((r) => r.id === normalized.id ? normalized : r)
      : [...currentReleases, normalized]

    set({
      releaseId: normalized.id,
      release: normalized,
      releases: updatedReleases,
      isLoading: false,
    })

    // Realtime subscription
    if (_cleanupRealtime) _cleanupRealtime()
    _cleanupRealtime = initRealtimeSubscription(id, (incoming) => {
      // Ignora echo da nossa própria persistência
      if (incoming.updatedAt && incoming.updatedAt === _lastPersistedAt) return
      const realtimeReleases = get().releases.map((r) => r.id === incoming.id ? incoming : r)
      set({ release: incoming, releases: realtimeReleases })
    })
  },

  resetRelease: () => {
    if (_cleanupRealtime) {
      _cleanupRealtime()
      _cleanupRealtime = null
    }
    set({
      releaseId: null,
      release: structuredClone(EMPTY_RELEASE),
      isLoading: false,
    })
  },

  // ── Internal commit ────────────────────────────────────────────────────────

  _commit: (next: Release) => {
    const updatedAt = new Date().toISOString()
    const updated = { ...next, updatedAt }
    saveToLocalStorage(updated)
    upsertMasterIndex(updated)
    queueRemotePersist(updated, 2500, updatedAt)
    _lastPersistedAt = updatedAt
    const releases = get().releases.map((r) => r.id === updated.id ? updated : r)
    set({ release: updated, releases, lastSaved: Date.now() })
  },

  // ── Config ─────────────────────────────────────────────────────────────────

  updateConfig: (field, value) => {
    const { release, _commit } = get()
    _commit({ ...release, [field]: value })
  },

  updateStatus: (status, reason = '') => {
    const { release, _commit } = get()
    const oldStatus = release.status

    // Validate transition
    const allowed = VALID_TRANSITIONS[oldStatus]
    if (allowed) {
      if (!allowed.includes(status)) {
        if (import.meta.env.DEV) {
          console.warn(
            `[Release] Transição inválida bloqueada: "${oldStatus}" → "${status}". ` +
            `Transições permitidas: [${allowed.join(', ')}]`,
          )
        }
        return
      }
    } else if (import.meta.env.DEV) {
      // Unknown source state — allow but warn
      console.warn(
        `[Release] Estado de origem desconhecido "${oldStatus}". Transição para "${status}" permitida por fallback.`,
      )
    }

    const change = {
      from: oldStatus,
      to: status,
      timestamp: new Date().toISOString(),
      reason,
    }
    _commit({
      ...release,
      status,
      statusHistory: [...release.statusHistory, change],
    })
    logAudit('release', release.id, 'update', { status: { old: oldStatus, new: status } })
  },

  // ── Squads (single-release mode) ───────────────────────────────────────────

  addSquad: (partial) => {
    const { release, _commit } = get()
    const newSquad: ReleaseSquad = {
      id: 'rsq_' + uid(),
      squadId: partial.squadId,
      squadName: partial.squadName,
      status: 'not_started',
      suites: [{ id: uid(), name: 'Suite Principal' }],
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
      suites: [...sq.suites, { id: uid(), name: '' }],
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
        id: uid(),
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
          id: uid(),
          name: '',
          complexity: 'Baixa',
          status: 'Pendente',
          executionDay: '',
          gherkin: '',
          blockReason: '',
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

  addBug: (squadId, initialFields) => {
    const { release, _commit } = get()
    _commit(mapSquad(release, squadId, (sq) => ({
      ...sq,
      bugs: [...sq.bugs, {
        id: 'bug_' + uid(),
        desc: '',
        feature: '',
        stack: 'Front' as const,
        severity: 'Média' as const,
        assignee: '',
        status: 'Aberto' as const,
        retests: 0,
        ...initialFields,
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
        id: uid(),
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
      const toAdd = newFeatures.map((f) => {
        const existing = sq.features.find(
          (ef) => ef.name.toLowerCase() === f.name.toLowerCase() && String(ef.suiteId) === String(suiteId)
        )
        if (existing) {
          return { ...existing, cases: [...(existing.cases ?? []), ...(f.cases ?? [])] }
        }
        return { ...f, id: uid(), suiteId } as Feature
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
