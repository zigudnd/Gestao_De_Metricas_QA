# ÉPICO: API REST Pública — ToStatos

> **Epic ID:** API-PUBLIC
> **Produto:** ToStatos — Hub de Qualidade
> **Autor:** Marina Caldas (PO)
> **Data:** 06/04/2026
> **Status:** Pronto para Desenvolvimento
> **Prioridade:** 🔴 Alta

---

## Visão

O ToStatos hoje é uma aplicação fechada — os dados só são acessíveis pela interface web. Para adoção em empresas com DevOps maduro, é essencial que pipelines de CI/CD possam **criar bugs automaticamente**, bots de Slack possam **consultar métricas**, e ferramentas externas possam **atualizar status de releases**.

A API pública transforma o ToStatos de **ferramenta visual** em **plataforma integrável**.

### Casos de uso reais

| Integração | Endpoint necessário | Exemplo |
|---|---|---|
| **Pipeline CI/CD** | `POST /api/v1/sprints/:id/bugs` | Jenkins/GitHub Actions detecta falha → cria bug automaticamente no sprint ativo |
| **Bot Slack** | `GET /api/v1/sprints/:id/metrics` | `/qa-status` no Slack → retorna Health Score, bugs abertos, % execução |
| **Dashboard TV** | `GET /api/v1/releases` | TV do escritório exibe status das releases em tempo real |
| **Jira Webhook** | `PATCH /api/v1/releases/:id/status` | Deploy para produção → atualiza status da release para `em_producao` |
| **Relatório automático** | `GET /api/v1/sprints/:id` | Script Python gera relatório semanal combinando dados do ToStatos |

---

## Decisões Arquiteturais

### 1. Versionamento: `/api/v1/`

Prefixo de versão desde o início. Permite evoluir sem quebrar integrações existentes.

### 2. Autenticação: API Keys (Bearer token)

Tokens gerados por admin na interface, armazenados na tabela `api_keys`. Mais simples que OAuth2 para integrações M2M (machine-to-machine).

```
Authorization: Bearer tok_abc123def456...
```

### 3. Refatoração do server.js em Routers

O `server.js` atual tem todos os endpoints num único arquivo. A API pública exige separação:

```
server.js                     → bootstrap + middleware
routes/
├── admin.routes.js           → /api/admin/* (existentes)
├── flush.routes.js           → /api/*-flush (existentes)
├── v1/
│   ├── sprints.routes.js     → /api/v1/sprints/*
│   ├── releases.routes.js    → /api/v1/releases/*
│   ├── squads.routes.js      → /api/v1/squads/*
│   └── apikeys.routes.js     → /api/v1/api-keys/*
middleware/
├── requireAuth.js            → Bearer token (existente, extraído)
├── requireApiKey.js          → API Key validation (novo)
└── validate.js               → Zod validation (existente, extraído)
```

### 4. Respostas padronizadas

```json
// Sucesso
{
  "data": { ... },
  "meta": { "requestId": "req_abc123", "timestamp": "2026-04-06T..." }
}

// Erro
{
  "error": {
    "code": "SPRINT_NOT_FOUND",
    "message": "Sprint com id 'xyz' não encontrada",
    "status": 404
  },
  "meta": { "requestId": "req_abc123" }
}

// Lista com paginação
{
  "data": [ ... ],
  "meta": { "total": 42, "page": 1, "perPage": 20, "requestId": "req_abc123" }
}
```

---

## Fases de Entrega

| Fase | Conteúdo | Valor |
|------|----------|-------|
| **Fase 1** | Infra (routers, API Keys, middleware, testes) | Base sólida |
| **Fase 2** | Endpoints de leitura (GET sprints, métricas, releases) | Dashboards/bots |
| **Fase 3** | Endpoints de escrita (POST bug, PATCH release status) | CI/CD |
| **Fase 4** | Rate limiting avançado, webhooks, SDK | Adoção enterprise |

---

# FASE 1 — Infraestrutura

---

## STORY-01: Refatorar server.js em módulos de rotas

