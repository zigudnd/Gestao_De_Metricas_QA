-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix #1: RPC para audit logging — anti-forging (server garante user_id)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.audit_action(
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_action TEXT,
  p_changes JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_email TEXT;
BEGIN
  -- Busca email do usuário autenticado
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  INSERT INTO public.audit_logs (
    user_id, user_email, resource_type, resource_id, action, changes
  ) VALUES (
    auth.uid(),
    COALESCE(v_email, 'system'),
    p_resource_type,
    p_resource_id,
    p_action,
    p_changes
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_action(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════
-- Fix #2: Error handling no trigger handle_new_user
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log do erro mas não bloqueia a criação do usuário
  RAISE LOG 'handle_new_user falhou para user %: %', new.id, SQLERRM;
  RETURN new;
END;
$$;
