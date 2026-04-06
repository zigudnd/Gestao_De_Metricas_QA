-- API Keys for external integrations
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  squad_ids TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Only admin/gerente can manage API keys
CREATE POLICY "api_keys_select" ON public.api_keys
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('admin', 'gerente'))
  );

CREATE POLICY "api_keys_insert" ON public.api_keys
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('admin', 'gerente'))
  );

CREATE POLICY "api_keys_update" ON public.api_keys
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('admin', 'gerente'))
  );

CREATE POLICY "api_keys_delete" ON public.api_keys
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role IN ('admin', 'gerente'))
  );

-- Indices
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active) WHERE is_active = true;
