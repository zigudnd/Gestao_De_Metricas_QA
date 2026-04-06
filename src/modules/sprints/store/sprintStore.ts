import { create } from 'zustand'
import type {
  SprintState, Feature, Bug, Blocker, Alignment,
  TestCase, Suite, SprintConfig, Notes, ResponsiblePerson,
} from '../types/sprint.types'
import {
  computeFields, saveToStorage, upsertSprintInMasterIndex,
  DEFAULT_STATE, normalizeState, persistToServer, getMasterIndex,
} from '../services/persistence'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { logAudit } from '@/lib/auditService'

// ─── Remote persist queue (Supabase) ─────────────────────────────────────────

let _remotePersistTimeout: ReturnType<typeof setTimeout> | null = null
let _remotePersistInFlight = false
let _remotePersistQueued = false
let _realtimeChannel: RealtimeChannel | null = null
let _lastPersistedAt: string | null = null
let _lastPendingState: { sprintId: string; state: SprintState } | null = null

async function doPersistToServer(sprintId: string, state: SprintState, updatedAt?: string) {
  if (!sprintId) return
  if (_remotePersistInFlight) { _remotePersistQueued = true; return }
  _remotePersistInFlight = true
  _remotePersistQueued = false
  // Save and clear pending state locally — new calls may set it again while we await
  const pendingSnapshot = _lastPendingState
  _lastPendingState = null
  try {
    await persistToServer(sprintId, state, updatedAt)
  } catch (e) {
    if (import.meta.env.DEV) console.error('[Supabase] Erro ao sincronizar sprint:', e)
    _lastPendingState = _lastPendingState ?? { sprintId, state }
  } finally {
    _remotePersistInFlight = false
    if (_remotePersistQueued) {
      // Use _lastPendingState (set by a newer incoming call) instead of the stale `state` parameter
      const next = _lastPendingState ?? pendingSnapshot ?? { sprintId, state }
      queueRemotePersist(next.sprintId, next.state, 2000)
    }
  }
}

function queueRemotePersist(sprintId: string, state: SprintState, delay = 2500, updatedAt?: string) {
  if (_remotePersistTimeout) clearTimeout(_remotePersistTimeout)
  _lastPendingState = { sprintId, state }
  _remotePersistTimeout = setTimeout(() => doPersistToServer(sprintId, state, updatedAt), delay)
}

// Flush pendente antes de fechar a aba
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (_lastPendingState) {
      const entry = getMasterIndex().find((s) => s.id === _lastPendingState!.sprintId)
      const payload = JSON.stringify({
        id: _lastPendingState.sprintId,
        data: _lastPendingState.state,
        squad_id: entry?.squadId || null,
        status: 'ativa',
      })
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon?.('/api/sprint-flush', blob)
    }
  })
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface SprintStore {
  sprintId: string
  state: SprintState
  activeSuiteFilter: Set<string>   // empty = all visible
  lastSaved: number                // timestamp updated on every _commit

  // Lifecycle
  initSprint: (sprintId: string, loaded: SprintState) => void
  resetSprint: () => void

  // Internal: commit + persist
  _commit: (next: SprintState) => void

  // Config
  updateConfig: (field: keyof SprintConfig, value: string | number | boolean) => void

  // Notes & reports
  updateNotes: (field: keyof Notes, value: string) => void
  updateReportText: (date: string, value: string) => void

  // Suites
  addSuite: () => void
  updateSuite: (index: number, field: keyof Suite, value: string) => void
  removeSuite: (index: number) => void
  duplicateSuite: (index: number) => void

  // Features
  addFeature: (suiteId: number) => void
  updateFeature: (index: number, field: keyof Feature, value: unknown) => void
  removeFeature: (index: number) => void
  updateFeatureExecution: (featureIndex: number, dayKey: string, value: number) => void

  // Test Cases
  addTestCase: (featureIndex: number) => void
  updateTestCase: (fi: number, ci: number, field: keyof TestCase, value: unknown) => void
  removeTestCase: (fi: number, ci: number) => void
  duplicateTestCase: (fi: number, ci: number) => void
  bulkUpdateCases: (fi: number, indices: number[], field: keyof TestCase, value: unknown) => void

  // Bugs
  addBug: () => void
  addBugFull: (data: Omit<Bug, 'id' | 'retests'>) => void
  updateBug: (index: number, field: keyof Bug, value: unknown) => void
  removeBug: (index: number) => void
  duplicateBug: (index: number) => void

  // Blockers
  addBlocker: () => void
  updateBlocker: (index: number, field: keyof Blocker, value: unknown) => void
  removeBlocker: (index: number) => void

  // Alignments
  addAlignment: () => void
  addAlignmentFull: (text: string) => void
  updateAlignment: (index: number, value: string) => void
  removeAlignment: (index: number) => void

  // Responsibles
  addResponsible: () => void
  updateResponsible: (index: number, field: keyof ResponsiblePerson, value: string) => void
  removeResponsible: (index: number) => void

  // Suite filter
  toggleSuiteFilter: (suiteId: string) => void
  clearSuiteFilter: () => void

  // Import features from file (merges into existing features)
  importFeatures: (suiteId: number, newFeatures: Array<Omit<import('../types/sprint.types').Feature, 'id'>>) => void

  // Reorder features within a suite (drag-drop)
  reorderFeatures: (suiteId: number, fromDomIdx: number, toDomIdx: number) => void

  // Mockup
  setMockupImage: (fi: number, base64: string) => void
  removeMockupImage: (fi: number) => void
}

