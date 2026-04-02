-- ── Tabela de Releases ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.releases (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'planejada',
  version TEXT,
  production_date DATE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.releases;

-- RLS
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "releases_select" ON public.releases
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "releases_insert" ON public.releases
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "releases_update" ON public.releases
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "releases_delete" ON public.releases
  FOR DELETE TO authenticated USING (true);

-- Indices
CREATE INDEX IF NOT EXISTS idx_releases_status ON public.releases(status);
CREATE INDEX IF NOT EXISTS idx_releases_production_date ON public.releases(production_date);
