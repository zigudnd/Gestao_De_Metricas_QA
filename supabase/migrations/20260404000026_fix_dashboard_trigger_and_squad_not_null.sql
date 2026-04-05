-- Migration: 000026_fix_dashboard_trigger_and_squad_not_null.sql
-- Criada em: 2026-04-04
-- Autor: backend-expert
-- Descrição: Corrige dois bugs HIGH-priority:
--   1) dashboard_states não tinha trigger de updated_at (omitido na 000024)
--   2) sprints.squad_id e status_reports.squad_id aceitavam NULL (000025 só setou DEFAULT)

BEGIN;

-- ============================================================
-- BUG 1: Trigger updated_at faltando em dashboard_states
-- A migration 000024 criou triggers para sprints, status_reports,
-- releases e squad_config, mas omitiu dashboard_states que possui
-- coluna updated_at (criada na 000021).
-- ============================================================

CREATE TRIGGER set_dashboard_states_updated_at BEFORE UPDATE ON public.dashboard_states
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- BUG 2: NOT NULL nunca aplicado em squad_id
-- A migration 000025 backfill NULLs e setou DEFAULT, mas o
-- comentário "NOT NULL" nunca foi efetivado no schema.
-- Inserts explícitos com NULL ainda passavam.
-- ============================================================

ALTER TABLE public.sprints
  ALTER COLUMN squad_id SET NOT NULL;

ALTER TABLE public.status_reports
  ALTER COLUMN squad_id SET NOT NULL;

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP TRIGGER IF EXISTS set_dashboard_states_updated_at ON public.dashboard_states;
-- ALTER TABLE public.sprints ALTER COLUMN squad_id DROP NOT NULL;
-- ALTER TABLE public.status_reports ALTER COLUMN squad_id DROP NOT NULL;
-- COMMIT;
