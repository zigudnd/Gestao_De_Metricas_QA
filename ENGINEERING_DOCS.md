# Engineering Documentation — ToStatos QA Dashboard

> **Versao:** 5.0 — Multi-user + Auth + Squads + Status Reports + Releases
> **Ultima atualizacao:** Marco 2026
> **Tipo de sistema:** Single Page Application (SPA) — React 19 + TypeScript + Vite

---

## Stack

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend Framework | React | 19.2.4 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 6.4.1 |
| CSS | Tailwind CSS v4 + tema customizado (`@theme` em `index.css`) | 4.2.2 |
| State Management | Zustand | 5.0.12 |
| Routing | React Router DOM (HashRouter) | 7.13.1 |
| Charts | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| Chart Labels | chartjs-plugin-datalabels | 2.2.0 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | 6.3.1 / 10.0.0 |
| Export Screenshot | html2canvas | 1.4.1 |
| Server | Express | 4.21.2 |
| Server Security | helmet | 8.1.0 |
| Rate Limiting | express-rate-limit | 8.3.1 |
| Banco de Dados / Auth / Realtime | Supabase (@supabase/supabase-js) | 2.99.1 |
| E2E Testing | Playwright | 1.58.2 |

---

## Estrutura de Diretorios

```
src/
├── main.tsx                           # Entry point React
├── index.css                          # Tailwind v4 @import + @theme (cores, fontes, radius, shadows)
├── lib/
│   └── supabase.ts                    # Cliente Supabase singleton (createClient)
├── app/
│   ├── components/
│   │   ├── ConfirmModal.tsx           # Modal de confirmacao reutilizavel
│   │   ├── NewBugModal.tsx            # Modal de criacao de bug reutilizavel
│   │   ├── ProtectedRoute.tsx         # Guard de autenticacao (redireciona p/ /login)
│   │   ├── TermoConclusaoModal.tsx    # Modal de termo de conclusao de sprint
│   │   └── Toast.tsx                  # Componente de toast generico
│   ├── layout/
│   │   ├── AppShell.tsx               # Layout raiz — inicia syncAllFromSupabase no mount
│   │   ├── Sidebar.tsx                # Navegacao lateral com icones
│   │   ├── Topbar.tsx                 # Barra superior com acoes contextuais
│   │   └── SaveToast.tsx              # Toast de "Salvo" (observa lastSaved)
│   ├── pages/
│   │   ├── DashboardHome.tsx          # Pagina inicial (hub de navegacao)
│   │   └── DocsPage.tsx               # Pagina de documentacao do sistema
│   └── routes.tsx                     # Hash Router com todas as rotas
├── modules/
│   ├── auth/                          # Modulo de autenticacao
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx           # Login / Registro
│   │   │   ├── ProfilePage.tsx        # Edicao de perfil (display_name)
│   │   │   └── ChangePasswordPage.tsx # Troca de senha (obrigatoria no 1o login)
│   │   └── store/
│   │       └── authStore.ts           # Zustand: user, session, profile, signOut
│   ├── sprints/                       # Modulo principal de sprints
│   │   ├── components/dashboard/
│   │   │   ├── OverviewTab.tsx        # Dashboard de resumo com KPIs e graficos
│   │   │   ├── ReportTab.tsx          # Daily Report por data
│   │   │   ├── BugsTab.tsx            # Gestao completa de bugs
│   │   │   ├── FeaturesTab.tsx        # Suites, funcionalidades e casos de teste
│   │   │   ├── BlockersTab.tsx        # Registro de impedimentos
│   │   │   ├── AlignmentsTab.tsx      # Alinhamentos tecnicos
│   │   │   ├── NotesTab.tsx           # Notas operacionais, premissas, plano de acao
│   │   │   ├── ConfigTab.tsx          # Config sprint, Health Score e Impacto Prevenido
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
│   │   │   └── sprintStore.ts         # Zustand store central — persiste Supabase + Realtime
│   │   └── types/
│   │       └── sprint.types.ts        # Todos os tipos TypeScript do modulo
│   ├── status-report/                 # Modulo de Status Report semanal
│   │   ├── pages/
│   │   │   ├── StatusReportHomePage.tsx  # Listagem de reports
│   │   │   └── StatusReportPage.tsx     # Editor de report individual
│   │   ├── components/
│   │   │   ├── SectionManager.tsx       # Gerenciador de secoes do report
│   │   │   ├── SectionCard.tsx          # Card de secao individual
│   │   │   ├── ItemRow.tsx              # Linha de item dentro de secao
│   │   │   ├── ItemFormModal.tsx        # Modal de criacao/edicao de item
│   │   │   ├── ItemDetailPanel.tsx      # Painel lateral de detalhes do item
│   │   │   ├── ReportPreview.tsx        # Preview do report para export
│   │   │   ├── ReportDashboard.tsx      # Dashboard com metricas do report
│   │   │   ├── GanttView.tsx            # Visualizacao Gantt dos itens
│   │   │   ├── combinados/
│   │   │   │   ├── CombinadosTab.tsx    # Aba de combinados da squad
│   │   │   │   ├── SectionList.tsx      # Lista de secoes de combinados
│   │   │   │   ├── CeremoniaCard.tsx    # Card de cerimonia
│   │   │   │   └── StoryPointsSelector.tsx # Seletor de story points
│   │   │   └── time/
│   │   │       ├── TimeTab.tsx          # Aba de gestao de time
│   │   │       ├── MemberRow.tsx        # Linha de membro do time
│   │   │       ├── AddMemberForm.tsx    # Formulario para adicionar membro
│   │   │       ├── AddOffForm.tsx       # Formulario de ausencia
│   │   │       └── OffTable.tsx         # Tabela de ausencias
│   │   ├── services/
│   │   │   ├── statusReportPersistence.ts  # Supabase sync + sendBeacon flush
│   │   │   ├── statusReportExport.ts       # Export PDF/clipboard
│   │   │   ├── dateEngine.ts               # Calculo de datas uteis e periodos
│   │   │   ├── squadConfigPersistence.ts   # Persistencia config de squad
│   │   │   └── offAlertEngine.ts           # Engine de alertas de ausencia
│   │   ├── store/
│   │   │   ├── statusReportStore.ts     # Zustand store do report
│   │   │   ├── seedData.ts             # Dados iniciais (template de report)
│   │   │   └── squadConfigStore.ts     # Zustand store de config da squad
│   │   └── types/
│   │       ├── statusReport.types.ts    # Tipos do Status Report
│   │       └── squadConfig.types.ts     # Tipos de config da squad
│   ├── releases/                        # Modulo de Releases
│   │   ├── pages/
│   │   │   ├── ReleasesPage.tsx         # Listagem de releases
│   │   │   └── ReleaseDashboard.tsx     # Dashboard individual da release
│   │   ├── components/dashboard/
│   │   │   ├── CheckpointTab.tsx        # Aba de checkpoints da release
│   │   │   ├── CronogramaTab.tsx        # Aba de cronograma
│   │   │   ├── EventsTab.tsx            # Aba de eventos da release
│   │   │   ├── RegressivosTab.tsx       # Aba de testes regressivos
│   │   │   ├── ReleasePhasesPanel.tsx   # Painel de fases da release
│   │   │   ├── ReleaseTimeline.tsx      # Timeline visual da release
│   │   │   └── ReleaseSquadCard.tsx     # Card de squad dentro da release
│   │   ├── components/tests/
│   │   │   ├── SquadTestArea.tsx         # Area de testes por squad
│   │   │   ├── ReleaseSuiteCard.tsx      # Card de suite na release
│   │   │   ├── ReleaseFeatureRow.tsx     # Linha de feature na release
│   │   │   ├── ReleaseTestCaseRow.tsx    # Linha de caso de teste
│   │   │   └── ReleaseBugsList.tsx       # Lista de bugs da release
│   │   ├── services/
│   │   │   ├── releasePersistence.ts    # localStorage + Supabase sync + Realtime
│   │   │   ├── releaseMetrics.ts        # Metricas derivadas da release
│   │   │   ├── releaseExport.ts         # Export de dados da release
│   │   │   └── releaseImportService.ts  # Import de dados para release
│   │   ├── store/
│   │   │   └── releaseStore.ts          # Zustand store da release
│   │   └── types/
│   │       └── release.types.ts         # Tipos TypeScript do modulo
│   └── squads/                          # Modulo de squads e gestao de usuarios
│       ├── pages/
│       │   └── SquadsPage.tsx           # Gestao de squads, membros, usuarios, permissoes
│       ├── services/
│       │   └── squadsService.ts         # CRUD squads, members, permissions, users (admin)
│       └── store/
│           └── activeSquadStore.ts      # Zustand store do squad ativo selecionado
supabase/
├── config.toml                          # Configuracao do Supabase local
└── migrations/                          # 22 migrations SQL sequenciais
server.js                                # Express: serve SPA + API admin + flush endpoints
```

