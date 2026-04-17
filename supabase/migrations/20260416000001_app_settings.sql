-- Feature toggles: app-level settings for enabling/disabling modules
-- Admins/gerentes can toggle modules on/off from the admin panel

CREATE TABLE IF NOT EXISTS public.app_settings (
  id text PRIMARY KEY DEFAULT 'default',
  feature_toggles jsonb NOT NULL DEFAULT '{"status_report":true,"sprints":true,"releases":true,"prs":true,"docs":true}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings FORCE ROW LEVEL SECURITY;

-- All authenticated users can read (everyone needs to know which features are enabled)
CREATE POLICY "app_settings_select" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

-- Only admin/gerente can update
CREATE POLICY "app_settings_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.global_role IN ('admin', 'gerente')
    )
  );

-- Seed default row
INSERT INTO public.app_settings (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;
