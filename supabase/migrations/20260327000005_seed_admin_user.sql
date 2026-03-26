-- ── Usuário admin padrão ──────────────────────────────────────────────────────
-- ATENÇÃO: este arquivo apenas garante que o perfil do admin tenha global_role='admin'.
-- O usuário é criado via script setup-admin.sh (usa a Admin API do GoTrue).
--
-- Se o usuário já existir (criado pelo script), apenas atualiza o role.

update public.profiles
set global_role = 'admin'
where email = 'admin@tostatos.com';
