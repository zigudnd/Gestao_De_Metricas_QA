-- ── 1. global_role em profiles ────────────────────────────────────────────────
alter table public.profiles
  add column if not exists global_role text not null default 'user'
  check (global_role in ('admin', 'user'));

-- ── 2. permissions em squad_members ───────────────────────────────────────────
alter table public.squad_members
  add column if not exists permissions jsonb not null default '{
    "delete_sprints":    false,
    "delete_bugs":       false,
    "delete_features":   false,
    "delete_test_cases": false,
    "delete_suites":     false,
    "delete_blockers":   false,
    "delete_alignments": false
  }'::jsonb;

-- ── 3. Helper: verifica se o usuário logado é admin global ────────────────────
create or replace function public.is_global_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and global_role = 'admin'
  );
$$;

grant execute on function public.is_global_admin to authenticated;

-- ── 4. Atualiza helpers para admin bypassar squad membership ──────────────────
create or replace function public.is_squad_member(p_squad_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_global_admin()
  or exists (
    select 1 from public.squad_members
    where squad_id = p_squad_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_squad_lead(p_squad_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_global_admin()
  or exists (
    select 1 from public.squad_members
    where squad_id = p_squad_id and user_id = auth.uid() and role = 'qa_lead'
  );
$$;

-- ── 5. Admin pode ver todos os profiles ───────────────────────────────────────
-- (a policy existente já permite select para qualquer autenticado — ok)

-- ── 6. Admin pode atualizar qualquer profile (ex: promover a admin) ───────────
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update" on public.profiles
  for update using (
    auth.uid() = id
    or public.is_global_admin()
  );
