-- Tabela principal de sprints
create table if not exists sprints (
  id          text primary key,
  data        jsonb not null,
  status      text not null default 'ativa',
  updated_at  timestamptz not null default now()
);

-- Habilita Realtime nessa tabela (notifica todos os clientes conectados em tempo real)
alter publication supabase_realtime add table sprints;