**Como** desenvolvedor
**Quero** o server.js organizado em routers separados
**Para que** a API pública tenha uma base limpa e testável

### Critérios de Aceite

- [ ] **CA01** — Criar pasta `routes/` com arquivos separados por domínio
- [ ] **CA02** — Extrair endpoints existentes de `server.js` para routers:
  - `routes/admin.routes.js` → `POST /api/admin/create-user`, `POST /api/admin/reset-password`
  - `routes/flush.routes.js` → `POST /api/sprint-flush`, `POST /api/status-report-flush`, `POST /api/release-flush`
  - `routes/dashboard.routes.js` → `GET/PUT /api/dashboard/:projectKey`
- [ ] **CA03** — Extrair middleware para `middleware/`:
  - `middleware/requireAuth.js` → `requireAdminAuth` existente
  - `middleware/validate.js` → `validateBody` + schemas Zod
  - `middleware/rateLimiter.js` → rate limiters existentes
- [ ] **CA04** — `server.js` fica apenas com: imports, app setup, middleware global, `app.use()` dos routers, `app.listen()`
- [ ] **CA05** — Todos os endpoints existentes continuam funcionando identicamente (zero breaking changes)
- [ ] **CA06** — Swagger continua funcionando em `/api/docs`
- [ ] **CA07** — Testes unitários para cada middleware extraído

**Story Points:** 5

---

## STORY-02: Sistema de API Keys

**Como** admin
**Quero** gerar API Keys para integrações externas
**Para que** sistemas possam autenticar sem credenciais de usuário

### Critérios de Aceite

