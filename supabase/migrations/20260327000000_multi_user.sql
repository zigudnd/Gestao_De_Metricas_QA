-- ── 1. Profiles (estende auth.users) ─────────────────────────────────────────
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null,
  created_at   timestamptz not null default now()
);

-- Cria perfil automaticamente quando um novo usuário é registrado
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── 2. Squads ─────────────────────────────────────────────────────────────────
create table if not exists squads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ── 3. Squad Members ──────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'squad_role') then
    create type squad_role as enum ('qa_lead', 'qa', 'stakeholder');
  end if;
end $$;

create table if not exists squad_members (
  id         uuid primary key default gen_random_uuid(),
  squad_id   uuid not null references squads(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       squad_role not null default 'qa',
  created_at timestamptz not null default now(),
  unique(squad_id, user_id)
);

-- ── 4. Adiciona squad_id na tabela sprints ────────────────────────────────────
alter table sprints add column if not exists squad_id uuid references squads(id) on delete set null;

-- ── 5. Realtime ───────────────────────────────────────────────────────────────
alter publication supabase_realtime add table squads;
alter publication supabase_realtime add table squad_members;

-- ── 6. RLS ────────────────────────────────────────────────────────────────────
alter table profiles     enable row level security;
alter table squads       enable row level security;
alter table squad_members enable row level security;
alter table sprints      enable row level security;

-- Profiles: qualquer autenticado pode ler (para buscar por email ao convidar)
create policy "profiles_select_all" on profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Squads: apenas membros podem ver
create policy "squads_select_members" on squads
  for select using (
    exists (
      select 1 from squad_members
      where squad_id = squads.id and user_id = auth.uid()
    )
  );

create policy "squads_insert_authenticated" on squads
  for insert with check (auth.uid() = created_by);

create policy "squads_update_lead" on squads
  for update using (
    exists (
      select 1 from squad_members
      where squad_id = squads.id and user_id = auth.uid() and role = 'qa_lead'
    )
  );

create policy "squads_delete_lead" on squads
  for delete using (
    exists (
      select 1 from squad_members
      where squad_id = squads.id and user_id = auth.uid() and role = 'qa_lead'
    )
  );

-- Squad Members: membros podem ver outros membros do mesmo squad
create policy "squad_members_select" on squad_members
  for select using (
    exists (
      select 1 from squad_members sm2
      where sm2.squad_id = squad_members.squad_id and sm2.user_id = auth.uid()
    )
  );

-- qa_lead pode adicionar membros; qualquer um pode entrar se inserindo a si mesmo
create policy "squad_members_insert" on squad_members
  for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from squad_members
      where squad_id = squad_members.squad_id and user_id = auth.uid() and role = 'qa_lead'
    )
  );

create policy "squad_members_update_lead" on squad_members
  for update using (
    exists (
      select 1 from squad_members
      where squad_id = squad_members.squad_id and user_id = auth.uid() and role = 'qa_lead'
    )
  );

-- qa_lead pode remover membros; membro pode sair (remover a si mesmo)
create policy "squad_members_delete" on squad_members
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from squad_members
      where squad_id = squad_members.squad_id and user_id = auth.uid() and role = 'qa_lead'
    )
  );

-- Sprints: apenas membros do squad podem ver/editar
-- squad_id is null = sprint pessoal/legada (acessível a qualquer autenticado por compatibilidade)
create policy "sprints_select" on sprints
  for select using (
    squad_id is null
    or exists (
      select 1 from squad_members
      where squad_id = sprints.squad_id and user_id = auth.uid()
    )
  );

create policy "sprints_insert" on sprints
  for insert with check (
    squad_id is null
    or exists (
      select 1 from squad_members
      where squad_id = sprints.squad_id and user_id = auth.uid()
    )
  );

create policy "sprints_update" on sprints
  for update using (
    squad_id is null
    or exists (
      select 1 from squad_members
      where squad_id = sprints.squad_id and user_id = auth.uid()
    )
  );

create policy "sprints_delete" on sprints
  for delete using (
    squad_id is null
    or exists (
      select 1 from squad_members
      where squad_id = sprints.squad_id and user_id = auth.uid() and role = 'qa_lead'
    )
  );
