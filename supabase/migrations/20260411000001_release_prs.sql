-- ══════════════════════════════════════════════════════════════════
-- Migration: 20260411000001_release_prs.sql
-- Autor: dba-expert
-- Data: 2026-04-11
-- Descricao: Tabelas para gestao de PRs em releases:
--   1) release_prs — PRs cadastrados em releases
--   2) pr_test_links — Vinculo entre PR e testes
--   3) pr_audit_log — Auditoria de acoes sobre PRs
--   + Indices, RLS policies, trigger updated_at
-- Dependencias: migrations 001-029, releases table, squads table
-- Risco: BAIXO — apenas CREATE, sem alteracao de dados existentes
-- ══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── 1. Tabela release_prs ─────────────────────────────────────

CREATE TABLE public.release_prs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id text NOT NULL,
  squad_id uuid REFERENCES public.squads(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  pr_link text NOT NULL,
  repository text NOT NULL,
  description text NOT NULL DEFAULT '',
  change_type text NOT NULL DEFAULT 'feature'
    CHECK (change_type IN ('feature', 'fix', 'refactor', 'hotfix')),
  review_status text NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_observation text,
  test_commitment_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Tabela pr_test_links ───────────────────────────────────

CREATE TABLE public.pr_test_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_pr_id uuid NOT NULL REFERENCES public.release_prs(id) ON DELETE CASCADE,
  test_id text NOT NULL,
  linked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  linked_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. Tabela pr_audit_log ────────────────────────────────────

CREATE TABLE public.pr_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_pr_id uuid NOT NULL REFERENCES public.release_prs(id) ON DELETE CASCADE,
  action text NOT NULL
    CHECK (action IN ('created', 'updated', 'approved', 'rejected', 'test_linked', 'test_unlinked')),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── 4. Indices ────────────────────────────────────────────────

CREATE INDEX idx_release_prs_release_id ON public.release_prs(release_id);
CREATE INDEX idx_release_prs_squad_id ON public.release_prs(squad_id);
CREATE INDEX idx_release_prs_user_id ON public.release_prs(user_id);
CREATE INDEX idx_release_prs_updated_at ON public.release_prs(updated_at DESC);
CREATE INDEX idx_pr_audit_log_release_pr_id ON public.pr_audit_log(release_pr_id);

-- ─── 5. RLS ────────────────────────────────────────────────────

ALTER TABLE public.release_prs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_prs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pr_test_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_test_links FORCE ROW LEVEL SECURITY;

ALTER TABLE public.pr_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pr_audit_log FORCE ROW LEVEL SECURITY;

-- release_prs: SELECT — todos os autenticados
CREATE POLICY "release_prs_select" ON public.release_prs
  FOR SELECT TO authenticated
  USING (true);

-- release_prs: INSERT — apenas o proprio user_id
CREATE POLICY "release_prs_insert" ON public.release_prs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- release_prs: UPDATE — dono (enquanto release em 'corte') OU admin/gerente (review)
CREATE POLICY "release_prs_update" ON public.release_prs
  FOR UPDATE TO authenticated
  USING (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.releases r
        WHERE r.id = release_id
          AND r.status = 'corte'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role IN ('admin', 'gerente')
    )
  )
  WITH CHECK (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.releases r
        WHERE r.id = release_id
          AND r.status = 'corte'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND global_role IN ('admin', 'gerente')
    )
  );

-- release_prs: DELETE — apenas o dono, enquanto release em status 'corte'
CREATE POLICY "release_prs_delete" ON public.release_prs
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.releases r
      WHERE r.id = release_id
        AND r.status = 'corte'
    )
  );

-- pr_test_links: SELECT — todos os autenticados
CREATE POLICY "pr_test_links_select" ON public.pr_test_links
  FOR SELECT TO authenticated
  USING (true);

-- pr_test_links: INSERT — autenticados
CREATE POLICY "pr_test_links_insert" ON public.pr_test_links
  FOR INSERT TO authenticated
  WITH CHECK (linked_by = auth.uid());

-- pr_test_links: DELETE — apenas quem vinculou
CREATE POLICY "pr_test_links_delete" ON public.pr_test_links
  FOR DELETE TO authenticated
  USING (linked_by = auth.uid());

-- pr_audit_log: SELECT — todos os autenticados
CREATE POLICY "pr_audit_log_select" ON public.pr_audit_log
  FOR SELECT TO authenticated
  USING (true);

-- pr_audit_log: INSERT — autenticados, actor_id = uid
CREATE POLICY "pr_audit_log_insert" ON public.pr_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ─── 6. Trigger updated_at ─────────────────────────────────────
-- Reutiliza a funcao public.set_updated_at() criada em 000024

CREATE TRIGGER set_release_prs_updated_at
  BEFORE UPDATE ON public.release_prs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;

-- ─── ROLLBACK ──────────────────────────────────────────────────
-- Para reverter esta migration:
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS set_release_prs_updated_at ON public.release_prs;
-- DROP TABLE IF EXISTS public.pr_audit_log;
-- DROP TABLE IF EXISTS public.pr_test_links;
-- DROP TABLE IF EXISTS public.release_prs;
-- COMMIT;
-- ────────────────────────────────────────────────────────────────
