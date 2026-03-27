# Contexto Completo do Projeto — ToStatos QA Dashboard

> **Objetivo deste documento:** Fornecer contexto completo para onboarding rapido em novas conversas.
> Leia este arquivo antes de iniciar qualquer tarefa no projeto.
> **Ultima atualizacao:** Março 2026

---

## 1. O que e o ToStatos

Plataforma de gestao de metricas QA para acompanhamento de sprints ageis. Centraliza KPIs, progresso de execucao de testes, bugs, bloqueios, alinhamentos tecnicos e notas operacionais em um unico dashboard colaborativo.

**Modos de operacao:**
1. **Offline** — localStorage apenas, sem servidor, usuario unico
2. **Local colaborativo** — Supabase via Docker na rede local
3. **Cloud** — Supabase Cloud para acesso global

---

## 2. Stack Tecnica

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend | React | 19.x |
| Language | TypeScript | 5.9 |
| Build | Vite | 6.4 |
| CSS | Tailwind CSS v4 + tema customizado (`@theme` em index.css) |
| State | Zustand | 5.x |
| Routing | React Router DOM v7 (HashRouter) |
| Charts | Chart.js 4.x + react-chartjs-2 5.x + chartjs-plugin-datalabels 2.x |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Export | html2canvas (JPG) |
| Backend | Node.js + Express 4.x (`server.js`, porta 3000) |
| Database | Supabase (PostgreSQL + Realtime + Auth/GoTrue) |
| Client DB | @supabase/supabase-js 2.x |
| E2E | Playwright 1.58 |
| Fonts | IBM Plex Sans, IBM Plex Mono |

**Alias:** `@/*` → `src/*`

---

## 3. Estrutura de Diretorios

```
src/
├── main.tsx                           # Entry point React
├── index.css                          # Tailwind v4 @import + @theme (cores, fontes)
├── lib/
│   └── supabase.ts                    # Cliente Supabase singleton
├── app/
│   ├── components/
│   │   ├── ConfirmModal.tsx           # Modal de confirmacao reutilizavel
│   │   ├── NewBugModal.tsx            # Modal de criacao de bug
│   │   ├── ProtectedRoute.tsx         # Guard de autenticacao (redireciona p/ /login)
│   │   └── TermoConclusaoModal.tsx    # Modal de conclusao de sprint
│   ├── layout/
│   │   ├── AppShell.tsx               # Layout raiz — syncAllFromSupabase no mount
│   │   ├── Sidebar.tsx                # Navegacao lateral com icones
│   │   ├── Topbar.tsx                 # Barra superior com acoes contextuais
│   │   └── SaveToast.tsx              # Toast de "Salvo" (observa lastSaved)
│   ├── pages/
│   │   └── DocsPage.tsx               # Pagina de documentacao do sistema
│   └── routes.tsx                     # Hash Router com todas as rotas
├── modules/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx           # Login / Registro
│   │   │   ├── ProfilePage.tsx        # Editar perfil (display_name)
│   │   │   └── ChangePasswordPage.tsx # Troca de senha
│   │   └── store/
│   │       └── authStore.ts           # Zustand: user, session, profile, signOut
│   ├── sprints/
│   │   ├── components/dashboard/
│   │   │   ├── OverviewTab.tsx        # Dashboard de resumo com KPIs e graficos
│   │   │   ├── ReportTab.tsx          # Daily Report por data
│   │   │   ├── BugsTab.tsx            # Gestao completa de bugs
│   │   │   ├── FeaturesTab.tsx        # Suites, funcionalidades e casos de teste
│   │   │   ├── BlockersTab.tsx        # Registro de impedimentos
│   │   │   ├── AlignmentsTab.tsx      # Alinhamentos tecnicos
│   │   │   ├── NotesTab.tsx           # Notas operacionais, premissas, plano de acao
│   │   │   ├── ConfigTab.tsx          # Config sprint, Health Score, Impacto Prevenido
│   │   │   └── useSprintMetrics.ts    # Hook com metricas derivadas
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           # Listagem e gestao de sprints
│   │   │   ├── SprintDashboard.tsx    # Dashboard individual com tabs
│   │   │   └── ComparePage.tsx        # Comparacao entre sprints (graficos)
│   │   ├── services/
│   │   │   ├── persistence.ts         # localStorage + Supabase + computeFields + Realtime
│   │   │   ├── compareService.ts      # KPIs para comparacao (computeSprintKPIs)
│   │   │   ├── exportService.ts       # Export JPG, JSON, CSV cobertura, CSV suite
│   │   │   └── importService.ts       # Parser .feature (Gherkin) e .csv
│   │   ├── store/
│   │   │   └── sprintStore.ts         # Zustand store central de sprints
│   │   └── types/
│   │       └── sprint.types.ts        # Todos os tipos TypeScript
│   └── squads/
│       ├── pages/
│       │   └── SquadsPage.tsx         # Gestao de squads, membros, usuarios, permissoes
│       └── services/
│           └── squadsService.ts       # CRUD squads, members, permissions, users (admin)
supabase/
├── config.toml                        # Config Supabase local
└── migrations/                        # 11 migrations SQL sequenciais
server.js                              # Express: serve SPA + API admin + health
```

