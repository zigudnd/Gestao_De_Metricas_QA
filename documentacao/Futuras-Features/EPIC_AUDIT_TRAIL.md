# Feature: UI de Audit Trail

> **Produto:** ToStatos — Hub de Qualidade
> **Autor:** Marina Caldas (PO)
> **Data:** 06/04/2026
> **Status:** Pronto para Desenvolvimento
> **Prioridade:** 🟡 Média

---

## Contexto

A tabela `audit_logs` existe no banco com:
- Colunas: `user_id`, `user_email`, `resource_type`, `resource_id`, `action`, `changes` (JSONB), `created_at`
- RPC `audit_action()` (SECURITY DEFINER) para inserção segura
- `logAudit()` chamado em: create/delete bug (sprintStore), create/delete item (statusReportStore)
- RLS habilitado: qualquer autenticado pode ler
- Índices: resource_type+id, created_at DESC, user_id

Mas **não existe interface** para visualizar esses logs.

## Stories

---

### STORY-01: Endpoint API para listar audit logs

**Como** admin
**Quero** consultar logs de auditoria via API
**Para que** a UI e integrações externas possam exibir o histórico

#### Critérios de Aceite

- [ ] **CA01** — `GET /api/v1/audit-logs` com paginação (`?page=1&perPage=50`)
- [ ] **CA02** — Filtros via query: `?resourceType=sprint&action=delete&userId=uuid&from=2026-04-01&to=2026-04-06`
- [ ] **CA03** — Protegido por `requireApiKey('audit:read')` OU `requireAdminAuth`
- [ ] **CA04** — Response padronizada com `data`, `meta` (total, page, perPage)
- [ ] **CA05** — Swagger documentado
- [ ] **CA06** — Testes unitários

**Perfil:** BACK | **Pontos:** 3

---

### STORY-02: Painel de Audit Trail em Cadastros

**Como** admin
**Quero** ver uma timeline visual dos logs de auditoria
**Para que** eu saiba quem fez o quê e quando

#### Critérios de Aceite

- [ ] **CA01** — Nova aba "Audit Trail" em Cadastros (visível apenas para admin, após API Keys)
- [ ] **CA02** — Timeline visual com cards por evento:
  - Avatar/inicial do usuário + email
  - Ação com badge colorido: `create` (verde), `update` (azul), `delete` (vermelho)
  - Tipo de recurso com ícone: Sprint (🎯), Status Report (📄), Release (🚀), Squad (👥)
  - ID do recurso (clicável, navega para o recurso)
  - Data/hora formatada (relativa: "há 2h" ou absoluta: "05/04 14:30")
  - Diff das alterações se disponível (campo `changes`)
- [ ] **CA03** — Filtros:
  - Tipo de recurso: Todos, Sprint, Status Report, Release, Squad (pills)
  - Ação: Todos, Criar, Atualizar, Excluir (pills)
  - Período: De/Até (date inputs)
  - Busca por email do usuário
- [ ] **CA04** — Paginação: "Carregar mais" no final (infinite scroll ou botão)
- [ ] **CA05** — Empty state quando não há logs
- [ ] **CA06** — Loading state durante fetch

#### Fora do escopo
- Não inclui export de logs (CSV/PDF)
- Não inclui notificações em tempo real de novos logs

**Perfil:** FRONT | **Pontos:** 5

---

### STORY-03: Ampliar cobertura do logAudit

**Como** sistema
**Quero** que mais ações sejam logadas
**Para que** o audit trail cubra todas as operações críticas

#### Critérios de Aceite

- [ ] **CA01** — Logar em sprintStore: create sprint, update config, conclude sprint
- [ ] **CA02** — Logar em releaseStore: create release, update status, update rollout, delete release
- [ ] **CA03** — Logar em squadsService: create squad, archive squad, add/remove member, change role
- [ ] **CA04** — Logar em statusReportStore: create report, update config, delete report
- [ ] **CA05** — Cada log inclui `changes` com diff significativo (não logar JSONB inteiro)
- [ ] **CA06** — Sem impacto em performance (fire-and-forget, sem await na UI)

**Perfil:** DEV | **Pontos:** 3

---

## Resumo

| # | Story | Perfil | Pontos |
|---|-------|--------|--------|
| 01 | Endpoint API audit-logs | BACK | 3 |
| 02 | Painel UI Audit Trail | FRONT | 5 |
| 03 | Ampliar cobertura logAudit | DEV | 3 |
| | **TOTAL** | | **11** |

## Dependências

```
STORY-01 (API) ──▶ STORY-02 (UI)
STORY-03 (cobertura) — paralelo, independente
```
