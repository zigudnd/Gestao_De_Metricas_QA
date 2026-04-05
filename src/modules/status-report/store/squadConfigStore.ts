import { create } from 'zustand'
import type {
  SquadConfigState, Cerimonia, MembroTime, PeriodoOff, StoryPointsMethod, TipoMembro,
} from '../types/squadConfig.types'
import {
  saveToLocalStorage, loadFromLocalStorage, loadFromServer,
  persistToServer, getDefaultState, normalizeState, initRealtimeSubscription,
} from '../services/squadConfigPersistence'
import { listSquadMembers } from '@/modules/squads/services/squadsService'

// ─── Remote persist queue ────────────────────────────────────────────────────

let _remotePersistTimeout: ReturnType<typeof setTimeout> | null = null
let _remotePersistInFlight = false
let _remotePersistQueued = false
let _cleanupRealtime: (() => void) | null = null
let _lastPersistedAt = ''

async function doPersistToServer(state: SquadConfigState) {
  if (_remotePersistInFlight) { _remotePersistQueued = true; return }
  _remotePersistInFlight = true
  _remotePersistQueued = false
  try {
    await persistToServer(state)
  } catch (e) {
    if (import.meta.env.DEV) console.error('[SquadConfig] Erro ao sincronizar:', e)
  } finally {
    _remotePersistInFlight = false
    if (_remotePersistQueued) queueRemotePersist(state, 2000)
  }
}

function queueRemotePersist(state: SquadConfigState, delay = 700) {
  if (_remotePersistTimeout) clearTimeout(_remotePersistTimeout)
  _remotePersistTimeout = setTimeout(() => doPersistToServer(state), delay)
}

// ─── UID helper ──────────────────────────────────────────────────────────────

function uid(): string {
  return 'sc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface SquadConfigStore extends SquadConfigState {
  isLoading: boolean

  // Lifecycle
  initSquadConfig: (squadId: string) => Promise<void>
  resetSquadConfig: () => void

  // Internal
  _commit: (next: Partial<SquadConfigState>) => void

  // DoR
  addDorItem: (texto: string) => void
  removeDorItem: (index: number) => void
  updateDorItem: (index: number, texto: string) => void

  // DoD
  addDodItem: (texto: string) => void
  removeDodItem: (index: number) => void
  updateDodItem: (index: number, texto: string) => void

  // Acordos
  addAcordo: (texto: string) => void
  removeAcordo: (index: number) => void
  updateAcordo: (index: number, texto: string) => void

  // Cerimonias
  addCerimonia: (c: Omit<Cerimonia, 'id'>) => void
  removeCerimonia: (id: string) => void
  updateCerimonia: (id: string, updates: Partial<Omit<Cerimonia, 'id'>>) => void

  // Story Points
  setStoryPointsMethod: (method: StoryPointsMethod) => void
  setStoryPointsNotas: (notas: string) => void

  // Membros
  addMembro: (m: Omit<MembroTime, 'id' | 'createdAt'>) => void
  removeMembro: (id: string) => void
  updateMembro: (id: string, updates: Partial<MembroTime>) => void

  // Offs
  addOff: (off: Omit<PeriodoOff, 'id' | 'createdAt'>) => void
  removeOff: (id: string) => void
  updateOff: (id: string, updates: Partial<PeriodoOff>) => void
}

const EMPTY: SquadConfigState = {
  squadId: null, dor: [], dod: [], acordos: [], cerimonias: [],
  storyPointsMethod: 'fibonacci', storyPointsNotas: '',
  membros: [], offs: [], updatedAt: '',
}

