import { supabase } from '@/lib/supabase'
import type { Profile } from '@/modules/auth/store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SquadRole = 'qa_lead' | 'qa' | 'stakeholder'

export interface MemberPermissions {
  delete_sprints:    boolean
  delete_bugs:       boolean
  delete_features:   boolean
  delete_test_cases: boolean
  delete_suites:     boolean
  delete_blockers:   boolean
  delete_alignments: boolean
}

export const DEFAULT_PERMISSIONS: MemberPermissions = {
  delete_sprints:    false,
  delete_bugs:       false,
  delete_features:   false,
  delete_test_cases: false,
  delete_suites:     false,
  delete_blockers:   false,
  delete_alignments: false,
}

export const PERMISSION_LABELS: Record<keyof MemberPermissions, string> = {
  delete_sprints:    'Excluir Sprints',
  delete_bugs:       'Excluir Bugs',
  delete_features:   'Excluir Funcionalidades',
  delete_test_cases: 'Excluir Casos de Teste',
  delete_suites:     'Excluir Suites',
  delete_blockers:   'Excluir Bloqueios',
  delete_alignments: 'Excluir Alinhamentos',
}

export interface Squad {
  id: string
  name: string
  description: string
  color: string
  created_by: string
  created_at: string
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
    global_role: 'admin' | 'user'
  }
}

// ─── Squads ───────────────────────────────────────────────────────────────────

export async function listMySquads(): Promise<Squad[]> {
  const { data, error } = await supabase
    .from('squads')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
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
  const res = await fetch('/api/admin/create-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
        squad_name: (m.squad as unknown as { name: string })?.name ?? '',
        role: m.role as SquadRole,
      }))
    return { ...u, active: u.active ?? true, squads: userMemberships } as UserWithSquads
  })
}

export async function updateUserProfile(userId: string, fields: { display_name?: string; global_role?: 'admin' | 'user' }): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId)
  if (error) throw new Error(error.message)
}

export async function toggleUserActive(userId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('profiles').update({ active }).eq('id', userId)
  if (error) throw new Error(error.message)
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

export async function setGlobalRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ global_role: role })
    .eq('id', userId)
  if (error) throw new Error(error.message)
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

// ─── Legacy (mantém compatibilidade com código antigo) ───────────────────────
/** @deprecated use addMember */
export async function inviteMember(squadId: string, email: string, role: SquadRole): Promise<void> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()
  if (profileError || !profile) throw new Error('Usuário não encontrado.')
  await addMember(squadId, profile.id, role, { ...DEFAULT_PERMISSIONS })
}