---

## Roteamento

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | AuthPage | Publica |
| `/` | DashboardHome | Protegida |
| `/sprints` | HomePage | Protegida |
| `/sprints/compare` | ComparePage | Protegida |
| `/sprints/:sprintId` | SprintDashboard | Protegida |
| `/squads` | SquadsPage | Protegida |
| `/status-report` | StatusReportHomePage | Protegida |
| `/status-report/:reportId` | StatusReportPage | Protegida |
| `/releases` | ReleasesPage | Protegida |
| `/releases/:releaseId` | ReleaseDashboard | Protegida |
| `/profile` | ProfilePage | Protegida |
| `/change-password` | ChangePasswordPage | Protegida (fora do AppShell) |
| `/docs` | DocsPage | Protegida |

Rotas protegidas passam por `ProtectedRoute` → redireciona para `/login` se nao autenticado.

---

## Server (Express — server.js)

| Endpoint | Metodo | Auth | Rate Limit | Descricao |
|----------|--------|------|------------|-----------|
| `/config.js` | GET | Nao | Global (100/min) | Config JS injetada no client |
| `/api/health` | GET | Nao | Global (100/min) | Health check (`{ ok: true, storage }`) |
| `/api/dashboard/:projectKey` | GET | Nao | Global (100/min) | Busca dashboard (Supabase ou local) |
| `/api/dashboard/:projectKey` | PUT | Nao | Global (100/min) | Salva dashboard |
| `/api/admin/create-user` | POST | Bearer + admin | Admin (10/min) | Cria usuario via Supabase Auth Admin |
| `/api/admin/reset-password` | POST | Bearer + admin | Admin (10/min) | Reseta senha de usuario |
| `/api/status-report-flush` | POST | Nao | Flush (30/min) | Flush de status report via sendBeacon |
| `/api/release-flush` | POST | Nao | Flush (30/min) | Flush de release via sendBeacon |
| `*` | GET | — | — | Fallback: serve `public/index.html` (SPA) |

