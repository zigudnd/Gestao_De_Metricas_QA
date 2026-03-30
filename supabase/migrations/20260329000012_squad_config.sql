CREATE TABLE IF NOT EXISTS public.squad_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID REFERENCES public.squads(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(squad_id)
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.squad_config;

ALTER TABLE public.squad_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Squad members can read squad config"
  ON public.squad_config FOR SELECT
  USING (
    squad_id IN (
      SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Squad members can write squad config"
  ON public.squad_config FOR ALL
  USING (
    squad_id IN (
      SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_squad_config_squad
  ON public.squad_config(squad_id);
