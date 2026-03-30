-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix #1: audit_logs — restringir leitura por squad e insert por service_role
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Admin vê tudo; membros veem logs de sprints/reports dos seus squads
CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (
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
      WHERE squad_id IS NULL
        OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
    )
  )
  OR user_id = auth.uid()
);

-- Insert: apenas authenticated (o client-side auditService precisa inserir)
-- mas forçamos user_id = auth.uid() para evitar forging
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix #2: status_reports — admin bypass para ver reports de squads arquivados
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Squad members can read status reports" ON public.status_reports;
DROP POLICY IF EXISTS "Squad members can write status reports" ON public.status_reports;

CREATE POLICY "status_reports_select" ON public.status_reports FOR SELECT USING (
  public.is_global_admin()
  OR squad_id IS NULL
  OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
);

CREATE POLICY "status_reports_insert" ON public.status_reports FOR INSERT
  WITH CHECK (
    public.is_global_admin()
    OR squad_id IS NULL
    OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
  );

CREATE POLICY "status_reports_update" ON public.status_reports FOR UPDATE USING (
  public.is_global_admin()
  OR squad_id IS NULL
  OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
);

CREATE POLICY "status_reports_delete" ON public.status_reports FOR DELETE USING (
  public.is_global_admin()
  OR squad_id IS NULL
  OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix #3: squad_config — admin bypass
-- ═══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Squad members can read squad config" ON public.squad_config;
DROP POLICY IF EXISTS "Squad members can write squad config" ON public.squad_config;

CREATE POLICY "squad_config_select" ON public.squad_config FOR SELECT USING (
  public.is_global_admin()
  OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
);

CREATE POLICY "squad_config_modify" ON public.squad_config FOR ALL USING (
  public.is_global_admin()
  OR squad_id IN (SELECT squad_id FROM public.squad_members WHERE user_id = auth.uid())
);
