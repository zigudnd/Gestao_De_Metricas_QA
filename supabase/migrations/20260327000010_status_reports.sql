CREATE TABLE IF NOT EXISTS public.status_reports (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  squad_id UUID REFERENCES public.squads(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.status_reports;

ALTER TABLE public.status_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can read status reports"
  ON public.status_reports FOR SELECT
  USING (
    squad_id IS NULL
    OR squad_id IN (
      SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can write status reports"
  ON public.status_reports FOR ALL
  USING (
    squad_id IS NULL
    OR squad_id IN (
      SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_status_reports_squad
  ON public.status_reports(squad_id);

CREATE INDEX IF NOT EXISTS idx_status_reports_updated
  ON public.status_reports(updated_at DESC);
