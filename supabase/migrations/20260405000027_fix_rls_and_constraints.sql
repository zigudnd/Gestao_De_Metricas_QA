-- Migration: 000027_fix_rls_and_constraints.sql
-- Criada em: 2026-04-05
-- Autor: backend-expert
-- Descrição: Corrige bugs de RLS e adiciona CHECK constraints faltantes:
--   HIGH 1) squad_archived_visibility amplia acesso — consolida em squads_select
--   HIGH 2) dashboard_states USING(true) FOR ALL — restringe write a admin
--   MED)   CHECK constraints ausentes em colunas status
--   LOW)   Dead branch squad_id IS NULL nas policies de sprints

BEGIN;

-- ============================================================
-- HIGH 1: Consolidar policies de SELECT em squads
-- Problema: squad_archived_visibility (000014) somada a squads_select_members
-- (000003) criava duas policies OR'd, permitindo que qualquer membro
-- visse squads arquivados. Consolidamos em uma única policy:
--   - Membros veem seus squads (não arquivados)
--   - Admins veem tudo (incluindo arquivados)
-- ============================================================

DROP POLICY IF EXISTS "squad_archived_visibility" ON public.squads;
DROP POLICY IF EXISTS "squads_select_members" ON public.squads;

CREATE POLICY "squads_select" ON public.squads FOR SELECT TO authenticated
  USING (
    is_squad_member(id) AND (NOT archived OR public.is_global_admin())
  );

-- ============================================================
-- HIGH 2: Restringir escrita em dashboard_states a admins
-- Problema: a policy "dashboard_states_write" (000021) usava
-- USING(true) WITH CHECK(true), permitindo que qualquer usuário
-- autenticado inserisse/atualizasse/deletasse estados do dashboard.
-- ============================================================

DROP POLICY IF EXISTS "dashboard_states_write" ON public.dashboard_states;

CREATE POLICY "dashboard_states_write" ON public.dashboard_states
  FOR ALL TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());

-- ============================================================
-- MED: CHECK constraints em colunas status
-- Garante que apenas valores válidos sejam persistidos.
-- ============================================================

-- sprints.status: 'ativa' | 'concluida'
ALTER TABLE public.sprints
  ADD CONSTRAINT chk_sprints_status
  CHECK (status IN ('ativa', 'concluida'));

-- status_reports.status: 'active' | 'concluded'
ALTER TABLE public.status_reports
  ADD CONSTRAINT chk_status_reports_status
  CHECK (status IN ('active', 'concluded'));

-- releases.status: todos os valores do enum ReleaseStatus
ALTER TABLE public.releases
  ADD CONSTRAINT chk_releases_status
  CHECK (status IN (
    'planejada',
    'em_desenvolvimento',
    'corte',
    'em_homologacao',
    'em_regressivo',
    'aprovada',
    'em_producao',
    'concluida',
    'uniu_escopo'
  ));

-- ============================================================
-- LOW: Remover branch morta squad_id IS NULL nas policies de sprints
-- Desde a 000026, squad_id é NOT NULL — a condição nunca é verdadeira.
-- Recriamos as policies sem essa branch.
-- ============================================================

DROP POLICY IF EXISTS "sprints_select" ON public.sprints;
DROP POLICY IF EXISTS "sprints_insert" ON public.sprints;
DROP POLICY IF EXISTS "sprints_update" ON public.sprints;
DROP POLICY IF EXISTS "sprints_delete" ON public.sprints;

CREATE POLICY "sprints_select" ON public.sprints
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin()
    OR is_squad_member(squad_id)
  );

CREATE POLICY "sprints_insert" ON public.sprints
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_global_admin()
    OR is_squad_member(squad_id)
  );

CREATE POLICY "sprints_update" ON public.sprints
  FOR UPDATE TO authenticated
  USING (
    public.is_global_admin()
    OR is_squad_member(squad_id)
  );

CREATE POLICY "sprints_delete" ON public.sprints
  FOR DELETE TO authenticated
  USING (
    public.is_global_admin()
    OR is_squad_lead(squad_id)
  );

-- ============================================================
-- LOW (bonus): Remover branch morta squad_id IS NULL nas policies
-- de status_reports (mesma situação — squad_id agora é NOT NULL)
-- ============================================================

DROP POLICY IF EXISTS "status_reports_select" ON public.status_reports;
DROP POLICY IF EXISTS "status_reports_insert" ON public.status_reports;
DROP POLICY IF EXISTS "status_reports_update" ON public.status_reports;
DROP POLICY IF EXISTS "status_reports_delete" ON public.status_reports;

CREATE POLICY "status_reports_select" ON public.status_reports
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin()
    OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

