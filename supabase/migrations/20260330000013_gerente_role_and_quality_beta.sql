-- Adicionar 'gerente' como valor válido de global_role
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_global_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_global_role_check
  CHECK (global_role IN ('admin', 'gerente', 'user'));

-- Criar squad QualityBeta para migrar dados legados
INSERT INTO public.squads (id, name, description, color, created_at)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'QualityBeta',
  'Squad padrao para migracao de dados legados',
  '#185FA5',
  now()
)
ON CONFLICT (id) DO NOTHING;

-- Migrar todos os usuarios existentes para QualityBeta como 'qa'
INSERT INTO public.squad_members (squad_id, user_id, role, permissions)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  p.id,
  'qa',
  '{"delete_sprints":false,"delete_bugs":true,"delete_features":false,"delete_test_cases":true,"delete_suites":false,"delete_blockers":true,"delete_alignments":true}'::jsonb
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.squad_members sm
  WHERE sm.squad_id = 'a0000000-0000-0000-0000-000000000001'
    AND sm.user_id = p.id
);

-- Migrar sprints sem squad_id para QualityBeta
UPDATE public.sprints
SET squad_id = 'a0000000-0000-0000-0000-000000000001'
WHERE squad_id IS NULL;

-- Migrar status_reports sem squad_id para QualityBeta
UPDATE public.status_reports
SET squad_id = 'a0000000-0000-0000-0000-000000000001'
WHERE squad_id IS NULL;
