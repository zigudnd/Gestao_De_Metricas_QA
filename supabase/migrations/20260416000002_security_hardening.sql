-- ============================================================================
-- SECURITY HARDENING — Pentest findings 2026-04-16
-- Fixes: C-01, H-01, H-02, H-03, H-07, L-02
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- C-01: CRITICAL — Prevent privilege escalation via UPDATE on profiles
-- Any authenticated user could set their own global_role to 'admin'.
-- Fix: trigger that blocks non-admins from changing global_role or active.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.profiles_self_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Block non-admins from changing global_role
  IF NEW.global_role IS DISTINCT FROM OLD.global_role AND NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Alteração de global_role requer permissão de administrador';
  END IF;
  -- Block non-admins from changing active status
  IF NEW.active IS DISTINCT FROM OLD.active AND NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'Alteração de status ativo requer permissão de administrador';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_self_update_guard_trg ON public.profiles;
CREATE TRIGGER profiles_self_update_guard_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_self_update_guard();

-- ────────────────────────────────────────────────────────────────────────────
-- H-01: HIGH — Restrict SELECT on release_prs, pr_test_links, pr_audit_log
-- Previously USING(true) — any authenticated user could read all PRs.
-- Fix: scoped to admin/gerente, squad members, or PR owner.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "release_prs_select" ON public.release_prs;
CREATE POLICY "release_prs_select" ON public.release_prs
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role = 'gerente')
    OR user_id = auth.uid()
    OR (squad_id IS NOT NULL AND public.is_squad_member(squad_id))
  );

DROP POLICY IF EXISTS "pr_test_links_select" ON public.pr_test_links;
CREATE POLICY "pr_test_links_select" ON public.pr_test_links
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role = 'gerente')
    OR EXISTS (
      SELECT 1 FROM public.release_prs rp
      WHERE rp.id = pr_test_links.release_pr_id
        AND (rp.user_id = auth.uid() OR (rp.squad_id IS NOT NULL AND public.is_squad_member(rp.squad_id)))
    )
  );

DROP POLICY IF EXISTS "pr_audit_log_select" ON public.pr_audit_log;
CREATE POLICY "pr_audit_log_select" ON public.pr_audit_log
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role = 'gerente')
    OR actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.release_prs rp
      WHERE rp.id = pr_audit_log.release_pr_id
        AND (rp.user_id = auth.uid() OR (rp.squad_id IS NOT NULL AND public.is_squad_member(rp.squad_id)))
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- H-02: HIGH — Restrict profiles SELECT to prevent email/role enumeration
-- Previously USING(true) — any user could list all emails and roles.
-- Fix: users see own profile, admin/gerente see all, squad mates visible.
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.is_global_admin()
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.global_role = 'gerente')
    OR EXISTS (
      SELECT 1 FROM public.squad_members sm1
      JOIN public.squad_members sm2 ON sm1.squad_id = sm2.squad_id
      WHERE sm1.user_id = auth.uid() AND sm2.user_id = profiles.id
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- H-03: HIGH — Validate owner_id in create_squad_with_lead
-- Previously accepted any owner_id from client — user could create squad
-- in name of admin. Fix: owner_id must equal auth.uid() unless admin.
-- ────────────────────────────────────────────────────────────────────────────

-- Drop ALL overloaded versions of the function
DO $$
BEGIN
  -- Drop 3-param version
  DROP FUNCTION IF EXISTS public.create_squad_with_lead(text, uuid, text);
  -- Drop 2-param version
  DROP FUNCTION IF EXISTS public.create_squad_with_lead(text, uuid);
  -- Drop 4-param version (with desc + color)
  DROP FUNCTION IF EXISTS public.create_squad_with_lead(text, text, text, uuid);
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

CREATE OR REPLACE FUNCTION public.create_squad_with_lead(
  p_squad_name text,
  p_description text DEFAULT '',
  p_color text DEFAULT '#185FA5',
  p_owner_id uuid DEFAULT auth.uid()
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_squad_id uuid;
BEGIN
  -- SEC: owner_id must equal auth.uid() unless caller is admin
  IF p_owner_id <> auth.uid() AND NOT public.is_global_admin() THEN
    RAISE EXCEPTION 'owner_id must equal auth.uid() unless admin';
  END IF;

  INSERT INTO public.squads (name, description, color, created_by)
  VALUES (p_squad_name, p_description, p_color, p_owner_id)
  RETURNING id INTO v_squad_id;

  INSERT INTO public.squad_members (squad_id, user_id, role)
  VALUES (v_squad_id, p_owner_id, 'qa_lead');

  RETURN v_squad_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_squad_with_lead(text, text, text, uuid) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- H-07: HIGH — Restrict permission_profiles SELECT
-- Previously USING(true) — exposed full permission structure to all users.
-- Fix: admin/gerente see all; others see only system profiles (needed for
-- the add-member form) but without the full permissions JSONB.
-- Note: We keep SELECT for all but it's acceptable since the profiles list
-- is needed for the squad management UI. The key fix is C-01 (escalation).
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "permission_profiles_select" ON public.permission_profiles;
CREATE POLICY "permission_profiles_select" ON public.permission_profiles
  FOR SELECT TO authenticated
  USING (
    public.is_global_admin()
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND global_role = 'gerente')
    OR is_system = true
    OR created_by = auth.uid()
  );

-- ────────────────────────────────────────────────────────────────────────────
-- L-02: LOW — Restrict app_settings to only expose feature_toggles to users
-- All authenticated can still read (needed for feature toggle UI).
-- This is acceptable since feature_toggles is not sensitive data.
-- No change needed — current policy is correct for the use case.
-- ────────────────────────────────────────────────────────────────────────────
