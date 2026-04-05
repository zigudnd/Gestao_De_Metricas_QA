# Auditoria DBA — ToStatos

> Data: 2026-04-05 | Autor: DBA Expert
> Escopo: Schema completo, 29 migrations, 10 tabelas, ~35 policies RLS

---

## Resumo Executivo

O schema PostgreSQL do ToStatos esta **bem estruturado** para o estagio atual. As 29 migrations formam uma evolucao coerente com correcoes incrementais de seguranca. A auditoria identificou 5 correcoes aplicadas na migration 028 e um backlog de melhorias futuras.

### Score de Saude

| Categoria | Score | Observacao |
|---|---|---|
| **Seguranca (RLS)** | 9/10 | FORCE RLS aplicado, anti-forging em audit, helpers padronizados |
| **Performance** | 7/10 | Indices essenciais presentes, JSONB blob e ponto de atencao |
| **Integridade** | 9/10 | CHECK constraints, NOT NULL, FKs com CASCADE correto |
| **Documentacao** | 8/10 | COMMENTs ausentes nas tabelas, mas docs externas completas |
| **Backup/Retencao** | 6/10 | Depende do Supabase managed, sem politica de retencao p/ audit_logs |

---

## Correcoes Aplicadas (Migration 028)

### 1. FORCE ROW LEVEL SECURITY — 10 tabelas
**Severidade**: ALTA
**Antes**: Apenas `ENABLE ROW LEVEL SECURITY` — service_role bypassava policies silenciosamente.
**Depois**: `FORCE ROW LEVEL SECURITY` garante que ate o table owner respeite as policies.

### 2. Indices de Sync Incremental
**Severidade**: MEDIA
**Antes**: `sprints.updated_at` e `releases.updated_at` sem indice — seq scan em toda sync.
**Depois**: Indices `(updated_at DESC)` em ambas as tabelas.

### 3. Covering Index para is_squad_lead
**Severidade**: MEDIA
**Antes**: `idx_squad_members_user_squad(user_id, squad_id)` — heap fetch para verificar role.
**Depois**: `idx_squad_members_user_squad_role(user_id, squad_id, role)` — index-only scan.

### 4. Policies de status_reports Padronizadas
**Severidade**: MEDIA
**Antes**: Subqueries diretas em squad_members (cadeia de RLS, inconsistente com sprints).
**Depois**: Usa helpers `is_squad_member()`/`is_squad_lead()` como sprints.

### 5. audit_logs INSERT Fortalecido
**Severidade**: BAIXA
**Antes**: Permitia `user_id IS NULL` (rastreabilidade parcial).
**Depois**: Exige `user_id = auth.uid()` (rastreabilidade obrigatoria).

---

## Achados Nao Corrigidos (Backlog)

### ALTA Prioridade

#### Fat JSONB Blob Pattern
**Tabelas**: sprints, status_reports, releases
**Problema**: Cada `_commit` envia o estado inteiro (10-100KB) via upsert. Sem partial update. Uma sessao ativa gera 20-50 writes/minuto.
**Impacto**: I/O excessivo, redo log inflado, VACUUM mais frequente.
**Recomendacao**: Monitorar tamanho com `pg_column_size()`. Quando sprints > 500 rows, considerar partial JSONB update ou decomposicao em tabelas filhas.

#### Realtime Subscription Ausente em Sprints
**Problema**: status_reports e releases usam `initRealtimeSubscription`. Sprints nao. Edicao concorrente causa silent data loss (last-write-wins).
**Recomendacao**: Implementar subscription em sprints seguindo o mesmo padrao dos outros modulos.

### MEDIA Prioridade

#### Campos JSONB Nao Indexaveis
**Problema**: `sprintType`, `releaseId`, `releaseVersion` sao extraidos do blob no client. Nao existem como colunas e nao podem ser indexados.
**Recomendacao**: Extrair para colunas escalares quando filtros forem necessarios.

#### Sync Sem Filtro Explicito de Squad
**Problema**: `syncAllFromSupabase` usa apenas `updated_at > lastSync`. Depende 100% do RLS para scoping. Admin puxa TUDO.
**Recomendacao**: Adicionar `.eq('squad_id', activeSquadId)` nas queries de sync.

#### Indice Duplicado em status_reports
**Problema**: `idx_status_reports_squad` e `idx_status_reports_squad_id` indexam a mesma coluna.
**Recomendacao**: Remover o duplicado em migration futura.

#### audit_logs Sem Politica de Retencao
**Problema**: Tabela cresce indefinidamente. Sem partition, sem TTL.
**Recomendacao**: Implementar rotacao com partition por mes ou cron de limpeza (> 1 ano).

### BAIXA Prioridade

#### COMMENTs Ausentes
**Problema**: Nenhuma tabela/coluna possui `COMMENT ON`. Documentacao depende de docs externos.
**Recomendacao**: Adicionar comments inline nas tabelas principais.

#### Audit_logs SELECT — Subqueries em Cadeia
**Problema**: Policy de SELECT em audit_logs faz subquery em sprints que faz subquery em squad_members. Performance OK para volume pequeno, mas 3 niveis de subquery pode degradar.
**Recomendacao**: Considerar materializar uma coluna `squad_id` em audit_logs para lookup direto.

---

## Proxima Auditoria Recomendada

**Data**: 2026-06-26 (3 meses)

**Foco**:
- Monitorar tamanho do JSONB (`pg_column_size` em sprints, status_reports, releases)
- Verificar indices nao utilizados (`pg_stat_user_indexes WHERE idx_scan = 0`)
- Avaliar necessidade de partition em audit_logs
- Reavaliar performance de sync com volume real