---

## 4. Rotas (HashRouter)

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | AuthPage | Publica |
| `/` | → redirect `/sprints` | Protegida |
| `/sprints` | HomePage | Protegida |
| `/sprints/compare` | ComparePage | Protegida |
| `/sprints/:sprintId` | SprintDashboard | Protegida |
| `/squads` | SquadsPage | Protegida |
| `/profile` | ProfilePage | Protegida |
| `/change-password` | ChangePasswordPage | Protegida |
| `/docs` | DocsPage | Protegida |

Rotas protegidas passam por `ProtectedRoute` → redireciona para `/login` se nao autenticado.

---

## 5. Modulos

### 5.1 Auth (`src/modules/auth/`)

- **AuthPage** — Login com email/senha via Supabase Auth. Registro desabilitado (usuarios criados pelo admin).
- **authStore** (Zustand) — Gerencia `user`, `session`, `profile` (id, email, display_name, global_role).
- **Profile** — `global_role: 'admin' | 'user'`. Admins podem criar usuarios e gerenciar squads.
- **Bootstrap** — Ao carregar, `getSession()` restaura sessao existente. `onAuthStateChange` escuta login/logout.
- **Credenciais padrao:** `admin@tostatos.com` / `Admin@123`. Novos usuarios: `Mudar@123` (troca obrigatoria).

### 5.2 Sprints (`src/modules/sprints/`)

Modulo principal. 8 abas no dashboard:
1. **Overview** — KPIs, Health Score, Burndown, graficos por suite
2. **Report** — Daily report por data
3. **Bugs** — Tabela com ordenacao, CRUD, severidade, retestes
4. **Features** — Suites → Funcionalidades → Casos de Teste (Gherkin)
5. **Blockers** — Impedimentos com horas perdidas
6. **Alignments** — Alinhamentos tecnicos (manuais + automaticos de cancelamento)
7. **Notes** — Notas operacionais, premissas, plano de acao
8. **Config** — Dias, datas, pesos Health Score e Impacto Prevenido

### 5.3 Squads (`src/modules/squads/`)

- **Squad** — Equipe com nome, descricao, cor. Criada via RPC `create_squad_with_lead`.
- **Roles:** `qa_lead` (lider), `qa`, `stakeholder`
- **Permissoes granulares** por membro:
  - `delete_sprints`, `delete_bugs`, `delete_features`, `delete_test_cases`, `delete_suites`, `delete_blockers`, `delete_alignments`
- **Permission Profiles** — Templates de permissao reutilizaveis (tabela `permission_profiles`)
- **Gestao de usuarios (admin):** criar, ativar/desativar, alterar role global, listar com squads

---

## 6. Tipos Principais (`sprint.types.ts`)

### TestCase
```ts
{ id, name, complexity: 'Baixa'|'Moderada'|'Alta',
  status: 'Pendente'|'Concluido'|'Falhou'|'Bloqueado',
  executionDay: string, gherkin: string }
```

