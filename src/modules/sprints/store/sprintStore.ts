import { create } from 'zustand'
import type {
  SprintState, Feature, Bug, Blocker, Alignment,
  TestCase, Suite, SprintConfig, Notes, ResponsiblePerson,
} from '../types/sprint.types'
import {
  computeFields, saveToStorage, upsertSprintInMasterIndex,
  DEFAULT_STATE, normalizeState,
} from '../services/persistence'

// ─── Remote persist queue ─────────────────────────────────────────────────────

let _remotePersistTimeout: ReturnType<typeof setTimeout> | null = null
let _remotePersistInFlight = false
let _remotePersistQueued = false

async function doPersistToServer(sprintId: string, state: SprintState) {
  if (!sprintId) return
  if (_remotePersistInFlight) { _remotePersistQueued = true; return }
  _remotePersistInFlight = true
  _remotePersistQueued = false
  try {
    await fetch(`/api/dashboard/${sprintId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payload: state }),
    })
  } catch (e) {
    console.error('Erro ao sincronizar com servidor:', e)
  } finally {
    _remotePersistInFlight = false
    if (_remotePersistQueued) queueRemotePersist(sprintId, state, 2000)
  }
}

function queueRemotePersist(sprintId: string, state: SprintState, delay = 700) {
  if (_remotePersistTimeout) clearTimeout(_remotePersistTimeout)
  _remotePersistTimeout = setTimeout(() => doPersistToServer(sprintId, state), delay)
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
  updateConfig: (field: keyof SprintConfig, value: string | number) => void

  // Notes & reports
  updateNotes: (field: keyof Notes, value: string) => void
  updateReportText: (date: string, value: string) => void

  // Suites
  addSuite: () => void
  updateSuite: (index: number, field: keyof Suite, value: string) => void
  removeSuite: (index: number) => void

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
  state: JSON.parse(JSON.stringify(DEFAULT_STATE)),
  activeSuiteFilter: new Set(),
  lastSaved: 0,

  initSprint: (sprintId, loaded) => {
    const normalized = normalizeState(loaded)
    const computed = computeFields(normalized)
    set({ sprintId, state: computed, activeSuiteFilter: new Set() })
  },

  resetSprint: () => {
    set({ sprintId: '', state: JSON.parse(JSON.stringify(DEFAULT_STATE)), activeSuiteFilter: new Set() })
  },

  _commit: (next) => {
    const computed = computeFields(next)
    const { sprintId } = get()
    saveToStorage(sprintId, computed)
    upsertSprintInMasterIndex(sprintId, computed)
    queueRemotePersist(sprintId, computed)
    set({ state: computed, lastSaved: Date.now() })
  },

  // ── Config ─────────────────────────────────────────────────────────────────
  updateConfig: (field, value) => {
    const { state, _commit } = get()
    const config = { ...state.config, [field]: value }
    // auto-calc sprintDays from dates
    if ((field === 'startDate' || field === 'endDate') && config.startDate && config.endDate) {
      const diff = Math.round(
        (new Date(config.endDate + 'T00:00:00').getTime() - new Date(config.startDate + 'T00:00:00').getTime())
        / (1000 * 60 * 60 * 24)
      ) + 1
      if (diff > 0) config.sprintDays = diff
    }
    _commit({ ...state, config })
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
    const { state, _commit } = get()
    const newBug: Bug = {
      id: `BUG-${String(Date.now()).slice(-6)}`,
      retests: 0,
      ...data,
    }
    _commit({ ...state, bugs: [newBug, ...state.bugs] })
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
    const { state, _commit } = get()
    _commit({ ...state, bugs: state.bugs.filter((_, i) => i !== index) })
  },

  duplicateBug: (index) => {
    const { state, _commit } = get()
    const copy = { ...state.bugs[index], id: `BUG-${String(Date.now()).slice(-6)}` }
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