export const useSquadConfigStore = create<SquadConfigStore>((set, get) => ({
  ...EMPTY,
  isLoading: false,

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  initSquadConfig: async (squadId: string) => {
    set({ isLoading: true })

    let state = await loadFromServer(squadId)
    if (!state) state = loadFromLocalStorage(squadId)
    if (!state) state = getDefaultState(squadId)

    const normalized = normalizeState(state)

    // Merge membros efetivos do squad com temporários salvos
    if (squadId && squadId !== 'default') {
      try {
        const squadMembers = await listSquadMembers(squadId)
        const temporarios = normalized.membros.filter((m) => m.tipo === 'temporario')
        const efetivos: MembroTime[] = squadMembers.map((sm) => {
          // Preservar papel customizado se já existia
          const existing = normalized.membros.find((m) => m.userId === sm.user_id && m.tipo === 'efetivo')
          return {
            id: sm.user_id,
            tipo: 'efetivo' as TipoMembro,
            userId: sm.user_id,
            nome: sm.profile?.display_name ?? '',
            email: sm.profile?.email ?? '',
            papel: existing?.papel || '',
            squadRole: sm.role,
            ativo: true,
            createdAt: sm.created_at,
          }
        })
        normalized.membros = [...efetivos, ...temporarios]
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[SquadConfig] Failed to fetch squad members, keeping existing:', e)
      }
    }

    saveToLocalStorage(normalized)
    queueRemotePersist(normalized)

    set({ ...normalized, isLoading: false })

    if (_cleanupRealtime) _cleanupRealtime()
    _cleanupRealtime = initRealtimeSubscription(squadId, (incoming) => {
      // Ignora echo da nossa própria persistência
      if (incoming.updatedAt && _lastPersistedAt && incoming.updatedAt === _lastPersistedAt) return
      set({ ...incoming })
    })
  },

  resetSquadConfig: () => {
    if (_cleanupRealtime) { _cleanupRealtime(); _cleanupRealtime = null }
    set({ ...EMPTY, isLoading: false })
  },

  // ── Internal commit ────────────────────────────────────────────────────────

  _commit: (next) => {
    const current = get()
    const updatedAt = new Date().toISOString()
    const state: SquadConfigState = {
      squadId: current.squadId,
      dor: next.dor ?? current.dor,
      dod: next.dod ?? current.dod,
      acordos: next.acordos ?? current.acordos,
      cerimonias: next.cerimonias ?? current.cerimonias,
      storyPointsMethod: next.storyPointsMethod ?? current.storyPointsMethod,
      storyPointsNotas: next.storyPointsNotas ?? current.storyPointsNotas,
      membros: next.membros ?? current.membros,
      offs: next.offs ?? current.offs,
      updatedAt,
    }
    saveToLocalStorage(state)
    queueRemotePersist(state)
    _lastPersistedAt = updatedAt
    set({ ...state })
  },

  // ── DoR ────────────────────────────────────────────────────────────────────

  addDorItem: (texto) => {
    const { dor, _commit } = get()
    _commit({ dor: [...dor, texto] })
  },
  removeDorItem: (index) => {
    const { dor, _commit } = get()
    _commit({ dor: dor.filter((_, i) => i !== index) })
  },
  updateDorItem: (index, texto) => {
    const { dor, _commit } = get()
    _commit({ dor: dor.map((item, i) => i === index ? texto : item) })
  },

  // ── DoD ────────────────────────────────────────────────────────────────────

  addDodItem: (texto) => {
    const { dod, _commit } = get()
    _commit({ dod: [...dod, texto] })
  },
  removeDodItem: (index) => {
    const { dod, _commit } = get()
    _commit({ dod: dod.filter((_, i) => i !== index) })
  },
  updateDodItem: (index, texto) => {
    const { dod, _commit } = get()
    _commit({ dod: dod.map((item, i) => i === index ? texto : item) })
  },

  // ── Acordos ────────────────────────────────────────────────────────────────

  addAcordo: (texto) => {
    const { acordos, _commit } = get()
    _commit({ acordos: [...acordos, texto] })
  },
  removeAcordo: (index) => {
    const { acordos, _commit } = get()
    _commit({ acordos: acordos.filter((_, i) => i !== index) })
  },
  updateAcordo: (index, texto) => {
    const { acordos, _commit } = get()
    _commit({ acordos: acordos.map((item, i) => i === index ? texto : item) })
  },

  // ── Cerimonias ─────────────────────────────────────────────────────────────

  addCerimonia: (c) => {
    const { cerimonias, _commit } = get()
    _commit({ cerimonias: [...cerimonias, { ...c, id: uid() }] })
  },
  removeCerimonia: (id) => {
    const { cerimonias, _commit } = get()
    _commit({ cerimonias: cerimonias.filter((c) => c.id !== id) })
  },
  updateCerimonia: (id, updates) => {
    const { cerimonias, _commit } = get()
    _commit({ cerimonias: cerimonias.map((c) => c.id === id ? { ...c, ...updates } : c) })
  },

  // ── Story Points ───────────────────────────────────────────────────────────

  setStoryPointsMethod: (method) => get()._commit({ storyPointsMethod: method }),
  setStoryPointsNotas: (notas) => get()._commit({ storyPointsNotas: notas }),

  // ── Membros ────────────────────────────────────────────────────────────────

  addMembro: (m) => {
    const { membros, _commit } = get()
    const tipo = m.tipo ?? 'temporario'
    _commit({ membros: [...membros, { ...m, tipo, id: uid(), createdAt: new Date().toISOString() }] })
  },
  removeMembro: (id) => {
    const { membros, _commit } = get()
    _commit({ membros: membros.filter((m) => m.id !== id) })
  },
  updateMembro: (id, updates) => {
    const { membros, _commit } = get()
    _commit({ membros: membros.map((m) => m.id === id ? { ...m, ...updates } : m) })
  },

  // ── Offs ───────────────────────────────────────────────────────────────────

  addOff: (off) => {
    const { offs, _commit } = get()
    _commit({ offs: [...offs, { ...off, id: uid(), createdAt: new Date().toISOString() }] })
  },
  removeOff: (id) => {
    const { offs, _commit } = get()
    _commit({ offs: offs.filter((o) => o.id !== id) })
  },
  updateOff: (id, updates) => {
    const { offs, _commit } = get()
    _commit({ offs: offs.map((o) => o.id === id ? { ...o, ...updates } : o) })
  },
}))
