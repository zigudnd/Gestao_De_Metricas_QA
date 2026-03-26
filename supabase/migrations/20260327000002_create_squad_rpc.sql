-- RPC: cria squad e adiciona o criador como qa_lead atomicamente.
-- Necessário porque o RLS da tabela squads (SELECT) exige que o usuário
-- já seja membro, o que causaria conflito no INSERT RETURNING antes do membro existir.

create or replace function public.create_squad_with_lead(
  squad_name text,
  owner_id   uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_squad squads;
begin
  -- Insere o squad (bypass do RLS pois security definer)
  insert into public.squads (name, created_by)
  values (squad_name, owner_id)
  returning * into v_squad;

  -- Insere o criador como qa_lead
  insert into public.squad_members (squad_id, user_id, role)
  values (v_squad.id, owner_id, 'qa_lead');

  return row_to_json(v_squad);
end;
$$;

-- Apenas usuários autenticados podem chamar
revoke all on function public.create_squad_with_lead from public;
grant execute on function public.create_squad_with_lead to authenticated;
