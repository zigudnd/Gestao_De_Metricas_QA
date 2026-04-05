import { create } from 'zustand'
import type {
  StatusReportItem, StatusReportConfig, SectionId,
  StatusReportState, SectionDef,
} from '../types/statusReport.types'
import { DEFAULT_SECTIONS } from '../types/statusReport.types'
import {
  saveToLocalStorage, upsertMasterIndex, persistToServer,
  loadFromLocalStorage, loadFromServer, normalizeState,
  createDefaultState, initRealtimeSubscription,
} from '../services/statusReportPersistence'
import { SEED_ITEMS } from './seedData'
import { logAudit } from '@/lib/auditService'

// ─── Remote persist queue ────────────────────────────────────────────────────

let _remotePersistTimeout: ReturnType<typeof setTimeout> | null = null
let _remotePersistInFlight = false
let _remotePersistQueued = false
let _cleanupRealtime: (() => void) | null = null
let _lastPendingState: StatusReportState | null = null
let _lastPendingSquadId: string | null = null
let _lastPersistedAt: string | null = null

// ─── Active squad helper ──────────────────────────────────────────────────────

function getActiveSquadId(): string | null {
  try {
    const saved = localStorage.getItem('activeSquadId')
    return saved || null
  } catch { return null }
}

async function doPersistToServer(state: StatusReportState, squadId?: string | null, updatedAt?: string) {
  if (_remotePersistInFlight) { _remotePersistQueued = true; return }
  _remotePersistInFlight = true
  _remotePersistQueued = false
  _lastPendingState = null
  _lastPendingSquadId = null
  try {
    await persistToServer(state, squadId ?? undefined, updatedAt)
  } catch (e) {
    if (import.meta.env.DEV) console.error('[StatusReport] Erro ao sincronizar:', e)
    _lastPendingState = state // guardar para flush no beforeunload
  } finally {
    _remotePersistInFlight = false
    if (_remotePersistQueued && _lastPendingState) {
      queueRemotePersist(_lastPendingState, 2000, squadId)
    } else if (_remotePersistQueued) {
      queueRemotePersist(state, 2000, squadId)
    }
  }
}

function queueRemotePersist(state: StatusReportState, delay = 2500, squadId?: string | null, updatedAt?: string) {
  if (_remotePersistTimeout) clearTimeout(_remotePersistTimeout)
  _lastPendingState = state
  _lastPendingSquadId = squadId ?? null
  _remotePersistTimeout = setTimeout(() => doPersistToServer(state, squadId, updatedAt), delay)
}

// Flush pendente antes de fechar a aba (Risco 1: crash perde dados)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (_lastPendingState) {
      // sendBeacon para garantir envio mesmo ao fechar
      const payload = JSON.stringify({
        id: _lastPendingState.id,
        data: _lastPendingState,
        squad_id: _lastPendingSquadId || null,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      const blob = new Blob([payload], { type: 'application/json' })
      navigator.sendBeacon?.('/api/status-report-flush', blob)
    }
  })
}

// ─── Cycle detection helper ─────────────────────────────────────────────────