CREATE POLICY "status_reports_insert" ON public.status_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_global_admin()
    OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

CREATE POLICY "status_reports_update" ON public.status_reports
  FOR UPDATE TO authenticated
  USING (
    public.is_global_admin()
    OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

CREATE POLICY "status_reports_delete" ON public.status_reports
  FOR DELETE TO authenticated
  USING (
    public.is_global_admin()
    OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

-- ============================================================
-- LOW (bonus): Remover branch morta squad_id IS NULL em audit_logs
-- ============================================================

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin()
    OR (
      resource_type = 'sprint' AND resource_id IN (
        SELECT id FROM public.sprints
        WHERE squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
      )
    )
    OR (
      resource_type = 'status_report' AND resource_id IN (
        SELECT id FROM public.status_reports
        WHERE squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
      )
    )
    OR user_id = auth.uid()
  );

COMMIT;

-- ROLLBACK:
-- BEGIN;
--
-- -- HIGH 1: Restaurar policies originais de squads
-- DROP POLICY IF EXISTS "squads_select" ON public.squads;
-- CREATE POLICY "squads_select_members" ON public.squads
--   FOR SELECT USING (is_squad_member(id));
-- CREATE POLICY "squad_archived_visibility" ON public.squads
--   FOR SELECT USING (NOT archived OR public.is_global_admin()
--     OR id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
--
-- -- HIGH 2: Restaurar dashboard_states_write permissiva
-- DROP POLICY IF EXISTS "dashboard_states_write" ON public.dashboard_states;
-- CREATE POLICY "dashboard_states_write" ON public.dashboard_states
--   FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
-- -- MED: Remover CHECK constraints
-- ALTER TABLE public.sprints DROP CONSTRAINT IF EXISTS chk_sprints_status;
-- ALTER TABLE public.status_reports DROP CONSTRAINT IF EXISTS chk_status_reports_status;
-- ALTER TABLE public.releases DROP CONSTRAINT IF EXISTS chk_releases_status;
--
-- -- LOW: Restaurar policies de sprints com squad_id IS NULL
-- DROP POLICY IF EXISTS "sprints_select" ON public.sprints;
-- DROP POLICY IF EXISTS "sprints_insert" ON public.sprints;
-- DROP POLICY IF EXISTS "sprints_update" ON public.sprints;
-- DROP POLICY IF EXISTS "sprints_delete" ON public.sprints;
-- CREATE POLICY "sprints_select" ON public.sprints FOR SELECT
--   USING (squad_id IS NULL OR is_squad_member(squad_id));
-- CREATE POLICY "sprints_insert" ON public.sprints FOR INSERT
--   WITH CHECK (squad_id IS NULL OR is_squad_member(squad_id));
-- CREATE POLICY "sprints_update" ON public.sprints FOR UPDATE
--   USING (squad_id IS NULL OR is_squad_member(squad_id));
-- CREATE POLICY "sprints_delete" ON public.sprints FOR DELETE
--   USING (squad_id IS NULL OR is_squad_lead(squad_id));
--
-- -- LOW: Restaurar policies de status_reports com squad_id IS NULL
-- DROP POLICY IF EXISTS "status_reports_select" ON public.status_reports;
-- DROP POLICY IF EXISTS "status_reports_insert" ON public.status_reports;
-- DROP POLICY IF EXISTS "status_reports_update" ON public.status_reports;
-- DROP POLICY IF EXISTS "status_reports_delete" ON public.status_reports;
-- CREATE POLICY "status_reports_select" ON public.status_reports FOR SELECT
--   USING (public.is_global_admin() OR squad_id IS NULL
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
-- CREATE POLICY "status_reports_insert" ON public.status_reports FOR INSERT
--   WITH CHECK (public.is_global_admin() OR squad_id IS NULL
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
-- CREATE POLICY "status_reports_update" ON public.status_reports FOR UPDATE
--   USING (public.is_global_admin() OR squad_id IS NULL
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
-- CREATE POLICY "status_reports_delete" ON public.status_reports FOR DELETE
--   USING (public.is_global_admin() OR squad_id IS NULL
--     OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid()));
--
-- -- LOW: Restaurar audit_logs_select com squad_id IS NULL
-- DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
-- CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT
--   USING (public.is_global_admin()
--     OR (resource_type = 'sprint' AND resource_id IN (
--         SELECT id FROM public.sprints
--         WHERE squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())))
--     OR (resource_type = 'status_report' AND resource_id IN (
--         SELECT id FROM public.status_reports
--         WHERE squad_id IS NULL
--           OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())))
--     OR user_id = auth.uid());
--
-- COMMIT;
