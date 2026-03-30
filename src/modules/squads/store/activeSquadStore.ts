import { create } from 'zustand'
import type { Squad, SquadRole, MemberPermissions } from '../services/squadsService'
import { listMySquads, getMyRole, listSquadMembers, DEFAULT_PERMISSIONS } from '../services/squadsService'
import type { GlobalRole } from '@/modules/auth/store/authStore'

const LS_KEY = 'activeSquadId'

interface ActiveSquadState {
  squads: Squad[]
  activeSquadId: string | null
  myRole: SquadRole | null
  myPermissions: MemberPermissions
  isLoading: boolean

  // Actions
  loadSquads: () => Promise<void>
  setActiveSquad: (squadId: string) => Promise<void>

  // Derived (call after setActiveSquad)
  isPrivileged: (globalRole: GlobalRole | undefined) => boolean
  canEdit: (globalRole: GlobalRole | undefined) => boolean
  canDelete: (globalRole: GlobalRole | undefined, resource: keyof MemberPermissions) => boolean
  canManageMembers: (globalRole: GlobalRole | undefined) => boolean
  isReadOnly: (globalRole: GlobalRole | undefined) => boolean
}

export const useActiveSquadStore = create<ActiveSquadState>((set, get) => ({
  squads: [],
  activeSquadId: null,
  myRole: null,
  myPermissions: { ...DEFAULT_PERMISSIONS },
  isLoading: false,

  loadSquads: async () => {
    set({ isLoading: true })
    try {
      const squads = await listMySquads()
      const savedId = localStorage.getItem(LS_KEY)
      const validSaved = squads.find((s) => s.id === savedId)

      // Auto-select: saved > first > null
      const activeId = validSaved?.id ?? squads[0]?.id ?? null

      set({ squads, isLoading: false })
      if (activeId) await get().setActiveSquad(activeId)
      else set({ activeSquadId: null, myRole: null, myPermissions: { ...DEFAULT_PERMISSIONS } })
    } catch {
      set({ squads: [], isLoading: false })
    }
  },

  setActiveSquad: async (squadId: string) => {
    localStorage.setItem(LS_KEY, squadId)
    set({ activeSquadId: squadId })

    try {
      const role = await getMyRole(squadId)
      let permissions = { ...DEFAULT_PERMISSIONS }

      if (role) {
        const members = await listSquadMembers(squadId)
        const me = members.find((m) => m.role === role)
        if (me) permissions = me.permissions
      }

      set({ myRole: role, myPermissions: permissions })
    } catch {
      set({ myRole: null, myPermissions: { ...DEFAULT_PERMISSIONS } })
    }
  },

  // Admin e Gerente ignoram restrições de squad
  isPrivileged: (globalRole) => globalRole === 'admin' || globalRole === 'gerente',

  canEdit: (globalRole) => {
    if (globalRole === 'admin' || globalRole === 'gerente') return true
    const { myRole } = get()
    return myRole === 'qa_lead' || myRole === 'qa'
  },

  canDelete: (globalRole, resource) => {
    if (globalRole === 'admin' || globalRole === 'gerente') return true
    const { myRole, myPermissions } = get()
    if (myRole === 'qa_lead') return true
    if (myRole === 'qa') return myPermissions[resource] === true
    return false
  },

  canManageMembers: (globalRole) => {
    if (globalRole === 'admin' || globalRole === 'gerente') return true
    return get().myRole === 'qa_lead'
  },

  isReadOnly: (globalRole) => {
    if (globalRole === 'admin' || globalRole === 'gerente') return false
    return get().myRole === 'stakeholder'
  },
}))
