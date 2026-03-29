-- Tabela de auditoria genérica
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  resource_type TEXT NOT NULL,       -- 'sprint' | 'status_report' | 'squad'
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL,              -- 'create' | 'update' | 'delete'
  changes JSONB DEFAULT '{}'::jsonb, -- { field: { old, new } }
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ver logs dos recursos que acessa
CREATE POLICY "Authenticated users can read audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Apenas o sistema insere logs (via service_role ou trigger)
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON public.audit_logs(resource_type, resource_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs(user_id);
