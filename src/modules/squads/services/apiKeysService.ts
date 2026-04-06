import { supabase } from '@/lib/supabase'

export interface ApiKey {
  id: string
  name: string
  key_prefix: string
  permissions: Record<string, boolean>
  squad_ids: string[]
  expires_at: string | null
  last_used_at: string | null
  is_active: boolean
  created_at: string
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch('/api/v1/api-keys', {
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor. API Keys requer modo colaborativo.')
  const text = await res.text()
  let json: Record<string, unknown>
  try { json = JSON.parse(text) } catch { throw new Error('Resposta inválida do servidor') }
  if (!res.ok) throw new Error((json.error as string) || 'Erro ao listar API keys')
  return (json.data as ApiKey[]) ?? []
}

export async function createApiKey(body: {
  name: string
  permissions: Record<string, boolean>
  squad_ids?: string[]
  expires_in_days?: number | null
}): Promise<{ key: ApiKey; rawToken: string }> {
  const { data: { session } } = await supabase.auth.getSession()

  // Calculate expires_at from expires_in_days
  let expires_at: string | null = null
  if (body.expires_in_days) {
    const d = new Date()
    d.setDate(d.getDate() + body.expires_in_days)
    expires_at = d.toISOString()
  }

  const res = await fetch('/api/v1/api-keys', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({
      name: body.name,
      permissions: body.permissions,
      squad_ids: body.squad_ids ?? [],
      expires_at,
    }),
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor.')
  const text = await res.text()
  let json: Record<string, unknown>
  try { json = JSON.parse(text) } catch { throw new Error('Resposta inválida do servidor') }
  if (!res.ok) throw new Error((json.error as string) || 'Erro ao criar API key')
  return { key: json.data as ApiKey, rawToken: (json.data as Record<string, string>)?.rawToken ?? '' }
}

export async function revokeApiKey(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`/api/v1/api-keys/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session?.access_token}` },
  })
  if (res.status === 503) throw new Error('Supabase não configurado no servidor.')
  if (!res.ok) {
    const text = await res.text()
    let msg = 'Erro ao revogar API key'
    try { const json = JSON.parse(text); msg = (json.error as string) || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
}