export const useSprintStore = create<SprintStore>((set, get) => ({
  sprintId: '',
  state: structuredClone(DEFAULT_STATE),
  activeSuiteFilter: new Set(),
  lastSaved: 0,

  initSprint: (sprintId, loaded) => {
    const normalized = normalizeState(loaded)
    const computed = computeFields(normalized)
    set({ sprintId, state: computed, activeSuiteFilter: new Set() })

    // Garante que a sprint existe no Supabase ao abrir pela primeira vez
    queueRemotePersist(sprintId, computed)

    // Realtime: escuta alterações feitas por outros usuários nesta sprint
    if (_realtimeChannel) supabase.removeChannel(_realtimeChannel)
    // Capture sprintId in closure to detect stale callbacks after sprint switch
    const subscribedSprintId = sprintId
    _realtimeChannel = supabase
      .channel(`sprint:${sprintId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sprints', filter: `id=eq.${sprintId}` },
        (payload) => {
          // Ignora se o payload não tiver dados
          if (!payload.new?.data) return
          // Race condition guard: ignore if user already switched to another sprint
          if (get().sprintId !== subscribedSprintId) return
          // Ignora echo da nossa própria persistência
          const incomingUpdatedAt = (payload.new as Record<string, unknown>).updated_at as string | undefined
          if (incomingUpdatedAt && incomingUpdatedAt === _lastPersistedAt) return
          const incoming = normalizeState(payload.new.data)
          const recomputed = computeFields(incoming)
          // Extract squadId from the Supabase row to preserve squad-based visibility
          const incomingSquadId = (payload.new as Record<string, unknown>).squad_id as string | undefined
          const existingEntry = getMasterIndex().find((s) => s.id === subscribedSprintId)
          const squadId = incomingSquadId || existingEntry?.squadId
          saveToStorage(subscribedSprintId, recomputed)
          upsertSprintInMasterIndex(subscribedSprintId, recomputed, squadId)
          set({ state: recomputed })
        }
      )
      .subscribe()
  },

  resetSprint: () => {
    if (_realtimeChannel) {
      supabase.removeChannel(_realtimeChannel)
      _realtimeChannel = null
    }
    set({ sprintId: '', state: structuredClone(DEFAULT_STATE), activeSuiteFilter: new Set() })
  },

  _commit: (next) => {
    const computed = computeFields(next)
    const { sprintId } = get()
    const updatedAt = new Date().toISOString()
    const existingEntry = getMasterIndex().find((s) => s.id === sprintId)
    saveToStorage(sprintId, computed)
    upsertSprintInMasterIndex(sprintId, computed, existingEntry?.squadId)
    queueRemotePersist(sprintId, computed, 2500, updatedAt)
    _lastPersistedAt = updatedAt
    set({ state: computed, lastSaved: Date.now() })
  },

  // ── Config ─────────────────────────────────────────────────────────────────
  updateConfig: (field, value) => {
    const { state, _commit } = get()
    _commit({ ...state, config: { ...state.config, [field]: value } })
  },

  // ── Notes & Reports ────────────────────────────────────────────────────────
  updateNotes: (field, value) => {
    const { state, _commit } = get()
    _commit({ ...state, notes: { ...state.notes, [field]: value } })
  },

  updateReportText: (date, value) => {
    const { state, _commit } = get()
    _commit({ ...state, reports: { ...state.reports, [date]: value } })
  },

  // ── Suites ─────────────────────────────────────────────────────────────────
  addSuite: () => {
    const { state, _commit } = get()
    const newId = Date.now()
    _commit({ ...state, suites: [...state.suites, { id: newId, name: '' }] })
    return newId
  },

  updateSuite: (index, field, value) => {
    const { state, _commit } = get()
    const suites = state.suites.map((s, i) => i === index ? { ...s, [field]: value } : s)
    _commit({ ...state, suites })
  },

  removeSuite: (index) => {
    const { state, _commit } = get()
    const suite = state.suites[index]
    if (!suite) return
    const suites = state.suites.filter((_, i) => i !== index)
    const features = state.features.filter((f) => String(f.suiteId) !== String(suite.id))
    _commit({ ...state, suites, features })
  },

  duplicateSuite: (index) => {
    const { state, _commit } = get()
    const suite = state.suites[index]
    if (!suite) return
    const newSuiteId = Date.now()
    const newSuite = { id: newSuiteId, name: `${suite.name} (cópia)` }
    const suites = [
      ...state.suites.slice(0, index + 1),
      newSuite,
      ...state.suites.slice(index + 1),
    ]
    const suiteFeatures = state.features.filter((f) => String(f.suiteId) === String(suite.id))
    const now = Date.now()
    const copiedFeatures = suiteFeatures.map((f, i) => ({
      ...structuredClone(f),
      id: now + i + 1,
      suiteId: newSuiteId,
    }))
    _commit({ ...state, suites, features: [...state.features, ...copiedFeatures] })
  },

  // ── Features ───────────────────────────────────────────────────────────────
  addFeature: (suiteId) => {
    const { state, _commit } = get()
    const newId = Date.now()
    const newFeature: Feature = {
      id: newId, suiteId, name: '', tests: 0, manualTests: 0, exec: 0,
      execution: {}, manualExecData: {}, gherkinExecs: {},
      mockupImage: '', status: 'Ativa', blockReason: '', activeFilter: 'Todos', cases: [],
    }
    _commit({ ...state, features: [newFeature, ...state.features] })
    return newId
  },

  updateFeature: (index, field, value) => {
    const { state, _commit } = get()
    const features = state.features.map((f, i) => i === index ? { ...f, [field]: value } : f)
    _commit({ ...state, features })
  },

  removeFeature: (index) => {
    const { state, _commit } = get()
    _commit({ ...state, features: state.features.filter((_, i) => i !== index) })
  },

  updateFeatureExecution: (featureIndex, dayKey, value) => {
    const { state, _commit } = get()
    const f = state.features[featureIndex]
    if (!f) return
    const totalVal = Math.max(0, value)
    const gherkinCount = f.gherkinExecs?.[dayKey] || 0
    let manualVal = totalVal - gherkinCount
    if (manualVal < 0) manualVal = 0
    const manualExecData = { ...f.manualExecData, [dayKey]: manualVal }
    const features = state.features.map((feat, i) =>
      i === featureIndex ? { ...feat, manualExecData } : feat
    )
    _commit({ ...state, features })
  },

  // ── Test Cases ─────────────────────────────────────────────────────────────
  addTestCase: (fi) => {
    const { state, _commit } = get()
    const newCase: TestCase = {
      id: Date.now(),
      name: '', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: '',
    }
    const features = state.features.map((f, i) =>
      i === fi ? { ...f, cases: [...(f.cases ?? []), newCase] } : f
    )
    _commit({ ...state, features })
  },

  updateTestCase: (fi, ci, field, value) => {
    const { state, _commit } = get()
    const features = state.features.map((f, i) => {
      if (i !== fi) return f
      const cases = (f.cases ?? []).map((c, j) => j === ci ? { ...c, [field]: value } : c)
      return { ...f, cases }
    })
    _commit({ ...state, features })
  },

  removeTestCase: (fi, ci) => {
    const { state, _commit } = get()
    const features = state.features.map((f, i) => {
      if (i !== fi) return f
      return { ...f, cases: (f.cases ?? []).filter((_, j) => j !== ci) }
    })
    _commit({ ...state, features })
  },

  duplicateTestCase: (fi, ci) => {
    const { state, _commit } = get()
    const features = state.features.map((f, i) => {
      if (i !== fi) return f
      const cases = [...(f.cases ?? [])]
      const copy = { ...cases[ci], id: Date.now() }
      cases.splice(ci + 1, 0, copy)
      return { ...f, cases }
    })
    _commit({ ...state, features })
  },

  bulkUpdateCases: (fi, indices, field, value) => {
    const { state, _commit } = get()
    const features = state.features.map((f, i) => {
      if (i !== fi) return f
      const cases = (f.cases ?? []).map((c, j) =>
        indices.includes(j) ? { ...c, [field]: value } : c
      )
      return { ...f, cases }
    })
    _commit({ ...state, features })
  },

  // ── Bugs ───────────────────────────────────────────────────────────────────
  addBug: () => {
    const { state, _commit } = get()
    const newBug: Bug = {
      id: `BUG-${String(Date.now()).slice(-6)}`,
      desc: '', feature: '', stack: 'Front', severity: 'Média',
      assignee: '', status: 'Aberto', retests: 0,
      openedAt: state.currentDate,
    }
    _commit({ ...state, bugs: [newBug, ...state.bugs] })
  },

  addBugFull: (data) => {
    const { state, sprintId, _commit } = get()
    const newBug: Bug = {
      ...data,
      id: `BUG-${String(Date.now()).slice(-6)}`,
      retests: 0,
    }
    _commit({ ...state, bugs: [newBug, ...state.bugs] })
    logAudit('sprint', sprintId, 'create', { bug: { old: null, new: newBug.id } })
  },

  updateBug: (index, field, value) => {
    const { state, _commit } = get()
    const bugs = state.bugs.map((b, i) => {
      if (i !== index) return b
      const updated = { ...b, [field]: value }
      if (field === 'status' && value === 'Resolvido' && !updated.resolvedAt) {
        updated.resolvedAt = state.currentDate
      }
      return updated
    })
    _commit({ ...state, bugs })
  },

  removeBug: (index) => {
    const { state, sprintId, _commit } = get()
    const removed = state.bugs[index]
    _commit({ ...state, bugs: state.bugs.filter((_, i) => i !== index) })
    if (removed) logAudit('sprint', sprintId, 'delete', { bug: { old: removed.id, new: null } })
  },

  duplicateBug: (index) => {
    const { state, _commit } = get()
    const copy = { ...structuredClone(state.bugs[index]), id: `BUG-${String(Date.now()).slice(-6)}` }
    const bugs = [...state.bugs]
    bugs.splice(index + 1, 0, copy)
    _commit({ ...state, bugs })
  },

  // ── Blockers ───────────────────────────────────────────────────────────────
  addBlocker: () => {
    const { state, _commit } = get()
    _commit({
      ...state,
      blockers: [...state.blockers, { id: Date.now(), date: state.currentDate, reason: '', hours: 0 }],
    })
  },

  updateBlocker: (index, field, value) => {
    const { state, _commit } = get()
    _commit({
      ...state,
      blockers: state.blockers.map((b, i) => i === index ? { ...b, [field]: value } : b),
    })
  },

  removeBlocker: (index) => {
    const { state, _commit } = get()
    _commit({ ...state, blockers: state.blockers.filter((_, i) => i !== index) })
  },

  // ── Alignments ─────────────────────────────────────────────────────────────
  addAlignment: () => {
    const { state, _commit } = get()
    _commit({
      ...state,
      alignments: [...state.alignments, { id: Date.now(), text: '' }],
    })
  },

  addAlignmentFull: (text) => {
    const { state, _commit } = get()
    _commit({
      ...state,
      alignments: [...state.alignments, { id: Date.now(), text }],
    })
  },

  updateAlignment: (index, value) => {
    const { state, _commit } = get()
    _commit({
      ...state,
      alignments: state.alignments.map((a, i) => i === index ? { ...a, text: value } : a),
    })
  },

  removeAlignment: (index) => {
    const { state, _commit } = get()
    _commit({ ...state, alignments: state.alignments.filter((_, i) => i !== index) })
  },

  // ── Responsibles ───────────────────────────────────────────────────────────
  addResponsible: () => {
    const { state, _commit } = get()
    _commit({
      ...state,
      responsibles: [...(state.responsibles ?? []), { id: Date.now(), role: '', name: '' }],
    })
  },

  updateResponsible: (index, field, value) => {
    const { state, _commit } = get()
    _commit({
      ...state,
      responsibles: (state.responsibles ?? []).map((r, i) => i === index ? { ...r, [field]: value } : r),
    })
  },

  removeResponsible: (index) => {
    const { state, _commit } = get()
    _commit({
      ...state,
      responsibles: (state.responsibles ?? []).filter((_, i) => i !== index),
    })
  },

  // ── Suite Filter ───────────────────────────────────────────────────────────
  toggleSuiteFilter: (suiteId) => {
    const { state, activeSuiteFilter } = get()
    const allIds = state.suites.map((s) => String(s.id))
    let next = new Set(activeSuiteFilter)

    if (next.size === 0) {
      allIds.forEach((id) => next.add(id))
    }

    if (next.has(suiteId)) {
      if (next.size > 1) next.delete(suiteId)
    } else {
      next.add(suiteId)
      if (next.size === allIds.length) next = new Set()
    }

    set({ activeSuiteFilter: next })
  },

  clearSuiteFilter: () => set({ activeSuiteFilter: new Set() }),

  // ── Import features ────────────────────────────────────────────────────────
  importFeatures: (suiteId, newFeatures) => {
    const { state, _commit } = get()
    const now = Date.now()
    const toAdd = newFeatures.map((f, idx) => {
      // Merge into existing feature with same name in same suite, or create new
      const existing = state.features.find(
        (ef) => ef.name.toLowerCase() === f.name.toLowerCase() && String(ef.suiteId) === String(suiteId)
      )
      if (existing) {
        return { ...existing, cases: [...(existing.cases ?? []), ...(f.cases ?? [])] }
      }
      return { ...f, id: now + idx, suiteId }
    })

    // Replace merged features, prepend brand-new ones
    const existingNames = new Set(
      newFeatures
        .map((f) => f.name.toLowerCase())
        .filter((name) =>
          state.features.some(
            (ef) => ef.name.toLowerCase() === name && String(ef.suiteId) === String(suiteId)
          )
        )
    )
    const updatedExisting = state.features.map((ef) => {
      if (String(ef.suiteId) !== String(suiteId)) return ef
      const merged = toAdd.find((a) => a.name.toLowerCase() === ef.name.toLowerCase())
      return merged ?? ef
    })
    const brandNew = toAdd.filter((a) => !existingNames.has(a.name.toLowerCase()))
    _commit({ ...state, features: [...brandNew, ...updatedExisting] })
  },

  // ── Drag-drop reorder ──────────────────────────────────────────────────────
  reorderFeatures: (suiteId, fromDomIdx, toDomIdx) => {
    const { state, _commit } = get()
    const suiteIndices: number[] = []
    state.features.forEach((f, i) => {
      if (String(f.suiteId) === String(suiteId)) suiteIndices.push(i)
    })
    if (fromDomIdx >= suiteIndices.length || toDomIdx >= suiteIndices.length) return
    const ordered = suiteIndices.map((i) => state.features[i])
    const [moved] = ordered.splice(fromDomIdx, 1)
    ordered.splice(toDomIdx, 0, moved)
    const features = [...state.features]
    suiteIndices.forEach((flatIdx, i) => { features[flatIdx] = ordered[i] })
    _commit({ ...state, features })
  },

  // ── Mockup ─────────────────────────────────────────────────────────────────
  setMockupImage: (fi, base64) => {
    const { state, _commit } = get()
    const features = state.features.map((f, i) => i === fi ? { ...f, mockupImage: base64 } : f)
    _commit({ ...state, features })
  },

  removeMockupImage: (fi) => {
    const { state, _commit } = get()
    const features = state.features.map((f, i) => i === fi ? { ...f, mockupImage: '' } : f)
    _commit({ ...state, features })
  },
}))

// ─── Derived selectors ────────────────────────────────────────────────────────

export function getFilteredFeatures(state: SprintState, filter: Set<string>) {
  if (filter.size === 0) return state.features
  return state.features.filter((f) => filter.has(String(f.suiteId)))
}
