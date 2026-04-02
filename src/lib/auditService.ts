import { supabase } from './supabase'

export interface AuditEntry {
  id: string
  user_id: string | null
  user_email: string | null
  resource_type: string
  resource_id: string
  action: string
  changes: Record<string, { old: unknown; new: unknown }>
  created_at: string
}

/**
 * Registra uma ação no audit log via RPC (anti-forging).
 * O servidor garante que user_id = auth.uid() — não pode ser forjado pelo client.
 * Fire-and-forget — não bloqueia a UI.
 */
export async function logAudit(
  resourceType: string,
  resourceId: string,
  action: 'create' | 'update' | 'delete',
  changes?: Record<string, { old: unknown; new: unknown }>,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('audit_action', {
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_action: action,
      p_changes: changes ?? {},
    })
    if (error) {
      // Fallback: insert direto (pode falhar se RPC não existir ainda)
      if (import.meta.env.DEV) console.warn('[Audit] RPC falhou, tentando insert direto:', error.message)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert({
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        resource_type: resourceType,
        resource_id: resourceId,
        action,
        changes: changes ?? {},
      })
    }
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[Audit] Falha ao registrar log:', e)
  }
}