- [ ] **CA01** — Migration Supabase: tabela `api_keys`:
  ```sql
  CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    permissions JSONB NOT NULL DEFAULT '{}',
    squad_ids TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES profiles(id),
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [ ] **CA02** — RLS: apenas admin/gerente pode criar/listar/revogar keys
- [ ] **CA03** — Endpoint `POST /api/v1/api-keys` — gera token, retorna uma única vez (raw), armazena hash
- [ ] **CA04** — Endpoint `GET /api/v1/api-keys` — lista keys (sem raw, apenas prefix + name + permissions + last_used)
- [ ] **CA05** — Endpoint `DELETE /api/v1/api-keys/:id` — revoga key (soft delete: `is_active = false`)
- [ ] **CA06** — Token formato: `tok_` + 48 chars random (base62)
- [ ] **CA07** — Middleware `requireApiKey`: extrai token do header, hash SHA-256, busca na tabela, valida active + não expirado, injeta `req.apiKey` com permissions
- [ ] **CA08** — Testes unitários para geração, hash, validação, expiração, revogação
- [ ] **CA09** — Swagger documentado

**Story Points:** 8

---

## STORY-03: Interface de gestão de API Keys

**Como** admin
**Quero** gerenciar API Keys pela interface web
**Para que** eu não precise usar o terminal

### Critérios de Aceite

- [ ] **CA01** — Nova aba "API Keys" em Cadastros (após Usuários, visível apenas para admin)
- [ ] **CA02** — Listagem: nome, prefixo, permissões (badges), último uso, status, data de criação
- [ ] **CA03** — Botão "+ Nova Key" abre modal com: Nome, Permissões (checkboxes), Squads (multi-select), Expiração
- [ ] **CA04** — Ao criar: modal exibe token completo com botão "Copiar" + aviso "Este token não será exibido novamente"
- [ ] **CA05** — Botão "Revogar" com confirmação
- [ ] **CA06** — Busca por nome

**Story Points:** 5

---

# FASE 2 — Endpoints de Leitura

---

## STORY-04: GET Sprints

**Como** sistema externo
**Quero** listar e consultar sprints via API
**Para que** bots e dashboards exibam dados de QA

### Critérios de Aceite

- [ ] **CA01** — `GET /api/v1/sprints` — Lista com paginação (`?page=1&perPage=20&status=ativa&squadId=uuid`)
- [ ] **CA02** — `GET /api/v1/sprints/:id` — Sprint completa (SprintState)
- [ ] **CA03** — `GET /api/v1/sprints/:id/metrics` — KPIs calculados (healthScore, totalTests, execPercent, openBugs, mttr, retestIndex)
- [ ] **CA04** — `GET /api/v1/sprints/:id/bugs` — Lista bugs do sprint
- [ ] **CA05** — Respostas com formato padronizado (data + meta + requestId)
- [ ] **CA06** — Validação Zod em params e query strings
- [ ] **CA07** — Testes unitários (happy path + edge cases)
- [ ] **CA08** — Swagger documentado com schemas e exemplos

**Story Points:** 5

---

## STORY-05: GET Releases

**Como** sistema externo
**Quero** consultar releases e métricas via API

### Critérios de Aceite

- [ ] **CA01** — `GET /api/v1/releases` — Lista com paginação e filtro por status
- [ ] **CA02** — `GET /api/v1/releases/:id` — Release completa
- [ ] **CA03** — `GET /api/v1/releases/:id/metrics` — ReleaseMetrics calculadas
- [ ] **CA04** — Testes unitários + Swagger

**Story Points:** 3

---

## STORY-06: GET Squads

**Como** sistema externo
**Quero** listar squads e membros

### Critérios de Aceite

- [ ] **CA01** — `GET /api/v1/squads` — Lista squads (filtrada por API Key squad_ids se configurado)
- [ ] **CA02** — `GET /api/v1/squads/:id/members` — Membros do squad
- [ ] **CA03** — Testes unitários + Swagger

**Story Points:** 3

---

# FASE 3 — Endpoints de Escrita

---

## STORY-07: POST Bug via API

**Como** pipeline CI/CD
**Quero** criar bugs automaticamente no sprint ativo

### Critérios de Aceite

- [ ] **CA01** — `POST /api/v1/sprints/:id/bugs` com body validado (desc, feature, stack, severity, assignee, notes)
- [ ] **CA02** — Validação Zod: desc obrigatório (1-500 chars), severity enum, stack enum
- [ ] **CA03** — Bug inserido no JSONB da sprint
- [ ] **CA04** — `openedAt` preenchido automaticamente
- [ ] **CA05** — Sprint deve existir e estar ativa
- [ ] **CA06** — Testes: criação válida, sprint inexistente, sprint concluída, body inválido, permissão negada

**Story Points:** 5

---

## STORY-08: PATCH Release Status via API

**Como** pipeline de deploy
**Quero** atualizar status de release automaticamente

### Critérios de Aceite

- [ ] **CA01** — `PATCH /api/v1/releases/:id/status` com body `{ status, reason }`
- [ ] **CA02** — `PATCH /api/v1/releases/:id/rollout` com body `{ rolloutPct }` (0-100)
- [ ] **CA03** — Transição registrada em `statusHistory[]`
- [ ] **CA04** — Release deve existir e não estar `concluida`
- [ ] **CA05** — Testes: transição válida, release inexistente, release concluída, status inválido

**Story Points:** 5

---

# RESUMO

| Fase | Stories | Pontos |
|------|---------|--------|
| **Fase 1 — Infra** | 01, 02, 03 | 18 |
| **Fase 2 — Leitura** | 04, 05, 06 | 11 |
| **Fase 3 — Escrita** | 07, 08 | 10 |
| **TOTAL** | **8 stories** | **39 pontos** |

## Direcionamento

| Perfil | Stories |
|---|---|
| **BACK** | 01, 02, 04, 05, 06, 07, 08 |
| **DBA** | 02 (migration api_keys) |
| **FRONT** | 03 (UI API Keys) |

## Mapa de Dependências

```
STORY-01 (Refactor server.js)
    │
    └──▶ STORY-02 (API Keys + middleware)
              │
              ├──▶ STORY-03 (UI Keys) [FRONT, paralelo]
              ├──▶ STORY-04 (GET Sprints)
              ├──▶ STORY-05 (GET Releases)
              ├──▶ STORY-06 (GET Squads)
              ├──▶ STORY-07 (POST Bug)
              └──▶ STORY-08 (PATCH Release)
```
