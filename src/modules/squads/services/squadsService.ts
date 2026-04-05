import { supabase } from '@/lib/supabase'
import type { Profile } from '@/modules/auth/store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SquadRole = 'qa_lead' | 'qa' | 'stakeholder'

export interface MemberPermissions {
  // Criar
  create_sprints:        boolean
  create_bugs:           boolean
  create_features:       boolean
  create_test_cases:     boolean
  create_suites:         boolean
  create_blockers:       boolean
  create_alignments:     boolean
  create_releases:       boolean
  create_status_reports: boolean
  create_checkpoints:    boolean
  // Editar
  edit_sprints:          boolean
  edit_bugs:             boolean
  edit_features:         boolean
  edit_test_cases:       boolean
  edit_suites:           boolean
  edit_blockers:         boolean
  edit_alignments:       boolean
  edit_releases:         boolean
  edit_status_reports:   boolean
  edit_checkpoints:      boolean
  // Excluir
  delete_sprints:        boolean
  delete_bugs:           boolean
  delete_features:       boolean
  delete_test_cases:     boolean
  delete_suites:         boolean
  delete_blockers:       boolean
  delete_alignments:     boolean
  delete_releases:       boolean
  delete_status_reports: boolean
  delete_checkpoints:    boolean
}

export const DEFAULT_PERMISSIONS: MemberPermissions = {
  create_sprints: true, create_bugs: true, create_features: true, create_test_cases: true,
  create_suites: true, create_blockers: true, create_alignments: true,
  create_releases: true, create_status_reports: true, create_checkpoints: true,
  edit_sprints: true, edit_bugs: true, edit_features: true, edit_test_cases: true,
  edit_suites: true, edit_blockers: true, edit_alignments: true,
  edit_releases: true, edit_status_reports: true, edit_checkpoints: true,
  delete_sprints: false, delete_bugs: false, delete_features: false, delete_test_cases: false,
  delete_suites: false, delete_blockers: false, delete_alignments: false,
  delete_releases: false, delete_status_reports: false, delete_checkpoints: false,
}

export type PermissionGroup = 'create' | 'edit' | 'delete'

export const PERMISSION_GROUPS: { id: PermissionGroup; label: string; color: string }[] = [
  { id: 'create', label: 'Criar', color: 'var(--color-green)' },
  { id: 'edit',   label: 'Editar', color: 'var(--color-blue)' },
  { id: 'delete', label: 'Excluir', color: 'var(--color-red)' },
]

export const PERMISSION_RESOURCES = [
  'sprints', 'bugs', 'features', 'test_cases', 'suites', 'blockers', 'alignments',
  'releases', 'status_reports', 'checkpoints',
] as const

export type PermissionResource = typeof PERMISSION_RESOURCES[number]

export const RESOURCE_LABELS: Record<PermissionResource, string> = {
  sprints:        'Sprints',
  bugs:           'Bugs',
  features:       'Funcionalidades',
  test_cases:     'Casos de Teste',
  suites:         'Suites',
  blockers:       'Bloqueios',
  alignments:     'Alinhamentos',
  releases:       'Releases',
  status_reports: 'Status Reports',
  checkpoints:    'Checkpoints',
}

export const PERMISSION_LABELS: Record<keyof MemberPermissions, string> = {
  create_sprints: 'Criar Sprints', create_bugs: 'Criar Bugs', create_features: 'Criar Funcionalidades',
  create_test_cases: 'Criar Casos de Teste', create_suites: 'Criar Suites',
  create_blockers: 'Criar Bloqueios', create_alignments: 'Criar Alinhamentos',
  create_releases: 'Criar Releases', create_status_reports: 'Criar Status Reports',
  create_checkpoints: 'Criar Checkpoints',
  edit_sprints: 'Editar Sprints', edit_bugs: 'Editar Bugs', edit_features: 'Editar Funcionalidades',
  edit_test_cases: 'Editar Casos de Teste', edit_suites: 'Editar Suites',
  edit_blockers: 'Editar Bloqueios', edit_alignments: 'Editar Alinhamentos',
  edit_releases: 'Editar Releases', edit_status_reports: 'Editar Status Reports',
  edit_checkpoints: 'Editar Checkpoints',
  delete_sprints: 'Excluir Sprints', delete_bugs: 'Excluir Bugs', delete_features: 'Excluir Funcionalidades',
  delete_test_cases: 'Excluir Casos de Teste', delete_suites: 'Excluir Suites',
  delete_blockers: 'Excluir Bloqueios', delete_alignments: 'Excluir Alinhamentos',
  delete_releases: 'Excluir Releases', delete_status_reports: 'Excluir Status Reports',
  delete_checkpoints: 'Excluir Checkpoints',
}

