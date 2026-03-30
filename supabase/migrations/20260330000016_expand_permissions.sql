-- Expandir permissoes: adicionar create_ e edit_ para cada recurso
-- Os novos campos default true (padrao: pode criar e editar, mas não excluir)

-- Atualizar default da coluna permissions em squad_members
ALTER TABLE public.squad_members
  ALTER COLUMN permissions SET DEFAULT '{
    "create_sprints":true,"create_bugs":true,"create_features":true,"create_test_cases":true,
    "create_suites":true,"create_blockers":true,"create_alignments":true,
    "edit_sprints":true,"edit_bugs":true,"edit_features":true,"edit_test_cases":true,
    "edit_suites":true,"edit_blockers":true,"edit_alignments":true,
    "delete_sprints":false,"delete_bugs":false,"delete_features":false,"delete_test_cases":false,
    "delete_suites":false,"delete_blockers":false,"delete_alignments":false
  }'::jsonb;

-- Atualizar default da coluna permissions em permission_profiles
ALTER TABLE public.permission_profiles
  ALTER COLUMN permissions SET DEFAULT '{
    "create_sprints":true,"create_bugs":true,"create_features":true,"create_test_cases":true,
    "create_suites":true,"create_blockers":true,"create_alignments":true,
    "edit_sprints":true,"edit_bugs":true,"edit_features":true,"edit_test_cases":true,
    "edit_suites":true,"edit_blockers":true,"edit_alignments":true,
    "delete_sprints":false,"delete_bugs":false,"delete_features":false,"delete_test_cases":false,
    "delete_suites":false,"delete_blockers":false,"delete_alignments":false
  }'::jsonb;

-- Migrar membros existentes: adicionar novas keys (create/edit) como true
UPDATE public.squad_members
SET permissions = permissions
  || '{"create_sprints":true,"create_bugs":true,"create_features":true,"create_test_cases":true,"create_suites":true,"create_blockers":true,"create_alignments":true}'::jsonb
  || '{"edit_sprints":true,"edit_bugs":true,"edit_features":true,"edit_test_cases":true,"edit_suites":true,"edit_blockers":true,"edit_alignments":true}'::jsonb
WHERE NOT (permissions ? 'create_sprints');

-- Migrar perfis existentes: adicionar novas keys
UPDATE public.permission_profiles
SET permissions = permissions
  || '{"create_sprints":true,"create_bugs":true,"create_features":true,"create_test_cases":true,"create_suites":true,"create_blockers":true,"create_alignments":true}'::jsonb
  || '{"edit_sprints":true,"edit_bugs":true,"edit_features":true,"edit_test_cases":true,"edit_suites":true,"edit_blockers":true,"edit_alignments":true}'::jsonb
WHERE NOT (permissions ? 'create_sprints');

-- Perfil "Somente Leitura": desabilitar create e edit tambem
UPDATE public.permission_profiles
SET permissions = '{
  "create_sprints":false,"create_bugs":false,"create_features":false,"create_test_cases":false,
  "create_suites":false,"create_blockers":false,"create_alignments":false,
  "edit_sprints":false,"edit_bugs":false,"edit_features":false,"edit_test_cases":false,
  "edit_suites":false,"edit_blockers":false,"edit_alignments":false,
  "delete_sprints":false,"delete_bugs":false,"delete_features":false,"delete_test_cases":false,
  "delete_suites":false,"delete_blockers":false,"delete_alignments":false
}'::jsonb
WHERE name = 'Somente Leitura' AND is_system = true;
