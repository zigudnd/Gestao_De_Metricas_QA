import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GlobalRole = 'admin' | 'gerente' | 'user'

export interface Profile {
  id: string
  email: string
  display_name: string
  global_role: GlobalRole
}

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  profile: Profile | null
  setSession: (session: Session | null) => void
  updateDisplayName: (name: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  profile: null,

  setSession: (session) =>
    set({ session, user: session?.user ?? null }),

  updateDisplayName: async (name: string) => {
    const { user } = get()
    if (!user) return { error: new Error('Usuário não autenticado.') }
    const { error } = await supabase.from('profiles').update({ display_name: name }).eq('id', user.id)
    if (error) {
      const err = new Error(error.message)
      throw err
    }
    set((s) => ({ profile: s.profile ? { ...s.profile, display_name: name } : s.profile }))
    return { error: null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function loadProfile(userId: string) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, display_name, global_role')
      .eq('id', userId)
      .single()
    if (data) {
      useAuthStore.setState({ profile: data as Profile })
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Auth] Failed to load profile:', e)
  }
}

// Carrega sessão existente (ex: volta de F5)
supabase.auth.getSession().then(({ data: { session } }) => {
  useAuthStore.setState({ session, user: session?.user ?? null, loading: false })
  if (session?.user) loadProfile(session.user.id)
})

// Escuta mudanças de sessão (login, logout, refresh de token)
supabase.auth.onAuthStateChange((_event, session) => {
  useAuthStore.setState({ session, user: session?.user ?? null, loading: false })
  if (session?.user) {
    loadProfile(session.user.id)
  } else {
    useAuthStore.setState({ profile: null })
  }
})
