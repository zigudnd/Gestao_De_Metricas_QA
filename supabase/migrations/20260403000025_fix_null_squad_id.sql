-- Migration: 20260403000025_fix_null_squad_id.sql
-- Descrição: Migrar sprints/reports sem squad_id para QualityBeta e prevenir futuros nulls

BEGIN;

-- Migrar sprints restantes sem squad_id para QualityBeta
UPDATE public.sprints
SET squad_id = 'a0000000-0000-0000-0000-000000000001'
WHERE squad_id IS NULL;

-- Migrar status_reports sem squad_id para QualityBeta
UPDATE public.status_reports
SET squad_id = 'a0000000-0000-0000-0000-000000000001'
WHERE squad_id IS NULL;

-- Adicionar NOT NULL com default para prevenir futuros nulls
-- (usando default do QualityBeta squad)
ALTER TABLE public.sprints
  ALTER COLUMN squad_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';

ALTER TABLE public.status_reports
  ALTER COLUMN squad_id SET DEFAULT 'a0000000-0000-0000-0000-000000000001';

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- ALTER TABLE public.sprints ALTER COLUMN squad_id DROP DEFAULT;
-- ALTER TABLE public.status_reports ALTER COLUMN squad_id DROP DEFAULT;
-- COMMIT;