/** Verifica se adicionar depId como predecessor de itemId cria ciclo */
function wouldCreateCycle(items: StatusReportItem[], itemId: string, depId: string): boolean {
  // DFS: a partir de depId, seguir dependsOn. Se chegar em itemId, é ciclo.
  const visited = new Set<string>()
  const stack = [depId]
  while (stack.length > 0) {
    const current = stack.pop()!
    if (current === itemId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const item = items.find((i) => i.id === current)
    if (item) {
      for (const dep of item.dependsOn) {
        stack.push(dep)
      }
    }
  }
  return false
}

// ─── Store ───────────────────────────────────────────────────────────────────

type TabId = 'editor' | 'preview' | 'gantt'

interface StatusReportStore {
  // Data
  reportId: string | null
  config: StatusReportConfig
  sections: SectionDef[]
  items: StatusReportItem[]
  createdAt: string

  // UI
  collapsedSections: Set<SectionId>
  currentTab: TabId
  selectedItemId: string | null
  isAddFormOpen: boolean

  // Status
  isLoading: boolean
  isSaving: boolean
  lastSyncedAt: string | null

  // Lifecycle
  initReport: (reportId: string) => Promise<void>
  resetReport: () => void

  // Internal commit
  _commit: (next: Partial<StatusReportState>) => void

  // CRUD items
  addItem: (item: Omit<StatusReportItem, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateItem: (id: string, updates: Partial<StatusReportItem>) => void
  deleteItem: (id: string) => void

  // Move between sections
  moveItemToSection: (id: string, targetSection: SectionId) => void

  // Dependencies
  addDependency: (itemId: string, dependsOnId: string) => void
  removeDependency: (itemId: string, dependsOnId: string) => void

  // Sections
  addSection: (section: SectionDef) => void
  updateSection: (id: SectionId, updates: Partial<SectionDef>) => void
  removeSection: (id: SectionId) => void
  reorderSections: (fromIdx: number, toIdx: number) => void

  // Config
  updateConfig: (updates: Partial<StatusReportConfig>) => void

  // UI
  toggleSection: (sectionId: SectionId) => void
  setTab: (tab: TabId) => void
  setSelectedItem: (id: string | null) => void
  setAddFormOpen: (open: boolean) => void
}

const EMPTY_CONFIG: StatusReportConfig = { title: '', date: '', squad: '', period: '', periodStart: '', periodEnd: '' }

export const useStatusReportStore = create<StatusReportStore>((set, get) => ({
  reportId: null,
  config: { ...EMPTY_CONFIG },
  sections: [...DEFAULT_SECTIONS],
  items: [],
  createdAt: '',
  collapsedSections: new Set(),
  currentTab: 'editor',
  selectedItemId: null,
  isAddFormOpen: false,
  isLoading: false,
  isSaving: false,
  lastSyncedAt: null,

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  initReport: async (reportId: string) => {
    set({ isLoading: true })

    let state = await loadFromServer(reportId)
    if (!state) state = loadFromLocalStorage(reportId)

    if (!state) {
      // New report — seed with demo data only if it's the very first one
      const now = new Date().toISOString()
      const isSeed = reportId.startsWith('sr_seed')
      const seeded: StatusReportItem[] = isSeed
        ? SEED_ITEMS.map((s) => ({ ...s, createdAt: now, updatedAt: now }))
        : []
      state = { ...createDefaultState(reportId), items: seeded, createdAt: now, updatedAt: now }
    }

    const normalized = normalizeState(state)
    saveToLocalStorage(normalized)
    upsertMasterIndex(normalized)
    queueRemotePersist(normalized, 2500, getActiveSquadId())

    set({
      reportId: normalized.id,
      config: normalized.config,
      sections: normalized.sections,
      items: normalized.items,
      createdAt: normalized.createdAt,
      isLoading: false,
      lastSyncedAt: normalized.updatedAt,
    })

    // Realtime
    if (_cleanupRealtime) _cleanupRealtime()
    _cleanupRealtime = initRealtimeSubscription(reportId, (incoming) => {
      // Ignora echo da nossa própria persistência
      if (incoming.updatedAt && incoming.updatedAt === _lastPersistedAt) return
      set({
        config: incoming.config,
        sections: incoming.sections,
        items: incoming.items,
        lastSyncedAt: incoming.updatedAt,
      })
    })
  },

  resetReport: () => {
    if (_cleanupRealtime) {
      _cleanupRealtime()
      _cleanupRealtime = null
    }
    set({
      reportId: null,
      config: { ...EMPTY_CONFIG },
      sections: [...DEFAULT_SECTIONS],
      items: [],
      createdAt: '',
      collapsedSections: new Set(),
      currentTab: 'editor',
      selectedItemId: null,
      isAddFormOpen: false,
      isLoading: false,
      isSaving: false,
      lastSyncedAt: null,
    })
  },

  // ── Internal commit ────────────────────────────────────────────────────────

  _commit: (next) => {
    const { reportId, config, sections, items, createdAt } = get()
    if (!reportId) return
    const updatedAt = new Date().toISOString()
    const state: StatusReportState = {
      id: reportId,
      config: next.config ?? config,
      sections: next.sections ?? sections,
      items: next.items ?? items,
      createdAt: createdAt || updatedAt,
      updatedAt,
    }
    saveToLocalStorage(state)
    upsertMasterIndex(state)
    queueRemotePersist(state, 2500, getActiveSquadId(), updatedAt)
    _lastPersistedAt = updatedAt
    set({
      config: state.config,
      sections: state.sections,
      items: state.items,
      lastSyncedAt: updatedAt,
    })
  },

  // ── CRUD items ─────────────────────────────────────────────────────────────

  addItem: (data) => {
    const { items, reportId, _commit } = get()
    const now = new Date().toISOString()
    const newItem: StatusReportItem = {
      ...data,
      id: 'sr_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      createdAt: now,
      updatedAt: now,
    }
    _commit({ items: [...items, newItem] })
    logAudit('status_report', reportId ?? '', 'create', { item: { old: null, new: newItem.title } })
  },

  updateItem: (id, updates) => {
    const { items, _commit } = get()
    const updated = items.map((item) =>
      item.id === id
        ? { ...item, ...updates, updatedAt: new Date().toISOString() }
        : item,
    )
    _commit({ items: updated })
  },

  deleteItem: (id) => {
    const { items, reportId, _commit } = get()
    const deleted = items.find((item) => item.id === id)
    const filtered = items
      .filter((item) => item.id !== id)
      .map((item) => ({
        ...item,
        dependsOn: item.dependsOn.filter((depId) => depId !== id),
      }))
    _commit({ items: filtered })
    const { selectedItemId } = get()
    if (selectedItemId === id) set({ selectedItemId: null })
    if (deleted) logAudit('status_report', reportId ?? '', 'delete', { item: { old: deleted.title, new: null } })
  },

  // ── Move between sections ──────────────────────────────────────────────────

  moveItemToSection: (id, targetSection) => {
    const { items, _commit } = get()
    const updated = items.map((item) =>
      item.id === id
        ? { ...item, section: targetSection, updatedAt: new Date().toISOString() }
        : item,
    )
    _commit({ items: updated })
  },

  // ── Dependencies ───────────────────────────────────────────────────────────

  addDependency: (itemId, dependsOnId) => {
    const { items, _commit } = get()
    // Previne ciclo antes de criar (Risco 4)
    if (wouldCreateCycle(items, itemId, dependsOnId)) {
      if (import.meta.env.DEV) console.warn(`[StatusReport] Dependência bloqueada: ${dependsOnId} → ${itemId} criaria ciclo`)
      return
    }
    const updated = items.map((item) => {
      if (item.id !== itemId) return item
      if (item.dependsOn.includes(dependsOnId)) return item
      return { ...item, dependsOn: [...item.dependsOn, dependsOnId], updatedAt: new Date().toISOString() }
    })
    _commit({ items: updated })
  },

  removeDependency: (itemId, dependsOnId) => {
    const { items, _commit } = get()
    const updated = items.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        dependsOn: item.dependsOn.filter((id) => id !== dependsOnId),
        updatedAt: new Date().toISOString(),
      }
    })
    _commit({ items: updated })
  },

  // ── Sections ────────────────────────────────────────────────────────────────

  addSection: (section) => {
    const { sections, _commit } = get()
    _commit({ sections: [...sections, section] })
  },

  updateSection: (id, updates) => {
    const { sections, _commit } = get()
    _commit({ sections: sections.map((s) => s.id === id ? { ...s, ...updates } : s) })
  },

  removeSection: (id) => {
    const { sections, items, _commit } = get()
    // Move items from removed section to first remaining section
    const remaining = sections.filter((s) => s.id !== id)
    if (remaining.length === 0) return // can't remove last section
    const fallbackId = remaining[0].id
    const updated = items.map((item) =>
      item.section === id ? { ...item, section: fallbackId } : item,
    )
    _commit({ sections: remaining, items: updated })
  },

  reorderSections: (fromIdx, toIdx) => {
    const { sections, _commit } = get()
    const arr = [...sections]
    const [moved] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, moved)
    _commit({ sections: arr })
  },

  // ── Config ─────────────────────────────────────────────────────────────────

  updateConfig: (updates) => {
    const { config, _commit } = get()
    _commit({ config: { ...config, ...updates } })
  },

  // ── UI ─────────────────────────────────────────────────────────────────────

  toggleSection: (sectionId) => {
    const { collapsedSections } = get()
    const next = new Set(collapsedSections)
    if (next.has(sectionId)) next.delete(sectionId)
    else next.add(sectionId)
    set({ collapsedSections: next })
  },

  setTab: (tab) => set({ currentTab: tab }),
  setSelectedItem: (id) => set({ selectedItemId: id }),
  setAddFormOpen: (open) => set({ isAddFormOpen: open }),
}))
