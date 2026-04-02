-- Expandir permissoes com recursos de Releases, Status Reports e Checkpoints
-- Novos campos default true para criar/editar, false para excluir

-- Migrar squad_members existentes
UPDATE public.squad_members
SET permissions = permissions
  || '{"create_releases":true,"create_status_reports":true,"create_checkpoints":true}'::jsonb
  || '{"edit_releases":true,"edit_status_reports":true,"edit_checkpoints":true}'::jsonb
  || '{"delete_releases":false,"delete_status_reports":false,"delete_checkpoints":false}'::jsonb
WHERE NOT (permissions ? 'create_releases');

-- Migrar permission_profiles existentes
UPDATE public.permission_profiles
SET permissions = permissions
  || '{"create_releases":true,"create_status_reports":true,"create_checkpoints":true}'::jsonb
  || '{"edit_releases":true,"edit_status_reports":true,"edit_checkpoints":true}'::jsonb
  || '{"delete_releases":false,"delete_status_reports":false,"delete_checkpoints":false}'::jsonb
WHERE NOT (permissions ? 'create_releases');

-- Perfil "Somente Leitura": desabilitar tudo para novos recursos
UPDATE public.permission_profiles
SET permissions = permissions
  || '{"create_releases":false,"create_status_reports":false,"create_checkpoints":false}'::jsonb
  || '{"edit_releases":false,"edit_status_reports":false,"edit_checkpoints":false}'::jsonb
  || '{"delete_releases":false,"delete_status_reports":false,"delete_checkpoints":false}'::jsonb
WHERE name = 'Somente Leitura' AND is_system = true;

-- Perfil "Acesso Total": habilitar tudo
UPDATE public.permission_profiles
SET permissions = permissions
  || '{"create_releases":true,"create_status_reports":true,"create_checkpoints":true}'::jsonb
  || '{"edit_releases":true,"edit_status_reports":true,"edit_checkpoints":true}'::jsonb
  || '{"delete_releases":true,"delete_status_reports":true,"delete_checkpoints":true}'::jsonb
WHERE name = 'Acesso Total' AND is_system = true;