export interface Squad {
  id: string
  name: string
  description: string
  color: string
  created_by: string
  created_at: string
  member_count?: number
  archived?: boolean
}

export interface SquadMember {
  id: string
  squad_id: string
  user_id: string
  role: SquadRole
  permissions: MemberPermissions
  created_at: string
  profile?: {
    email: string
    display_name: string
    global_role: 'admin' | 'gerente' | 'user'
  }
}

// ─── Supabase aggregation/join types ──────────────────────────────────────────

interface SquadWithCount {
  id: string
  name: string
  description: string
  color: string
  created_by: string
  created_at: string
  archived?: boolean
  squad_members: { count: number }[]
}

interface MembershipWithSquad {
  user_id: string
  squad_id: string
  role: string
  squad: { name: string } | null
}

// ─── Squads ───────────────────────────────────────────────────────────────────

export async function listMySquads(includeArchived = false): Promise<Squad[]> {
  const { data, error } = await supabase
    .from('squads')
    .select('*, squad_members(count)')
    .order('created_at', { ascending: true })
  if (error) throw error
  const mapped = (data ?? []).map((s) => ({
    ...s,
    member_count: (s as unknown as SquadWithCount).squad_members?.[0]?.count ?? 0,
    squad_members: undefined,
  })) as Squad[]
  // Enriquecer com fallback local para archived
  const archivedLocal = getArchivedLocal()
  const enriched = mapped.map((s) => ({
    ...s,
    archived: s.archived ?? archivedLocal.has(s.id),
  }))
  if (!includeArchived) {
    return enriched.filter((s) => !s.archived)
  }
  return enriched
}

export async function listArchivedSquads(): Promise<Squad[]> {
  const all = await listMySquads(true)
  return all.filter((s) => s.archived === true)
}

export async function archiveSquad(squadId: string): Promise<void> {
  try {
    const { error } = await supabase.from('squads').update({ archived: true }).eq('id', squadId)
    if (error) {
      // Coluna archived pode não existir ainda — salvar no localStorage como fallback
      if (error.message.includes('archived')) {
        saveArchivedLocal(squadId, true)
        return
      }
      throw error
    }
  } catch (e) {
    throw e  // Don't save local state on network/RLS errors
  }
}

export async function unarchiveSquad(squadId: string): Promise<void> {
  try {
    const { error } = await supabase.from('squads').update({ archived: false }).eq('id', squadId)
    if (error) {
      if (error.message.includes('archived')) {
        saveArchivedLocal(squadId, false)
        return
      }
      throw error
    }
  } catch (e) {
    throw e  // Don't save local state on network/RLS errors
  }
}

// Fallback local para quando a coluna archived ainda não existe no banco
const ARCHIVED_LS_KEY = 'archivedSquadIds'

function getArchivedLocal(): Set<string> {
  try {
    const raw = localStorage.getItem(ARCHIVED_LS_KEY)
    return new Set(raw ? JSON.parse(raw) : [])
  } catch (e) { if (import.meta.env.DEV) console.warn('[Squads] Failed to load archived squads from localStorage:', e); return new Set() }
}

function saveArchivedLocal(squadId: string, archived: boolean): void {
  const set = getArchivedLocal()
  if (archived) set.add(squadId)
  else set.delete(squadId)
  localStorage.setItem(ARCHIVED_LS_KEY, JSON.stringify([...set]))
}

export function isArchivedLocal(squadId: string): boolean {
  return getArchivedLocal().has(squadId)
}

export async function createSquad(name: string, description = '', color = '#185FA5'): Promise<Squad> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const { data, error } = await supabase.rpc('create_squad_with_lead', {
    squad_name: name,
    owner_id: user.id,
    squad_desc: description,
    squad_color: color,
  })
  if (error) throw new Error(error.message)
  return data as Squad
}

export async function updateSquad(squadId: string, fields: { name?: string; description?: string; color?: string }): Promise<void> {
  const { error } = await supabase.from('squads').update(fields).eq('id', squadId)
  if (error) throw error
}

export async function deleteSquad(squadId: string): Promise<void> {
  const { error } = await supabase.from('squads').delete().eq('id', squadId)
  if (error) throw error
}

// ─── Squad Members ────────────────────────────────────────────────────────────

