-- ── Tabela de perfis de permissão ────────────────────────────────────────────

create table if not exists public.permission_profiles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  permissions jsonb not null default '{
    "delete_sprints":    false,
    "delete_bugs":       false,
    "delete_features":   false,
    "delete_test_cases": false,
    "delete_suites":     false,
    "delete_blockers":   false,
    "delete_alignments": false
  }'::jsonb,
  is_system   boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Realtime
alter publication supabase_realtime add table permission_profiles;

-- RLS
alter table public.permission_profiles enable row level security;

-- Qualquer autenticado pode ler perfis
create policy "permission_profiles_select" on public.permission_profiles
  for select to authenticated using (true);

-- Apenas admin pode inserir/atualizar/excluir
create policy "permission_profiles_insert" on public.permission_profiles
  for insert with check (public.is_global_admin());

create policy "permission_profiles_update" on public.permission_profiles
  for update using (public.is_global_admin() and not is_system);

create policy "permission_profiles_delete" on public.permission_profiles
  for delete using (public.is_global_admin() and not is_system);

-- ── Perfis padrão do sistema ──────────────────────────────────────────────────

insert into public.permission_profiles (name, description, permissions, is_system) values
(
  'Somente Leitura',
  'Pode visualizar tudo, mas não pode excluir nenhum item.',
  '{"delete_sprints":false,"delete_bugs":false,"delete_features":false,"delete_test_cases":false,"delete_suites":false,"delete_blockers":false,"delete_alignments":false}',
  true
),
(
  'QA Padrão',
  'Pode excluir bugs, casos de teste, bloqueios e alinhamentos.',
  '{"delete_sprints":false,"delete_bugs":true,"delete_features":false,"delete_test_cases":true,"delete_suites":false,"delete_blockers":true,"delete_alignments":true}',
  true
),
(
  'QA Sênior',
  'Pode excluir tudo exceto sprints.',
  '{"delete_sprints":false,"delete_bugs":true,"delete_features":true,"delete_test_cases":true,"delete_suites":true,"delete_blockers":true,"delete_alignments":true}',
  true
),
(
  'Acesso Total',
  'Pode excluir qualquer item. Equivalente a QA Lead.',
  '{"delete_sprints":true,"delete_bugs":true,"delete_features":true,"delete_test_cases":true,"delete_suites":true,"delete_blockers":true,"delete_alignments":true}',
  true
);
