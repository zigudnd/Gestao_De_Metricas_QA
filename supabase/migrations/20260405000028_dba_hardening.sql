-- ══════════════════════════════════════════════════════════════════
-- Migration: 20260405000028_dba_hardening.sql
-- Autor: dba-expert
-- Data: 2026-04-05
-- Descrição: Hardening de segurança e performance:
--   1) FORCE ROW LEVEL SECURITY em todas as tabelas
--   2) Índices faltantes para sync incremental (updated_at)
--   3) Covering index para is_squad_lead (user_id, squad_id, role)
--   4) Padronizar policies de status_reports com helper functions
--   5) Fortalecer audit_logs INSERT (user_id = auth.uid())
-- Dependências: migrations 001-027
-- Risco: BAIXO — apenas ALTER/CREATE, sem alteração de dados
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. FORCE ROW LEVEL SECURITY em todas as tabelas ──────────────
-- Garante que até o table owner (service_role) respeite as policies.
-- Previne bypass acidental via Supabase Dashboard SQL Editor.
-- ───────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.squads FORCE ROW LEVEL SECURITY;
ALTER TABLE public.squad_members FORCE ROW LEVEL SECURITY;
ALTER TABLE public.sprints FORCE ROW LEVEL SECURITY;
ALTER TABLE public.status_reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.releases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.squad_config FORCE ROW LEVEL SECURITY;
ALTER TABLE public.dashboard_states FORCE ROW LEVEL SECURITY;

-- ─── 2. Índices faltantes para sync incremental ───────────────────
-- syncAllFromSupabase filtra por updated_at > lastSync em todas as
-- tabelas. Sem índice, PostgreSQL faz seq scan completo.
-- ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sprints_updated_at
  ON public.sprints(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_releases_updated_at
  ON public.releases(updated_at DESC);

-- ─── 3. Covering index para is_squad_lead ─────────────────────────
-- O helper is_squad_lead() consulta (squad_id, user_id, role).
-- O índice existente idx_squad_members_user_squad cobre (user_id, squad_id)
-- mas não inclui role, forçando um heap fetch. O novo índice cobre tudo.
-- ───────────────────────────────────────────────────────────────────

DROP INDEX IF EXISTS idx_squad_members_user_squad;
CREATE INDEX IF NOT EXISTS idx_squad_members_user_squad_role
  ON public.squad_members(user_id, squad_id, role);

-- ─── 4. Padronizar policies de status_reports com helpers ─────────
-- As policies atuais (migration 027) usam subquery direto em
-- squad_members em vez dos helpers is_squad_member/is_squad_lead.
-- Padronizar com helpers: consistência + evita cadeia de RLS.
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "status_reports_select" ON public.status_reports;
DROP POLICY IF EXISTS "status_reports_insert" ON public.status_reports;
DROP POLICY IF EXISTS "status_reports_update" ON public.status_reports;
DROP POLICY IF EXISTS "status_reports_delete" ON public.status_reports;

CREATE POLICY "status_reports_select" ON public.status_reports
  FOR SELECT TO authenticated
  USING (public.is_global_admin() OR is_squad_member(squad_id));

CREATE POLICY "status_reports_insert" ON public.status_reports
  FOR INSERT TO authenticated
  WITH CHECK (public.is_global_admin() OR is_squad_member(squad_id));

CREATE POLICY "status_reports_update" ON public.status_reports
  FOR UPDATE TO authenticated
  USING (public.is_global_admin() OR is_squad_member(squad_id));

CREATE POLICY "status_reports_delete" ON public.status_reports
  FOR DELETE TO authenticated
  USING (public.is_global_admin() OR is_squad_lead(squad_id));

-- ─── 5. Fortalecer audit_logs INSERT ──────────────────────────────
-- A policy anterior permitia user_id IS NULL (anti-forging parcial).
-- Agora exige user_id = auth.uid() — forçando rastreabilidade total.
-- O RPC audit_action já garante isso, mas defesa em profundidade.
-- ───────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (user_id = auth.uid());

COMMIT;

-- ─── ROLLBACK ──────────────────────────────────────────────────────
-- Para reverter esta migration:
--
-- BEGIN;
--
-- -- 1. Remover FORCE RLS
-- ALTER TABLE public.profiles NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.squads NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.squad_members NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.sprints NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.status_reports NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.releases NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.audit_logs NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.permission_profiles NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.squad_config NO FORCE ROW LEVEL SECURITY;
-- ALTER TABLE public.dashboard_states NO FORCE ROW LEVEL SECURITY;
--
-- -- 2. Reverter índices
-- DROP INDEX IF EXISTS idx_sprints_updated_at;
-- DROP INDEX IF EXISTS idx_releases_updated_at;
-- DROP INDEX IF EXISTS idx_squad_members_user_squad_role;
-- CREATE INDEX idx_squad_members_user_squad
--   ON public.squad_members(user_id, squad_id);
--
-- -- 3. Reverter policies status_reports (voltar para subquery)
-- DROP POLICY IF EXISTS "status_reports_select" ON public.status_reports;
-- DROP POLICY IF EXISTS "status_reports_insert" ON public.status_reports;
-- DROP POLICY IF EXISTS "status_reports_update" ON public.status_reports;
-- DROP POLICY IF EXISTS "status_reports_delete" ON public.status_reports;
-- CREATE POLICY "status_reports_select" ON public.status_reports
--   FOR SELECT TO authenticated
--   USING (public.is_global_admin()
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
-- CREATE POLICY "status_reports_insert" ON public.status_reports
--   FOR INSERT TO authenticated
--   WITH CHECK (public.is_global_admin()
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
-- CREATE POLICY "status_reports_update" ON public.status_reports
--   FOR UPDATE TO authenticated
--   USING (public.is_global_admin()
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
-- CREATE POLICY "status_reports_delete" ON public.status_reports
--   FOR DELETE TO authenticated
--   USING (public.is_global_admin()
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
--
-- -- 4. Reverter audit_logs INSERT
-- DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;
-- CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
--   WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));
--
-- COMMIT;
-- ──────────────────────────────────────────────────────────────────