export async function listSquadMembers(squadId: string): Promise<SquadMember[]> {
  const { data, error } = await supabase
    .from('squad_members')
    .select('*, profile:profiles(email, display_name, global_role)')
    .eq('squad_id', squadId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SquadMember[]
}

export async function addMember(
  squadId: string,
  userId: string,
  role: SquadRole,
  permissions: MemberPermissions,
): Promise<void> {
  const { error } = await supabase.from('squad_members').insert({
    squad_id: squadId,
    user_id: userId,
    role,
    permissions,
  })
  if (error) {
    if (error.code === '23505') throw new Error('Este usuário já é membro do squad.')
    throw new Error(error.message)
  }
}

export async function updateMemberRole(memberId: string, role: SquadRole): Promise<void> {
  const { error } = await supabase.from('squad_members').update({ role }).eq('id', memberId)
  if (error) throw error
}

export async function updateMemberPermissions(memberId: string, permissions: MemberPermissions): Promise<void> {
  const { error } = await supabase.from('squad_members').update({ permissions }).eq('id', memberId)
  if (error) throw new Error(error.message)
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase.from('squad_members').delete().eq('id', memberId)
  if (error) throw error
}

export async function getMyRole(squadId: string): Promise<SquadRole | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('squad_members')
    .select('role')
    .eq('squad_id', squadId)
    .eq('user_id', user.id)
    .single()
  return (data?.role as SquadRole) ?? null
}

// ─── Users (admin) ────────────────────────────────────────────────────────────

export interface UserWithSquads extends Profile {
  active: boolean
  squads: { squad_id: string; squad_name: string; role: SquadRole }[]
}

export async function createUser(email: string, displayName: string): Promise<{ id: string; email: string }> {
  // Client-side validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) throw new Error('Formato de email inválido')
  if (!displayName.trim()) throw new Error('Nome é obrigatório')

  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ email, display_name: displayName }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao criar usuário')
  return data
}

export async function listAllUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, display_name, global_role')
    .order('display_name', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as Profile[]
}

export async function listAllUsersWithSquads(): Promise<UserWithSquads[]> {
  const { data: users, error: usersErr } = await supabase
    .from('profiles')
    .select('id, email, display_name, global_role, active')
    .order('display_name', { ascending: true })
  if (usersErr) throw new Error(usersErr.message)

  const { data: memberships, error: memErr } = await supabase
    .from('squad_members')
    .select('user_id, squad_id, role, squad:squads(name)')
  if (memErr) throw new Error(memErr.message)

  return (users ?? []).map((u) => {
    const userMemberships = (memberships ?? [])
      .filter((m) => m.user_id === u.id)
      .map((m) => ({
        squad_id: m.squad_id,
        squad_name: (m as unknown as MembershipWithSquad).squad?.name ?? '',
        role: m.role as SquadRole,
      }))
    return { ...u, active: u.active ?? true, squads: userMemberships } as UserWithSquads
  })
}

export async function updateUserProfile(userId: string, fields: { display_name?: string; global_role?: 'admin' | 'gerente' | 'user' }): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function toggleUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function resetUserPassword(userId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/admin/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ user_id: userId }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao resetar senha')
}

/** Retorna os squad_ids do usuário logado (para filtrar sprints na Home) */
export async function getMySquadIds(): Promise<string[]> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('squad_members')
    .select('squad_id')
    .eq('user_id', user.id)
  if (error) return []
  return (data ?? []).map((r) => r.squad_id)
}

// ─── Permission Profiles ─────────────────────────────────────────────────────

export interface PermissionProfile {
  id: string
  name: string
  description: string
  permissions: MemberPermissions
  is_system: boolean
  created_at: string
}

export async function listPermissionProfiles(): Promise<PermissionProfile[]> {
  const { data, error } = await supabase
    .from('permission_profiles')
    .select('*')
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as PermissionProfile[]
}

export async function createPermissionProfile(
  name: string,
  description: string,
  permissions: MemberPermissions,
): Promise<PermissionProfile> {
  const { data: { user } } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('permission_profiles')
    .insert({ name, description, permissions, created_by: user?.id })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as PermissionProfile
}

export async function updatePermissionProfile(
  id: string,
  name: string,
  description: string,
  permissions: MemberPermissions,
): Promise<void> {
  const { error } = await supabase
    .from('permission_profiles')
    .update({ name, description, permissions })
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deletePermissionProfile(id: string): Promise<void> {
  const { error } = await supabase
    .from('permission_profiles')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

