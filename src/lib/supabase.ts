import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !key) {
  console.warn('[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos. Rodando em modo offline (somente localStorage).')
}

export const supabase = createClient(url ?? '', key ?? '')
