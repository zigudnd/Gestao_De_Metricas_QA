-- Permitir admin editar perfis de sistema (apenas nome, descricao e permissoes — nao excluir)
DROP POLICY IF EXISTS "permission_profiles_update" ON public.permission_profiles;

CREATE POLICY "permission_profiles_update" ON public.permission_profiles
  FOR UPDATE USING (public.is_global_admin());