Middlewares globais: `helmet()`, CORS (origens configuraveis via `CORS_ORIGINS`), `express.json({ limit: '2mb' })`.

---

## Modulos

### auth (`src/modules/auth/`)

**Arquivos:** AuthPage.tsx, ChangePasswordPage.tsx, ProfilePage.tsx, authStore.ts

O authStore (Zustand) gerencia `user`, `session`, `profile`, `loading` e expoe `signOut()`, `updateDisplayName()`. Bootstrap via `supabase.auth.getSession()` + `onAuthStateChange()`. Novos usuarios criados com `must_change_password: true` sao redirecionados para `/change-password` pelo ProtectedRoute.

### sprints (`src/modules/sprints/`)

**Arquivos:**
- **Pages:** HomePage.tsx, SprintDashboard.tsx, ComparePage.tsx
- **Dashboard tabs (8):** OverviewTab, ReportTab, BugsTab, FeaturesTab, BlockersTab, AlignmentsTab, NotesTab, ConfigTab
- **Hook:** useSprintMetrics.ts
- **Services:** persistence.ts, compareService.ts, exportService.ts, importService.ts
- **Store:** sprintStore.ts
- **Types:** sprint.types.ts

### status-report (`src/modules/status-report/`)

**Arquivos:**
- **Pages:** StatusReportHomePage.tsx, StatusReportPage.tsx
- **Components (12+):** SectionManager, SectionCard, ItemRow, ItemFormModal, ItemDetailPanel, ReportPreview, ReportDashboard, GanttView
- **Components combinados/:** CombinadosTab, SectionList, CeremoniaCard, StoryPointsSelector
- **Components time/:** TimeTab, MemberRow, AddMemberForm, AddOffForm, OffTable
- **Services:** statusReportPersistence.ts, statusReportExport.ts, dateEngine.ts, squadConfigPersistence.ts, offAlertEngine.ts
- **Stores:** statusReportStore.ts, seedData.ts, squadConfigStore.ts
- **Types:** statusReport.types.ts, squadConfig.types.ts

### releases (`src/modules/releases/`)

