-- Migration: 20260403000022_fix_releases_rls.sql
-- Descrição: Restringe RLS de releases — leitura para todos autenticados, escrita para admin/gerente

BEGIN;

-- Drop old overly permissive policies
DROP POLICY IF EXISTS "releases_select" ON public.releases;
DROP POLICY IF EXISTS "releases_insert" ON public.releases;
DROP POLICY IF EXISTS "releases_update" ON public.releases;
DROP POLICY IF EXISTS "releases_delete" ON public.releases;

-- Leitura: todos autenticados (releases são visíveis para acompanhamento)
CREATE POLICY "releases_select_authenticated" ON public.releases
  FOR SELECT TO authenticated USING (true);

-- Escrita: apenas admin ou gerente
CREATE POLICY "releases_insert_admin" ON public.releases
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_global_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND global_role = 'gerente'
    )
  );

CREATE POLICY "releases_update_admin" ON public.releases
  FOR UPDATE TO authenticated
  USING (
    public.is_global_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND global_role = 'gerente'
    )
  );

CREATE POLICY "releases_delete_admin" ON public.releases
  FOR DELETE TO authenticated
  USING (
    public.is_global_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND global_role = 'gerente'
    )
  );

COMMIT;

-- ROLLBACK:
-- BEGIN;
-- DROP POLICY IF EXISTS "releases_select_authenticated" ON public.releases;
-- DROP POLICY IF EXISTS "releases_insert_admin" ON public.releases;
-- DROP POLICY IF EXISTS "releases_update_admin" ON public.releases;
-- DROP POLICY IF EXISTS "releases_delete_admin" ON public.releases;
-- CREATE POLICY "releases_select" ON public.releases FOR SELECT TO authenticated USING (true);
-- CREATE POLICY "releases_insert" ON public.releases FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "releases_update" ON public.releases FOR UPDATE TO authenticated USING (true);
-- CREATE POLICY "releases_delete" ON public.releases FOR DELETE TO authenticated USING (true);
-- COMMIT;
