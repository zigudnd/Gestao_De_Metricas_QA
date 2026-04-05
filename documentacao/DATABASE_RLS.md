# Politicas de Row Level Security (RLS) — ToStatos

> Gerado em: 2026-04-05 | Autor: DBA Expert
> Todas as tabelas possuem `ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY`

---

## Modelo de Acesso

O sistema usa 3 niveis de acesso, verificados por helper functions `SECURITY DEFINER`:

```
Admin (global_role = 'admin')
  └── Acesso total a todas as tabelas (bypass de squad membership)

Gerente (global_role = 'gerente')
  └── Igual a membro + permissao de escrita em releases

Membro (squad_member)
  └── Acesso limitado aos recursos do(s) squad(s) que pertence
      ├── qa_lead: CRUD completo
      ├── qa: CRUD conforme permissions JSONB
      └── stakeholder: leitura
```

---

## Policies por Tabela

### profiles

| Policy | Operacao | Regra |
|---|---|---|
| `profiles_select_all` | SELECT | Qualquer `authenticated` |
| `profiles_update` | UPDATE | Proprio usuario OU admin |

> Nota: emails visiveis a todos autenticados (necessario para convites/mencoes).

---

### squads

| Policy | Operacao | Regra |
|---|---|---|
| `squads_select` | SELECT | `is_squad_member(id)` E (`NOT archived` OU admin) |
| `squads_insert_authenticated` | INSERT | `auth.uid() = created_by` |
| `squads_update_lead` | UPDATE | `is_squad_lead(id)` |
| `squads_delete_lead` | DELETE | `is_squad_lead(id)` |

> Squads arquivados: invisiveis para membros, visiveis apenas para admin.

---

### squad_members

| Policy | Operacao | Regra |
|---|---|---|
| `squad_members_select` | SELECT | `is_squad_member(squad_id)` |
| `squad_members_insert` | INSERT | Proprio usuario OU `is_squad_lead(squad_id)` |
| `squad_members_update_lead` | UPDATE | `is_squad_lead(squad_id)` |
| `squad_members_delete` | DELETE | Proprio usuario OU `is_squad_lead(squad_id)` |

> Membro pode sair sozinho (DELETE proprio), mas so lead pode remover outros.

---

### sprints

| Policy | Operacao | Regra |
|---|---|---|
| `sprints_select` | SELECT | Admin OU `is_squad_member(squad_id)` |
| `sprints_insert` | INSERT | Admin OU `is_squad_member(squad_id)` |
| `sprints_update` | UPDATE | Admin OU `is_squad_member(squad_id)` |
| `sprints_delete` | DELETE | Admin OU `is_squad_lead(squad_id)` |

> Delete restrito a lead/admin. squad_id e NOT NULL desde migration 026.

---

### status_reports

| Policy | Operacao | Regra |
|---|---|---|
| `status_reports_select` | SELECT | Admin OU `is_squad_member(squad_id)` |
| `status_reports_insert` | INSERT | Admin OU `is_squad_member(squad_id)` |
| `status_reports_update` | UPDATE | Admin OU `is_squad_member(squad_id)` |
| `status_reports_delete` | DELETE | Admin OU `is_squad_lead(squad_id)` |

> Padronizado com helpers na migration 028.

---

### releases

| Policy | Operacao | Regra |
|---|---|---|
| `releases_select_authenticated` | SELECT | Qualquer `authenticated` |
| `releases_insert_admin` | INSERT | Admin OU gerente |
| `releases_update_admin` | UPDATE | Admin OU gerente |
| `releases_delete_admin` | DELETE | Admin OU gerente |

> Releases sao globais (sem squad_id). Leitura aberta, escrita restrita.

---

### audit_logs

| Policy | Operacao | Regra |
|---|---|---|
| `audit_logs_select` | SELECT | Admin OU logs de sprints/reports dos squads do user OU logs proprios |
| `audit_logs_insert` | INSERT | `user_id = auth.uid()` (anti-forging) |

> Nao ha UPDATE/DELETE — logs sao imutaveis.

---

### permission_profiles

| Policy | Operacao | Regra |
|---|---|---|
| `permission_profiles_select` | SELECT | Qualquer `authenticated` |
| `permission_profiles_insert` | INSERT | Admin |
| `permission_profiles_update` | UPDATE | Admin |
| `permission_profiles_delete` | DELETE | Admin E `NOT is_system` |

> Perfis de sistema nao podem ser excluidos, apenas editados.

---

### squad_config

| Policy | Operacao | Regra |
|---|---|---|
| `squad_config_select` | SELECT | Admin OU membro do squad |
| `squad_config_modify` | ALL | Admin OU membro do squad |

---

### dashboard_states

| Policy | Operacao | Regra |
|---|---|---|
| `dashboard_states_select` | SELECT | Qualquer `authenticated` |
| `dashboard_states_write` | ALL | Admin apenas |

> Corrigido na migration 027 — antes era USING(true) para escrita.

---

## Helper Functions (SECURITY DEFINER)

Essas funcoes bypassam RLS internamente para evitar recursao infinita nas policies.

```sql
-- Verifica se o usuario logado e admin global
is_global_admin() -> boolean
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND global_role = 'admin'
  )

-- Verifica membership no squad (admin sempre retorna true)
is_squad_member(p_squad_id uuid) -> boolean
  SELECT is_global_admin()
    OR EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = p_squad_id AND user_id = auth.uid()
    )

-- Verifica lideranca no squad (admin sempre retorna true)
is_squad_lead(p_squad_id uuid) -> boolean
  SELECT is_global_admin()
    OR EXISTS (
      SELECT 1 FROM squad_members
      WHERE squad_id = p_squad_id AND user_id = auth.uid() AND role = 'qa_lead'
    )
```

---

## Matriz de Acesso Resumida

| Tabela | Anon | User (membro) | QA Lead | Gerente | Admin |
|---|---|---|---|---|---|
| profiles | - | R | R | R | RU |
| squads | - | R (own) | RUD | R (own) | CRUD |
| squad_members | - | R (own) | CRUD | R (own) | CRUD |
| sprints | - | RU (squad) | CRUD (squad) | RU (squad) | CRUD |
| status_reports | - | RU (squad) | CRUD (squad) | RU (squad) | CRUD |
| releases | - | R | R | CRUD | CRUD |
| audit_logs | - | R (own) | R (squad) | R (own) | R (all) |
| permission_profiles | - | R | R | R | CRUD |
| squad_config | - | RU (squad) | RU (squad) | RU (squad) | CRUD |
| dashboard_states | - | R | R | R | CRUD |

> **R** = Read, **U** = Update, **D** = Delete, **C** = Create
> **(own)** = apenas recursos do proprio squad
