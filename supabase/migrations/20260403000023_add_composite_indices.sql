-- Migration: 20260403000023_add_composite_indices.sql
-- Descrição: Adiciona índices compostos para performance de RLS policies

BEGIN;

-- squad_members: usado em TODAS as RLS policies para verificar membership
CREATE INDEX IF NOT EXISTS idx_squad_members_user_squad
  ON public.squad_members(user_id, squad_id);

-- profiles: usado em is_global_admin() chamado em cada policy
CREATE INDEX IF NOT EXISTS idx_profiles_id_role
  ON public.profiles(id, global_role);

-- sprints: filtrado por squad_id em RLS
CREATE INDEX IF NOT EXISTS idx_sprints_squad_id
  ON public.sprints(squad_id);

-- status_reports: filtrado por squad_id em RLS
CREATE INDEX IF NOT EXISTS idx_status_reports_squad_id
  ON public.status_reports(squad_id);

-- audit_logs: composite para queries de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
  ON public.audit_logs(resource_type, resource_id);

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP INDEX IF EXISTS idx_squad_members_user_squad;
-- DROP INDEX IF EXISTS idx_profiles_id_role;
-- DROP INDEX IF EXISTS idx_sprints_squad_id;
-- DROP INDEX IF EXISTS idx_status_reports_squad_id;
-- DROP INDEX IF EXISTS idx_audit_logs_resource;
-- COMMIT;
