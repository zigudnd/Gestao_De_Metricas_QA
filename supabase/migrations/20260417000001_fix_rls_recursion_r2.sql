-- ============================================================================
-- R2-C-01 FIX: Infinite recursion in profiles RLS policy
-- The policies from 20260416000002 used direct EXISTS on profiles table
-- inside the profiles_select policy, causing infinite recursion.
-- Fix: create is_gerente() SECURITY DEFINER (bypasses RLS) and rewrite
-- all affected policies to use helper functions instead of direct queries.
-- ============================================================================

-- ── Helper function: is_gerente() ───────────────────────────────────────────
-- Mirrors is_global_admin() pattern — SECURITY DEFINER bypasses RLS.

CREATE OR REPLACE FUNCTION public.is_gerente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role = 'gerente'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_gerente() TO authenticated;

-- ── Helper function: is_admin_or_gerente() ──────────────────────────────────
-- Convenience: combines both checks in one call.

CREATE OR REPLACE FUNCTION public.is_admin_or_gerente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND global_role IN ('admin', 'gerente')
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_gerente() TO authenticated;

-- ── Fix profiles_select (was causing recursion) ─────────────────────────────

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_global_admin()
    OR public.is_gerente()
    OR EXISTS (
      SELECT 1 FROM public.squad_members sm1
      JOIN public.squad_members sm2 ON sm1.squad_id = sm2.squad_id
      WHERE sm1.user_id = auth.uid() AND sm2.user_id = profiles.id
    )
  );

-- ── Fix release_prs_select ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "release_prs_select" ON public.release_prs;
CREATE POLICY "release_prs_select" ON public.release_prs
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente()
    OR user_id = auth.uid()
    OR (squad_id IS NOT NULL AND public.is_squad_member(squad_id))
  );

-- ── Fix pr_test_links_select ────────────────────────────────────────────────

DROP POLICY IF EXISTS "pr_test_links_select" ON public.pr_test_links;
CREATE POLICY "pr_test_links_select" ON public.pr_test_links
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente()
    OR EXISTS (
      SELECT 1 FROM public.release_prs rp
      WHERE rp.id = pr_test_links.release_pr_id
        AND (rp.user_id = auth.uid() OR (rp.squad_id IS NOT NULL AND public.is_squad_member(rp.squad_id)))
    )
  );

-- ── Fix pr_audit_log_select ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "pr_audit_log_select" ON public.pr_audit_log;
CREATE POLICY "pr_audit_log_select" ON public.pr_audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente()
    OR actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.release_prs rp
      WHERE rp.id = pr_audit_log.release_pr_id
        AND (rp.user_id = auth.uid() OR (rp.squad_id IS NOT NULL AND public.is_squad_member(rp.squad_id)))
    )
  );

-- ── Fix permission_profiles_select ──────────────────────────────────────────

DROP POLICY IF EXISTS "permission_profiles_select" ON public.permission_profiles;
CREATE POLICY "permission_profiles_select" ON public.permission_profiles
  FOR SELECT TO authenticated
  USING (
    public.is_admin_or_gerente()
    OR is_system = true
    OR created_by = auth.uid()
  );
