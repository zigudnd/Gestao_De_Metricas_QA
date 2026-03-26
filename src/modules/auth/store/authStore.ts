import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  display_name: string
}

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  profile: Profile | null
  setSession: (session: Session | null) => void
  updateDisplayName: (name: string) => Promise<void>
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
    if (!user) return
    await supabase.from('profiles').update({ display_name: name }).eq('id', user.id)
    set((s) => ({ profile: s.profile ? { ...s.profile, display_name: name } : s.profile }))
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null, profile: null })
  },
}))

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function loadProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('id', userId)
    .single()
  if (data) {
    useAuthStore.setState({ profile: data as Profile })
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