**Arquivos:**
- **Pages:** ReleasesPage.tsx, ReleaseDashboard.tsx
- **Components dashboard/:** CheckpointTab, CronogramaTab, EventsTab, RegressivosTab, ReleasePhasesPanel, ReleaseTimeline, ReleaseSquadCard
- **Components tests/:** SquadTestArea, ReleaseSuiteCard, ReleaseFeatureRow, ReleaseTestCaseRow, ReleaseBugsList
- **Services:** releasePersistence.ts, releaseMetrics.ts, releaseExport.ts, releaseImportService.ts
- **Store:** releaseStore.ts
- **Types:** release.types.ts

### squads (`src/modules/squads/`)

**Arquivos:** SquadsPage.tsx, squadsService.ts, activeSquadStore.ts

---

## Migrations (22 total)

| # | Arquivo | Descricao |
|---|---------|-----------|
| 0 | `20260326000000_create_sprints.sql` | Tabela `sprints` (id text PK, data jsonb, status, updated_at) |
| 1 | `20260327000000_multi_user.sql` | Tabelas `profiles`, `squads`, `squad_members` + trigger handle_new_user + RLS |
| 2 | `20260327000001_fix_handle_new_user.sql` | Correcao do trigger handle_new_user |
| 3 | `20260327000002_create_squad_rpc.sql` | RPC `create_squad_with_lead` (cria squad + adiciona criador como qa_lead) |
| 4 | `20260327000003_fix_rls_recursion.sql` | Funcoes SECURITY DEFINER para evitar recursao infinita em RLS |
| 5 | `20260327000004_global_role_and_permissions.sql` | Campo `global_role` em profiles + `permissions` JSONB em squad_members |
| 6 | `20260327000005_seed_admin_user.sql` | Seed do usuario admin padrao |
| 7 | `20260327000006_permission_profiles.sql` | Tabela `permission_profiles` + templates padrao |
| 8 | `20260327000007_squad_desc_color_and_user_mgmt.sql` | Campos description/color em squads + campo active em profiles |
| 9 | `20260327000008_fix_squad_rpc_overload.sql` | Correcao de overload da RPC create_squad_with_lead |
| 10 | `20260327000009_fk_squad_members_profiles.sql` | Foreign key squad_members → profiles |
| 11 | `20260327000010_status_reports.sql` | Tabela `status_reports` (id text PK, data jsonb, squad_id, status) + RLS + indices |
| 12 | `20260327000011_audit_logs.sql` | Tabela `audit_logs` (user_id, resource_type, resource_id, action, changes jsonb) |
| 13 | `20260329000012_squad_config.sql` | Tabela `squad_config` (squad_id unique, data jsonb) + Realtime |
| 14 | `20260330000013_gerente_role_and_quality_beta.sql` | Role `gerente` em global_role + squad QualityBeta para dados legados |
| 15 | `20260330000014_squad_archive_and_seed.sql` | Campo `archived` em squads + policy de visibilidade |
| 16 | `20260330000015_allow_edit_system_profiles.sql` | Policy para admin editar permission_profiles de sistema |
| 17 | `20260330000016_expand_permissions.sql` | Permissoes granulares: create_*, edit_*, delete_* por recurso |
| 18 | `20260330000017_fix_backend_rls.sql` | Correcao RLS de audit_logs (leitura por squad) + insert por service_role |
| 19 | `20260330000018_audit_rpc_and_trigger_fix.sql` | RPC `audit_action()` anti-forging (server garante user_id) |
| 20 | `20260330000019_releases.sql` | Tabela `releases` (id text PK, data jsonb, status, version, production_date) + RLS + Realtime |
| 21 | `20260331000020_expand_permissions_releases.sql` | Permissoes para releases, status_reports e checkpoints em squad_members |

---

## Arquitetura de Estado

### Padrao de Stores (Zustand)

Todos os stores de recursos (sprints, status-report, releases) seguem o mesmo ciclo de commit:

```
1. Chama _commit({ ...state, novoCampo })
2. computeFields(next)        → recalcula campos derivados
3. saveToStorage(id, s)       → grava no localStorage (sincrono, imediato)
4. upsertMasterIndex(id)      → atualiza totais no indice local
5. queueRemotePersist()       → debounce 700ms → upsert no Supabase (async)
6. set({ state, lastSaved })  → atualiza o store e dispara SaveToast
```

