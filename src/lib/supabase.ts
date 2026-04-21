import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Fallback placeholder para ambientes sem Supabase (CI, testes unitários, modo offline).
// O client é criado mas todas as chamadas vão falhar silenciosamente — o app opera via localStorage.
const FALLBACK_URL = 'http://localhost:54321'
const FALLBACK_KEY = 'placeholder'

if (!url || !key) {
  if (import.meta.env.DEV) {
    console.warn('[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos. Rodando em modo offline (somente localStorage).')
  }
}

export const supabase = createClient(url || FALLBACK_URL, key || FALLBACK_KEY)
