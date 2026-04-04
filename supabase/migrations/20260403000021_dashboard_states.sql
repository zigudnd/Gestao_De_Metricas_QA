-- Migration: 20260403000021_dashboard_states.sql
-- Descrição: Cria tabela dashboard_states referenciada pelo server.js

BEGIN;

CREATE TABLE IF NOT EXISTS public.dashboard_states (
  project_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.dashboard_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dashboard_states_select" ON public.dashboard_states
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dashboard_states_write" ON public.dashboard_states
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_dashboard_states_updated
  ON public.dashboard_states(updated_at DESC);

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP TABLE IF EXISTS public.dashboard_states;
-- COMMIT;
