-- ── Correção: recursão infinita nas policies de squad_members ─────────────────
--
-- O problema: a policy SELECT de squad_members consultava squad_members
-- para verificar se o usuário é membro, disparando a mesma policy em loop.
-- Solução: funções security definer que consultam a tabela bypassando RLS.

-- ── 1. Helper functions (security definer = bypass RLS) ───────────────────────

create or replace function public.is_squad_member(p_squad_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
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
  select exists (
    select 1 from public.squad_members
    where squad_id = p_squad_id and user_id = auth.uid() and role = 'qa_lead'
  );
$$;

grant execute on function public.is_squad_member to authenticated;
grant execute on function public.is_squad_lead    to authenticated;

-- ── 2. Recria policies de squad_members sem auto-referência ───────────────────

drop policy if exists "squad_members_select"      on squad_members;
drop policy if exists "squad_members_insert"      on squad_members;
drop policy if exists "squad_members_update_lead" on squad_members;
drop policy if exists "squad_members_delete"      on squad_members;

create policy "squad_members_select" on squad_members
  for select using (is_squad_member(squad_id));

create policy "squad_members_insert" on squad_members
  for insert with check (
    user_id = auth.uid()
    or is_squad_lead(squad_id)
  );

create policy "squad_members_update_lead" on squad_members
  for update using (is_squad_lead(squad_id));

create policy "squad_members_delete" on squad_members
  for delete using (
    user_id = auth.uid()
    or is_squad_lead(squad_id)
  );

-- ── 3. Recria policies de squads usando os helpers ────────────────────────────

drop policy if exists "squads_select_members" on squads;
drop policy if exists "squads_update_lead"    on squads;
drop policy if exists "squads_delete_lead"    on squads;

create policy "squads_select_members" on squads
  for select using (is_squad_member(id));

create policy "squads_update_lead" on squads
  for update using (is_squad_lead(id));

create policy "squads_delete_lead" on squads
  for delete using (is_squad_lead(id));

-- ── 4. Recria policies de sprints usando os helpers ───────────────────────────

drop policy if exists "sprints_select" on sprints;
drop policy if exists "sprints_insert" on sprints;
drop policy if exists "sprints_update" on sprints;
drop policy if exists "sprints_delete" on sprints;

create policy "sprints_select" on sprints
  for select using (
    squad_id is null
    or is_squad_member(squad_id)
  );

create policy "sprints_insert" on sprints
  for insert with check (
    squad_id is null
    or is_squad_member(squad_id)
  );

create policy "sprints_update" on sprints
  for update using (
    squad_id is null
    or is_squad_member(squad_id)
  );

create policy "sprints_delete" on sprints
  for delete using (
    squad_id is null
    or is_squad_lead(squad_id)
  );
