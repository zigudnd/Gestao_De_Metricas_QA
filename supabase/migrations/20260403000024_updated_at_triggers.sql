-- Migration: 20260403000024_updated_at_triggers.sql
-- Descrição: Trigger automático de updated_at para tabelas mutáveis

BEGIN;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar em todas as tabelas com updated_at
CREATE TRIGGER set_sprints_updated_at BEFORE UPDATE ON public.sprints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_status_reports_updated_at BEFORE UPDATE ON public.status_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_releases_updated_at BEFORE UPDATE ON public.releases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_squad_config_updated_at BEFORE UPDATE ON public.squad_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP TRIGGER IF EXISTS set_sprints_updated_at ON public.sprints;
-- DROP TRIGGER IF EXISTS set_status_reports_updated_at ON public.status_reports;
-- DROP TRIGGER IF EXISTS set_releases_updated_at ON public.releases;
-- DROP TRIGGER IF EXISTS set_squad_config_updated_at ON public.squad_config;
-- DROP FUNCTION IF EXISTS public.set_updated_at();
-- COMMIT;
