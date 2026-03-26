import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type SquadRole = 'qa_lead' | 'qa' | 'stakeholder'

export interface Squad {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface SquadMember {
  id: string
  squad_id: string
  user_id: string
  role: SquadRole
  created_at: string
  profile?: {
    email: string
    display_name: string
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

export async function createSquad(name: string): Promise<Squad> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  // Usa RPC para inserir squad + membro atomicamente no servidor,
  // evitando problema de RLS no RETURNING antes de o membro existir.
  const { data, error } = await supabase.rpc('create_squad_with_lead', {
    squad_name: name,
    owner_id: user.id,
  })
  if (error) throw new Error(error.message)
  return data as Squad
}

export async function updateSquadName(squadId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('squads')
    .update({ name })
    .eq('id', squadId)
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
    .select('*, profile:profiles(email, display_name)')
    .eq('squad_id', squadId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SquadMember[]
}

export async function inviteMember(squadId: string, email: string, role: SquadRole): Promise<void> {
  // Busca o perfil pelo e-mail
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (profileError || !profile) {
    throw new Error('Usuário não encontrado. Ele precisa criar uma conta primeiro.')
  }

  const { error } = await supabase.from('squad_members').insert({
    squad_id: squadId,
    user_id: profile.id,
    role,
  })

  if (error) {
    if (error.code === '23505') throw new Error('Este usuário já é membro do squad.')
    throw error
  }
}

export async function updateMemberRole(memberId: string, role: SquadRole): Promise<void> {
  const { error } = await supabase
    .from('squad_members')
    .update({ role })
    .eq('id', memberId)
  if (error) throw error
}

export async function removeMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from('squad_members')
    .delete()
    .eq('id', memberId)
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