### Feature
```ts
{ id, suiteId, name, tests, manualTests, exec,
  execution, manualExecData, gherkinExecs,
  mockupImage, status: 'Ativa'|'Bloqueada'|'Cancelada',
  blockReason, activeFilter, cases: TestCase[] }
```

### Bug
```ts
{ id, desc, feature, stack, category?, severity,
  assignee, status: 'Aberto'|'Em Andamento'|'Falhou'|'Resolvido',
  retests, openedAt?, resolvedAt?, notes? }
```

### SprintConfig
```ts
{ sprintDays, title, startDate, endDate, targetVersion, squad, qaName,
  excludeWeekends, hsCritical, hsHigh, hsMedium, hsLow, hsRetest,
  hsBlocked, hsDelayed, psCritical, psHigh, psMedium, psLow }
```

### SprintIndexEntry
```ts
{ id, title, squad, squadId?, startDate, endDate,
  totalTests, totalExec, updatedAt, favorite?, status? }
```

### Outros: Suite, Blocker, Alignment, ResponsiblePerson, Notes, SprintState

---

## 7. Metricas — useSprintMetrics

Hook que deriva KPIs do estado Zustand. Exports:

| Metrica | Descricao |
|---------|-----------|
| `totalTests` | Soma de `feature.tests` (features ativas, exceto canceladas) |
| `totalExec` | Soma de `feature.exec` |
| `remaining` | `totalTests - totalExec` (min 0) |
| `execPercent` | `totalExec / testesExecutaveis * 100` |
| `testesComprometidos` | Testes de features Bloqueadas + casos individuais Bloqueados |
| `testesExecutaveis` | `totalTests - testesComprometidos` |
| `capacidadeReal` | `testesExecutaveis / totalTests * 100` |
| `blockedFeatureCount` | Features com algum impedimento |
| `metaPerDay` | `ceil(testesExecutaveis / sprintDays)` |
| `exactMeta` | `testesExecutaveis / sprintDays` (sem arredondamento) |
| `totalBlockedHours` | Soma de `blockers[].hours` |
| `openBugs` | Bugs com status != Resolvido |
| `atrasoCasos` | Diferenca entre meta ideal ate hoje e execucao real |
| `healthScore` | 100 - penalidades (bugs, retestes, bloqueios, atraso) |
| `totalRetests` | Soma de `bug.retests` |
| `retestIndex` | `totalRetests / (totalBugs + totalRetests) * 100` |
| `ritmoStatus` | `'ok' \| 'warning' \| 'danger'` baseado em atrasoCasos |
| `sprintDays`, `filtered`, `activeFeatures` | Auxiliares |

### Metricas em compareService (nao no hook)
- `resolvedBugs` — bugs resolvidos
- `mttrGlobal` — tempo medio de resolucao (horas)
- Interface `SprintKPIs` com todos os KPIs de comparacao

---

## 8. Persistencia

### Fluxo de Save
```
updateField → _commit → computeFields → saveToStorage → upsertMasterIndex → queueRemotePersist (debounce 700ms)
```

### localStorage (cache sincrono)
- `qaDashboardData_<sprintId>` — SprintState completo
- `qaDashboardMasterIndex` — SprintIndexEntry[]

### Supabase (primario quando disponivel)
- Tabela `sprints`: `id (text PK)`, `data (jsonb)`, `status (text)`, `updated_at (timestamptz)`
- `syncAllFromSupabase()` — startup: puxa todas as sprints e popula localStorage
- `loadFromServer(id)` — carrega sprint do Supabase
- `persistToServer(id, state)` — upsert no Supabase

### Realtime
```
supabase.channel('sprint:<id>').on('postgres_changes', UPDATE) → normalizeState → computeFields → saveToStorage → set()
```
Subscription criada em `initSprint`, cancelada em `resetSprint`.

---