### Supabase Realtime (co-edicao)

Cada recurso aberto cria uma subscription Supabase Realtime:

```
supabase.channel('<resource>:<id>')
  .on('postgres_changes', { event: 'UPDATE', table: '<table>', filter: 'id=eq.<id>' }, callback)

callback → normalizeState → computeFields → saveToStorage → set({ state })
```

A tela do colega atualiza em ~200ms sem necessidade de F5. Subscription cancelada ao navegar para outra pagina.

### Persistencia em camadas

| Camada | Papel | Latencia |
|--------|-------|----------|
| localStorage | Cache sincrono, leitura instantanea, fallback offline | 0ms |
| Supabase (PostgreSQL) | Source of truth, sync remoto | ~200ms |

### Sync inicial

No mount do AppShell, `syncAllFromSupabase()` puxa todos os recursos paginados (`PAGE_SIZE=100`) e popula o localStorage.

### Crash recovery

- `beforeunload` event + `navigator.sendBeacon()` para flush endpoints (`/api/status-report-flush`, `/api/release-flush`)
- Garante que dados nao persistidos sejam salvos mesmo se o usuario fechar a aba abruptamente

### Audit logging

Todas as acoes criticas sao registradas via RPC `audit_action(resource_type, resource_id, action, changes)`. A funcao e SECURITY DEFINER e garante o `user_id` do caller (anti-forging).

---

## Design Tokens (`src/index.css` @theme)

### Cores

| Token | Valor |
|-------|-------|
| `--color-bg` | `#f7f6f2` |
| `--color-surface` | `#ffffff` |
| `--color-surface-2` | `#f2f1ed` |
| `--color-border` | `rgba(0, 0, 0, 0.08)` |
| `--color-border-md` | `rgba(0, 0, 0, 0.14)` |
| `--color-text` | `#1a1a18` |
| `--color-text-2` | `#6b6a65` |
| `--color-text-3` | `#a09f99` |
| `--color-blue` | `#185fa5` |
| `--color-blue-light` | `#e6f1fb` |
| `--color-blue-text` | `#0c447c` |
| `--color-green` | `#3b6d11` |
| `--color-green-light` | `#eaf3de` |
| `--color-green-mid` | `#639922` |
| `--color-green-text` | `#3b6d11` |
| `--color-amber` | `#854f0b` |
| `--color-amber-light` | `#faeeda` |
| `--color-amber-mid` | `#ba7517` |
| `--color-yellow` | `#b45309` |
| `--color-yellow-light` | `#fef3c7` |
| `--color-red` | `#a32d2d` |
| `--color-red-light` | `#fcebeb` |
| `--color-red-mid` | `#e24b4a` |

### Tipografia

| Token | Valor |
|-------|-------|
| `--font-family-sans` | `"IBM Plex Sans", system-ui, sans-serif` |
| `--font-family-mono` | `"IBM Plex Mono", monospace` |

### Border Radius

| Token | Valor |
|-------|-------|
| `--radius-sm` | `6px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |

### Shadows

| Token | Valor |
|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0, 0, 0, 0.05)` |
| `--shadow-md` | `0 2px 8px rgba(0, 0, 0, 0.08)` |
| `--shadow-lg` | `0 4px 16px rgba(0, 0, 0, 0.12)` |
| `--shadow-xl` | `0 12px 40px rgba(0, 0, 0, 0.2)` |

### Focus

| Token | Valor |
|-------|-------|
| `--focus-ring` | `0 0 0 3px rgba(24, 95, 165, 0.3)` |

---

## Scripts

```bash
# Desenvolvimento
supabase start        # Sobe o banco local (Docker) — rodar antes do dev:client
npm run dev:client    # Vite dev server (http://localhost:5173)
npm run dev:client -- --host  # Expoe na rede local para co-edicao
npm run dev           # Express server (http://localhost:3000)

# Banco de dados
supabase db push --local   # Aplica migrations no banco local
supabase stop              # Para os containers (dados persistem)
supabase start             # Retoma os containers

# Build e qualidade
npm run build        # tsc --noEmit && vite build
npm run typecheck    # tsc --noEmit
```

---

## Credenciais padrao

| | |
|---|---|
| **Admin** | `admin@tostatos.com` / `Admin@123` |
| **Novos usuarios** | Senha temporaria aleatoria (troca obrigatoria no primeiro login) |
