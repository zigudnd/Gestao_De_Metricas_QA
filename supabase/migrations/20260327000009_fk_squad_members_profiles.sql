-- Adiciona FK de squad_members.user_id → profiles.id para que o PostgREST
-- consiga resolver o join `squad_members → profiles` via schema cache.
-- A FK existente para auth.users permanece (cascade delete).

alter table public.squad_members
  add constraint squad_members_user_id_profiles_fk
  foreign key (user_id) references public.profiles(id) on delete cascade;