## 9. Server (Express — server.js)

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/config.js` | GET | Config JS injetada no client |
| `/api/health` | GET | Health check (`{ ok: true }`) |
| `/api/dashboard/:projectKey` | GET | Busca dashboard (Supabase ou local) |
| `/api/dashboard/:projectKey` | PUT | Salva dashboard |
| `/api/admin/create-user` | POST | Cria usuario via Supabase Auth Admin (requer service_role) |
| `*` | GET | Fallback: serve `public/index.html` (SPA) |

---

## 10. Migrations (supabase/migrations/)

| # | Arquivo | Descricao |
|---|---------|-----------|
| 0 | `20260326000000_create_sprints.sql` | Tabela sprints + Realtime |
| 1 | `20260327000000_multi_user.sql` | profiles, squads, squad_members, RLS |
| 2 | `20260327000001_fix_handle_new_user.sql` | Fix trigger handle_new_user |
| 3 | `20260327000002_create_squad_rpc.sql` | RPC create_squad_with_lead |
| 4 | `20260327000003_fix_rls_recursion.sql` | Security definer functions |
| 5 | `20260327000004_global_role_and_permissions.sql` | global_role + permissions JSONB |
| 6 | `20260327000005_seed_admin_user.sql` | Seed admin user |
| 7 | `20260327000006_permission_profiles.sql` | Tabela permission_profiles + defaults |
| 8 | `20260327000007_squad_desc_color_and_user_mgmt.sql` | Squad desc/color + profiles.active |
| 9 | `20260327000008_fix_squad_rpc_overload.sql` | Fix RPC overload |
| 10 | `20260327000009_fk_squad_members_profiles.sql` | FK squad_members → profiles |

**Total: 11 migrations**

---

## 11. Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Modo colaborativo | URL da API Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Modo colaborativo | Chave publica anon (frontend) |
| `SUPABASE_URL` | Backend | URL Supabase (server.js) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Chave service_role (admin) |
| `STORAGE_TYPE` | Nao | `'local'` ou `'supabase'` (default: `'local'`) |
| `PORT` | Nao | Porta do Express (default: 3000) |

---

## 12. Comandos

```bash
npm install          # Instalar dependencias
npm run dev:client   # Frontend (Vite, porta 5173)
npm run dev          # Backend (Express, porta 3000)
npm run typecheck    # Verificar tipos TypeScript
npm run build        # Build de producao (tsc --noEmit && vite build)
npm start            # Inicia server.js em producao
supabase start       # Sobe banco local (Docker)
supabase db push --local  # Aplica migrations
bash setup-admin.sh  # Cria usuario admin padrao
```

---

## 13. Funcionalidades de Exportacao/Importacao

### Exportacao
- **JPG** — Captura da aba Overview via html2canvas (`exportToImage`)
- **JSON** — Backup completo do SprintState (`exportJSON`)
- **CSV Cobertura** — Relatorio por suite/feature com status dos casos (`exportCoverage`)
- **CSV Suite** — Exporta casos de teste de uma suite reimportavel (`exportSuiteAsCSV`)

### Importacao
- **.feature** — Parser Gherkin (Feature/Scenario/Cenario) → cria features e casos
- **.csv** — Formato: `Funcionalidade,Cenario,Complexidade,Gherkin` → cria features e casos
- **JSON** — Importa backup completo como nova sprint (`importFromJSON`)

---

## 14. Outros Documentos

| Documento | Conteudo |
|-----------|----------|
| `CLAUDE.md` | Quick start dev, stack, ciclo de qualidade |
| `README.md` | Guia do usuario: instalacao, modos, deploy |
| `ENGINEERING_DOCS.md` | Arquitetura tecnica detalhada |
| `BUSINESS_RULES.md` | Regras de negocio implementadas |
| `documentacao/DOCUMENTACAO_TECNICA.md` | Documentacao tecnica adicional |
| `documentacao/melhorias.md` | Notas de roadmap |

---

## 15. Comandos Claude Customizados

| Comando | Arquivo | Descricao |
|---------|---------|-----------|
| `/regressivo` | `.claude/commands/regressivo.md` | Ciclo completo de regressao QA |
| `/regressivo-visual` | `.claude/commands/regressivo-visual.md` | Regressao visual com Playwright CLI |
| `/seguranca` | `.claude/commands/seguranca.md` | Testes de seguranca |
