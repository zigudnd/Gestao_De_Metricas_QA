# Schema do Banco de Dados — ToStatos

> Gerado em: 2026-04-05 | Autor: DBA Expert
> PostgreSQL 15 | Supabase Managed | Schema: `public`

---

## Indice

1. [Tabelas](#tabelas)
2. [Tipos customizados](#tipos-customizados)
3. [Indices](#indices)
4. [Triggers](#triggers)
5. [Functions e RPCs](#functions-e-rpcs)
6. [Constraints](#constraints)

---

## Tabelas

### profiles
Extensao de `auth.users`. Criada automaticamente pelo trigger `handle_new_user`.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | — | PK, FK auth.users CASCADE |
| `email` | text | NOT NULL | — | — |
| `display_name` | text | NOT NULL | — | — |
| `global_role` | text | NOT NULL | `'user'` | CHECK: admin, gerente, user |
| `active` | boolean | NOT NULL | `true` | — |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

---

### squads
Equipes de trabalho. Suportam arquivamento sem exclusao.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `name` | text | NOT NULL | — | — |
| `description` | text | NOT NULL | `''` | — |
| `color` | text | NOT NULL | `'#185FA5'` | — |
| `created_by` | uuid | NULL | — | FK auth.users SET NULL |
| `archived` | boolean | NOT NULL | `false` | — |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

---

### squad_members
Vinculo N:N entre users e squads. Cada membro tem role e permissoes JSONB.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `squad_id` | uuid | NOT NULL | — | FK squads CASCADE |
| `user_id` | uuid | NOT NULL | — | FK auth.users CASCADE, FK profiles CASCADE |
| `role` | squad_role | NOT NULL | `'qa'` | ENUM: qa_lead, qa, stakeholder |
| `permissions` | jsonb | NOT NULL | *21 flags* | — |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

**UNIQUE**: `(squad_id, user_id)` — um usuario por squad.

**Estrutura do JSONB `permissions`** (21 flags booleanas):
```json
{
  "create_sprints": true, "edit_sprints": true, "delete_sprints": false,
  "create_bugs": true, "edit_bugs": true, "delete_bugs": false,
  "create_features": true, "edit_features": true, "delete_features": false,
  "create_test_cases": true, "edit_test_cases": true, "delete_test_cases": false,
  "create_suites": true, "edit_suites": true, "delete_suites": false,
  "create_blockers": true, "edit_blockers": true, "delete_blockers": false,
  "create_alignments": true, "edit_alignments": true, "delete_alignments": false
}
```

---

### permission_profiles
Templates reutilizaveis de permissoes. 4 perfis de sistema pre-criados.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `name` | text | NOT NULL | — | — |
| `description` | text | NOT NULL | `''` | — |
| `permissions` | jsonb | NOT NULL | *21 flags* | — |
| `is_system` | boolean | NOT NULL | `false` | — |
| `created_by` | uuid | NULL | — | FK auth.users SET NULL |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

**Perfis de sistema**:
| Nome | Descricao |
|---|---|
| Somente Leitura | Tudo false — nenhuma acao permitida |
| QA Padrao | CRUD de bugs, test_cases, blockers, alignments |
| QA Senior | Tudo exceto delete_sprints |
| Acesso Total | Todas as 21+9 flags true |

---

### sprints
Estado completo de uma sprint armazenado em JSONB.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | text | NOT NULL | — | PK |
| `data` | jsonb | NOT NULL | — | SprintState completo |
| `status` | text | NOT NULL | `'ativa'` | CHECK: ativa, concluida |
| `squad_id` | uuid | NOT NULL | `'a0000000-...-000000000001'` | FK squads SET NULL |
| `updated_at` | timestamptz | NOT NULL | `now()` | Trigger auto |

**Conteudo do JSONB `data`**: config (nome, periodo, squad), features[], bugs[], testCases[], suites[], blockers[], alignments[], notes[], reports{dia: dados}.

---

### status_reports
Relatorios de status semanal com secoes e itens.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | text | NOT NULL | — | PK |
| `data` | jsonb | NOT NULL | `'{}'` | StatusReportState |
| `squad_id` | uuid | NOT NULL | `'a0000000-...-000000000001'` | FK squads SET NULL |
| `status` | text | NULL | `'active'` | CHECK: active, concluded |
| `updated_at` | timestamptz | NULL | `now()` | Trigger auto |

**Conteudo do JSONB `data`**: title, squad, period{start,end}, sections[{name, items[{title, owner, status, dates, predecessors, duration}]}], config.

---

### releases
Pipeline de releases com 9 estados possiveis.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | text | NOT NULL | — | PK |
| `data` | jsonb | NOT NULL | `'{}'` | Release completo |
| `status` | text | NOT NULL | `'planejada'` | CHECK: 9 valores |
| `version` | text | NULL | — | — |
| `production_date` | date | NULL | — | — |
| `updated_at` | timestamptz | NULL | `now()` | Trigger auto |

**Valores validos de `status`**: planejada, em_desenvolvimento, corte, em_homologacao, em_regressivo, aprovada, em_producao, concluida, uniu_escopo.

---

### audit_logs
Log de auditoria imutavel. Inserido via RPC `audit_action` (anti-forging).

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NULL | — | FK auth.users SET NULL |
| `user_email` | text | NULL | — | — |
| `resource_type` | text | NOT NULL | — | sprint, status_report, squad |
| `resource_id` | text | NOT NULL | — | — |
| `action` | text | NOT NULL | — | create, update, delete |
| `changes` | jsonb | NULL | `'{}'` | `{campo: {old, new}}` |
| `created_at` | timestamptz | NULL | `now()` | — |

---

### squad_config
Configuracao unica por squad (1:1).

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `squad_id` | uuid | NULL | — | FK squads CASCADE, UNIQUE |
| `data` | jsonb | NOT NULL | `'{}'` | — |
| `updated_at` | timestamptz | NULL | `now()` | Trigger auto |

---

### dashboard_states
Estado generico de dashboards por project_key. Sem FK para squads.

| Coluna | Tipo | Nullable | Default | Constraint |
|---|---|---|---|---|
| `project_key` | text | NOT NULL | — | PK |
| `payload` | jsonb | NOT NULL | `'{}'` | — |
| `updated_at` | timestamptz | NULL | `now()` | Trigger auto |

---

## Tipos Customizados

| Tipo | Valores | Usado em |
|---|---|---|
| `squad_role` | `qa_lead`, `qa`, `stakeholder` | `squad_members.role` |

---

## Indices

### Indices de Performance (RLS)
| Indice | Tabela | Colunas | Proposito |
|---|---|---|---|
| `idx_squad_members_user_squad_role` | squad_members | `(user_id, squad_id, role)` | Covering: is_squad_member + is_squad_lead |
| `idx_profiles_id_role` | profiles | `(id, global_role)` | is_global_admin() |

### Indices de Sync Incremental
| Indice | Tabela | Colunas | Proposito |
|---|---|---|---|
| `idx_sprints_updated_at` | sprints | `(updated_at DESC)` | syncAllFromSupabase |
| `idx_status_reports_updated` | status_reports | `(updated_at DESC)` | syncAllFromSupabase |
| `idx_releases_updated_at` | releases | `(updated_at DESC)` | syncAllFromSupabase |
| `idx_dashboard_states_updated` | dashboard_states | `(updated_at DESC)` | — |

### Indices de FK/Filtro
| Indice | Tabela | Colunas | Proposito |
|---|---|---|---|
| `idx_sprints_squad_id` | sprints | `(squad_id)` | RLS + filtro por squad |
| `idx_status_reports_squad_id` | status_reports | `(squad_id)` | RLS + filtro por squad |
| `idx_status_reports_squad` | status_reports | `(squad_id)` | Duplicado (legado) |
| `idx_squad_config_squad` | squad_config | `(squad_id)` | FK lookup |
| `idx_releases_status` | releases | `(status)` | Filtro por status |
| `idx_releases_production_date` | releases | `(production_date)` | Filtro por data |
| `idx_audit_logs_resource` | audit_logs | `(resource_type, resource_id)` | Busca por recurso |
| `idx_audit_logs_created` | audit_logs | `(created_at DESC)` | Timeline |
| `idx_audit_logs_user` | audit_logs | `(user_id)` | Busca por usuario |

---

## Triggers

| Trigger | Tabela | Evento | Funcao |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `set_sprints_updated_at` | `sprints` | BEFORE UPDATE | `set_updated_at()` |
| `set_status_reports_updated_at` | `status_reports` | BEFORE UPDATE | `set_updated_at()` |
| `set_releases_updated_at` | `releases` | BEFORE UPDATE | `set_updated_at()` |
| `set_squad_config_updated_at` | `squad_config` | BEFORE UPDATE | `set_updated_at()` |
| `set_dashboard_states_updated_at` | `dashboard_states` | BEFORE UPDATE | `set_updated_at()` |

---

## Functions e RPCs

### Triggers

| Funcao | Tipo | Security | Proposito |
|---|---|---|---|
| `handle_new_user()` | trigger | DEFINER | Auto-cria profile ao registrar usuario |
| `set_updated_at()` | trigger | — | Atualiza `updated_at` automaticamente |

### RLS Helpers

| Funcao | Retorno | Security | Proposito |
|---|---|---|---|
| `is_global_admin()` | boolean | DEFINER | Verifica `profiles.global_role = 'admin'` |
| `is_squad_member(uuid)` | boolean | DEFINER | Verifica membership OU admin bypass |
| `is_squad_lead(uuid)` | boolean | DEFINER | Verifica role qa_lead OU admin bypass |

### RPCs Invocaveis pelo Client

| Funcao | Parametros | Retorno | Security | Proposito |
|---|---|---|---|---|
| `create_squad_with_lead` | name, owner_id, desc?, color? | json (squad) | DEFINER | Cria squad + membro atomicamente |
| `get_user_squad_ids` | user_id | setof uuid | DEFINER | Lista squads do usuario |
| `audit_action` | resource_type, resource_id, action, changes? | uuid | DEFINER | Insere log de auditoria (anti-forging) |

---

## Constraints

### CHECK Constraints
| Tabela | Constraint | Valores Validos |
|---|---|---|
| `profiles` | `profiles_global_role_check` | admin, gerente, user |
| `sprints` | `chk_sprints_status` | ativa, concluida |
| `status_reports` | `chk_status_reports_status` | active, concluded |
| `releases` | `chk_releases_status` | planejada, em_desenvolvimento, corte, em_homologacao, em_regressivo, aprovada, em_producao, concluida, uniu_escopo |

### UNIQUE Constraints
| Tabela | Colunas |
|---|---|
| `squad_members` | `(squad_id, user_id)` |
| `squad_config` | `(squad_id)` |
