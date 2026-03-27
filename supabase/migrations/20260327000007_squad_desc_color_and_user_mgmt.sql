-- ── Adiciona descrição e cor aos squads ──────────────────────────────────────

alter table public.squads add column if not exists description text not null default '';
alter table public.squads add column if not exists color text not null default '#185FA5';

-- Adiciona campo active nos profiles (para desativar usuários sem excluir)
alter table public.profiles add column if not exists active boolean not null default true;

-- Atualiza o RPC para aceitar descrição e cor
create or replace function public.create_squad_with_lead(
  squad_name  text,
  owner_id    uuid,
  squad_desc  text default '',
  squad_color text default '#185FA5'
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_squad squads;
begin
  insert into public.squads (name, description, color, created_by)
  values (squad_name, squad_desc, squad_color, owner_id)
  returning * into v_squad;

  insert into public.squad_members (squad_id, user_id, role)
  values (v_squad.id, owner_id, 'qa_lead');

  return row_to_json(v_squad);
end;
$$;

revoke all on function public.create_squad_with_lead(text, uuid, text, text) from public;
grant execute on function public.create_squad_with_lead(text, uuid, text, text) to authenticated;

-- ── Função para buscar squads de um usuário ─────────────────────────────────

create or replace function public.get_user_squad_ids(p_user_id uuid)
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select squad_id from public.squad_members where user_id = p_user_id;
$$;

-- ── RLS: admin pode ver todos os profiles ───────────────────────────────────

-- Permitir admin atualizar o campo active em profiles
-- (a policy de update já existe para admin via is_global_admin, vamos garantir)
