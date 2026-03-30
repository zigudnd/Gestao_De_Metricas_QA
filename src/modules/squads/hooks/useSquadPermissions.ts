import { useAuthStore } from '@/modules/auth/store/authStore'
import { useActiveSquadStore } from '../store/activeSquadStore'
import type { MemberPermissions, SquadRole } from '../services/squadsService'

export interface SquadPermissions {
  canEdit: boolean
  canDelete: (resource: keyof MemberPermissions) => boolean
  canManageMembers: boolean
  isReadOnly: boolean
  isPrivileged: boolean
  role: SquadRole | null
  permissions: MemberPermissions
  activeSquadId: string | null
}

export function useSquadPermissions(): SquadPermissions {
  const globalRole = useAuthStore((s) => s.profile?.global_role)
  const { activeSquadId, myRole, myPermissions, canEdit, canDelete, canManageMembers, isReadOnly, isPrivileged } = useActiveSquadStore()

  return {
    canEdit: canEdit(globalRole),
    canDelete: (resource) => canDelete(globalRole, resource),
    canManageMembers: canManageMembers(globalRole),
    isReadOnly: isReadOnly(globalRole),
    isPrivileged: isPrivileged(globalRole),
    role: myRole,
    permissions: myPermissions,
    activeSquadId,
  }
}
