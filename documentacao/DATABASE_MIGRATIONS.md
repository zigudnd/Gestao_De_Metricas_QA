# Historico de Migrations — ToStatos

> Gerado em: 2026-04-05 | Autor: DBA Expert
> Total: 29 migrations | Schema: `public`

---

## Timeline de Migrations

| # | Arquivo | Data | Descricao | Risco |
|---|---|---|---|---|
| 000 | `20260326000000_create_sprints.sql` | 2026-03-26 | Tabela sprints + Realtime | Baixo |
| 001 | `20260327000000_multi_user.sql` | 2026-03-27 | profiles, squads, squad_members, RLS base | Medio |
| 002 | `20260327000001_fix_handle_new_user.sql` | 2026-03-27 | Fix search_path no trigger | Baixo |
| 003 | `20260327000002_create_squad_rpc.sql` | 2026-03-27 | RPC create_squad_with_lead | Baixo |
| 004 | `20260327000003_fix_rls_recursion.sql` | 2026-03-27 | Helpers SECURITY DEFINER p/ RLS | Alto |
| 005 | `20260327000004_global_role_and_permissions.sql` | 2026-03-27 | global_role, permissions JSONB, admin bypass | Medio |
| 006 | `20260327000005_seed_admin_user.sql` | 2026-03-27 | Seed admin profile | Baixo |
| 007 | `20260327000006_permission_profiles.sql` | 2026-03-27 | Tabela permission_profiles + 4 perfis sistema | Baixo |
| 008 | `20260327000007_squad_desc_color_and_user_mgmt.sql` | 2026-03-27 | Campos desc/color/active, RPC atualizado | Baixo |
| 009 | `20260327000008_fix_squad_rpc_overload.sql` | 2026-03-27 | Remove overload ambiguo da RPC | Baixo |
| 010 | `20260327000009_fk_squad_members_profiles.sql` | 2026-03-27 | FK auxiliar p/ PostgREST joins | Baixo |
| 011 | `20260327000010_status_reports.sql` | 2026-03-27 | Tabela status_reports + RLS | Baixo |
| 012 | `20260327000011_audit_logs.sql` | 2026-03-27 | Tabela audit_logs + indices | Baixo |
| 013 | `20260329000012_squad_config.sql` | 2026-03-29 | Tabela squad_config (1:1 com squads) | Baixo |
| 014 | `20260330000013_gerente_role_and_quality_beta.sql` | 2026-03-30 | Role gerente, squad QualityBeta, migracao de dados | Medio |
| 015 | `20260330000014_squad_archive_and_seed.sql` | 2026-03-30 | Coluna archived, policy de visibilidade | Baixo |
| 016 | `20260330000015_allow_edit_system_profiles.sql` | 2026-03-30 | Admin pode editar perfis de sistema | Baixo |
| 017 | `20260330000016_expand_permissions.sql` | 2026-03-30 | 21 flags de permissao (create/edit/delete) | Medio |
| 018 | `20260330000017_fix_backend_rls.sql` | 2026-03-30 | Fix RLS audit_logs, status_reports, squad_config | Alto |
| 019 | `20260330000018_audit_rpc_and_trigger_fix.sql` | 2026-03-30 | RPC audit_action (anti-forging), handle_new_user com EXCEPTION | Medio |
| 020 | `20260330000019_releases.sql` | 2026-03-30 | Tabela releases + RLS permissivo | Baixo |
| 021 | `20260331000020_expand_permissions_releases.sql` | 2026-03-31 | Permissoes p/ releases/status_reports/checkpoints | Baixo |
| 022 | `20260403000021_dashboard_states.sql` | 2026-04-03 | Tabela dashboard_states | Baixo |
| 023 | `20260403000022_fix_releases_rls.sql` | 2026-04-03 | Restringe releases: admin/gerente write | Medio |
| 024 | `20260403000023_add_composite_indices.sql` | 2026-04-03 | Indices compostos p/ performance RLS | Baixo |
| 025 | `20260403000024_updated_at_triggers.sql` | 2026-04-03 | Triggers set_updated_at em 4 tabelas | Baixo |
| 026 | `20260403000025_fix_null_squad_id.sql` | 2026-04-03 | Backfill NULLs + DEFAULT squad_id | Medio |
| 027 | `20260404000026_fix_dashboard_trigger_and_squad_not_null.sql` | 2026-04-04 | Trigger dashboard_states + NOT NULL squad_id | Medio |
| 028 | `20260405000027_fix_rls_and_constraints.sql` | 2026-04-05 | CHECK constraints, dead branch cleanup, consolidar squads SELECT | Alto |
| 029 | `20260405000028_dba_hardening.sql` | 2026-04-05 | FORCE RLS, indices sync, covering index, padronizar policies | Baixo |

---

## Agrupamento por Tema

### Seguranca (RLS)
- 004: Helpers SECURITY DEFINER (fix recursao)
- 005: Admin bypass, global_role
- 018: Fix RLS audit_logs, status_reports, squad_config
- 023: Restringe releases write
- 028: CHECK constraints, cleanup dead branches
- 029: FORCE RLS em todas as tabelas, padronizar policies

### Performance
- 024: Indices compostos (squad_members, profiles, sprints, status_reports)
- 029: Indices updated_at (sprints, releases), covering index (squad_members)

### Schema/Tabelas
- 000: sprints
- 001: profiles, squads, squad_members
- 007: permission_profiles
- 011: status_reports
- 012: audit_logs
- 013: squad_config
- 020: releases
- 022: dashboard_states

### Dados/Migracao
- 006: Seed admin
- 014: Squad QualityBeta + gerente role
- 026: Backfill squad_id NULLs

### Triggers/Functions
- 002-003: Fix trigger handle_new_user, RPC create_squad
- 019: RPC audit_action
- 025: Triggers set_updated_at
- 027: Trigger dashboard_states

---

## Convencoes

- **Numeracao**: `YYYYMMDD` + sequencial de 6 digitos + `_descricao_snake_case.sql`
- **Transacionalidade**: Migrations >= 022 usam `BEGIN; ... COMMIT;`
- **Rollback**: Migrations >= 022 incluem bloco de rollback comentado
- **Idempotencia**: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
- **Migrations aplicadas nunca sao editadas** — correcoes vao em nova migration
