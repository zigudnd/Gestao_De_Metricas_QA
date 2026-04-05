# Contexto Completo do Projeto — ToStatos | Hub de Qualidade

> **Objetivo deste documento:** Fornecer contexto completo para onboarding rapido em novas conversas.
> Leia este arquivo antes de iniciar qualquer tarefa no projeto.
> **Ultima atualizacao:** 03 Abril 2026

---

## 1. O que e o ToStatos

**ToStatos** e um **Hub de Qualidade** — uma Plataforma de Inteligencia de Qualidade de Software para acompanhamento de sprints ageis, releases e status reports. Centraliza KPIs, progresso de execucao de testes, bugs, bloqueios, alinhamentos tecnicos, status reports semanais, releases com pipeline de 5 fases, e notas operacionais em um unico dashboard colaborativo (QA Metrics Dashboard).

**Modos de operacao:**
1. **Offline** — localStorage apenas, sem servidor, usuario unico
2. **Local colaborativo** — Supabase via Docker na rede local
3. **Cloud** — Supabase Cloud para acesso global

---

## 2. Stack Tecnica

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend | React | 19.2.4 |
| Language | TypeScript | 5.9.3 |
| Build | Vite | 6.4.1 |
| CSS | Tailwind CSS v4 + tema customizado (`@theme` em index.css) | 4.2.2 |
| State | Zustand | 5.0.12 |
| Validation | Zod | 4.3.6 |
| Routing | React Router DOM v7 (HashRouter) | 7.13.1 |
| Charts | Chart.js 4.5.1 + react-chartjs-2 5.3.1 + chartjs-plugin-datalabels 2.2.0 |
| Drag & Drop | @dnd-kit/core 6.3.1 + @dnd-kit/sortable 10.0.0 |
| Export | html2canvas (JPG) |
| Backend | Node.js + Express 4.21.2 (`server.js`, porta 3000) |
| Security | helmet 8.1.0 + express-rate-limit 8.3.1 |
| Database | Supabase (PostgreSQL + Realtime + Auth/GoTrue) | 2.99.1 |
| E2E | Playwright 1.58.2 |
| Fonts | IBM Plex Sans, IBM Plex Mono |

**Alias:** `@/*` → `src/*`

---

## 3. Estrutura de Diretorios

```
src/
├── main.tsx                              # Entry point React
├── index.css                             # Tailwind v4 @import + @theme (cores, fontes, radius, shadows)
├── lib/
│   ├── supabase.ts                       # Cliente Supabase singleton
│   ├── auditService.ts                   # Audit logging via RPC (anti-forging)
│   └── chartColors.ts                    # Palette centralizada para Chart.js
├── styles/
│   ├── shared.ts                         # Styles reutilizaveis (inputStyle, btnPrimary, etc.)
│   └── common.ts                         # Constantes comuns
├── app/
│   ├── components/
│   │   ├── Button.tsx                    # Componente Button reutilizavel (5 variants, 3 sizes)
│   │   ├── ConfirmModal.tsx              # Modal de confirmacao reutilizavel
│   │   ├── ErrorBoundary.tsx             # Error boundary com fallback UI
│   │   ├── NewBugModal.tsx               # Modal de criacao de bug
│   │   ├── ProtectedRoute.tsx            # Guard de autenticacao
│   │   ├── TermoConclusaoModal.tsx        # Modal de termo de conclusao de sprint
│   │   ├── Toast.tsx                     # Sistema de toast global (showToast)
│   │   └── UserMenu.tsx                  # Dropdown de conta no topbar (perfil, senha, squad, logout)
│   ├── layout/
│   │   ├── AppShell.tsx                  # Layout raiz (44 linhas) — sync + ErrorBoundary
│   │   ├── Sidebar.tsx                   # Navegacao lateral expansivel (518 linhas)
│   │   ├── Topbar.tsx                    # Barra superior com breadcrumb + acoes (388 linhas)
│   │   └── SaveToast.tsx                 # Toast de "Salvo"
│   ├── pages/
│   │   ├── DashboardHome.tsx             # Pagina inicial (hub com cards de stats)
│   │   └── DocsPage.tsx                  # Pagina de documentacao
│   └── routes.tsx                        # Hash Router com lazy loading (5 rotas lazy)
├── modules/
│   ├── auth/                             # Autenticacao (4 arquivos)
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx              # Login
│   │   │   ├── ProfilePage.tsx           # Perfil + alterar senha
│   │   │   └── ChangePasswordPage.tsx    # Troca obrigatoria (1o login)
│   │   └── store/
│   │       └── authStore.ts              # Zustand: user, session, profile
│   ├── sprints/                          # Cobertura QA (21 arquivos)
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── OverviewTab.tsx       # KPIs, Health Score, Burndown, graficos
│   │   │   │   ├── ReportTab.tsx         # Daily Report
│   │   │   │   ├── BugsTab.tsx           # Gestao de bugs
│   │   │   │   ├── FeaturesTab.tsx       # Suites, features, casos de teste
│   │   │   │   ├── BlockersTab.tsx       # Impedimentos
│   │   │   │   ├── AlignmentsTab.tsx     # Alinhamentos tecnicos
│   │   │   │   ├── NotesTab.tsx          # Notas operacionais
│   │   │   │   ├── ConfigTab.tsx         # Config sprint + pesos (accordion avancado)
│   │   │   │   └── useSprintMetrics.ts   # Hook com metricas derivadas
│   │   │   └── home/
│   │   │       ├── SprintCard.tsx        # Card de sprint na listagem (240 linhas)
│   │   │       ├── FilterBar.tsx         # Barra de filtros (200 linhas)
│   │   │       └── Modal.tsx             # Modal reutilizavel (75 linhas)
│   │   ├── pages/
│   │   │   ├── HomePage.tsx              # Listagem de sprints
│   │   │   ├── SprintDashboard.tsx       # Dashboard individual (8 abas)
│   │   │   └── ComparePage.tsx           # Comparacao entre sprints (lazy)
│   │   ├── services/
│   │   │   ├── persistence.ts            # localStorage + Supabase + Realtime (paginado)
│   │   │   ├── compareService.ts         # KPIs para comparacao
│   │   │   ├── exportService.ts          # Export JPG, JSON, CSV
│   │   │   └── importService.ts          # Import .feature (Gherkin) e .csv
│   │   ├── store/
│   │   │   └── sprintStore.ts            # Zustand store central
│   │   └── types/
│   │       └── sprint.types.ts           # Tipos (156 linhas)
│   ├── status-report/                    # Status Report (27 arquivos)
│   │   ├── components/
│   │   │   ├── GanttView.tsx             # Gantt SVG com dependencias (memo)
│   │   │   ├── ItemDetailPanel.tsx       # Painel lateral de edicao
│   │   │   ├── ItemFormModal.tsx         # Modal novo item (progressive disclosure)
│   │   │   ├── ItemRow.tsx               # Linha de item (memo)
│   │   │   ├── ReportDashboard.tsx       # Dashboard metricas (KpiCard, ProgressRing memo)
│   │   │   ├── ReportPreview.tsx         # Preview 2 colunas formato Word
│   │   │   ├── SectionCard.tsx           # Card de secao (memo)
│   │   │   ├── SectionManager.tsx        # Gerenciador de secoes customizaveis
│   │   │   ├── combinados/
│   │   │   │   ├── CombinadosTab.tsx     # Combinados do time (DOR, DOD, cerimonias)
│   │   │   │   ├── CeremoniaCard.tsx     # Card de cerimonia
│   │   │   │   ├── SectionList.tsx       # Lista de secoes
│   │   │   │   └── StoryPointsSelector.tsx # Seletor de story points
│   │   │   └── time/
│   │   │       ├── TimeTab.tsx           # Gestao de time
│   │   │       ├── MemberRow.tsx         # Linha de membro
│   │   │       ├── AddMemberForm.tsx     # Form adicionar membro
│   │   │       ├── AddOffForm.tsx        # Form de ausencia
│   │   │       └── OffTable.tsx          # Tabela de ausencias
│   │   ├── pages/
│   │   │   ├── StatusReportHomePage.tsx   # Listagem (favoritos, filtros, migrar, duplicar)
│   │   │   └── StatusReportPage.tsx      # Editor (5 abas: Editor, Preview, Gantt, Combinados, Time)
│   │   ├── services/
│   │   │   ├── statusReportPersistence.ts # Supabase + localStorage + sendBeacon flush
│   │   │   ├── statusReportExport.ts     # Export JPG/clipboard
│   │   │   ├── dateEngine.ts             # Calculo de datas + deteccao de ciclos
│   │   │   ├── squadConfigPersistence.ts # Config de squad
│   │   │   └── offAlertEngine.ts         # Alertas de ausencia
│   │   ├── store/
│   │   │   ├── statusReportStore.ts      # Zustand store (cycle prevention, sendBeacon)
│   │   │   ├── seedData.ts              # Dados iniciais de exemplo
│   │   │   └── squadConfigStore.ts      # Config de squad
│   │   └── types/
│   │       ├── statusReport.types.ts     # Tipos (90 linhas)
│   │       └── squadConfig.types.ts      # Tipos config squad (74 linhas)
│   ├── releases/                         # Releases (19 arquivos)
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── CheckpointTab.tsx     # Checkpoint (pipeline dots com simbolos)
│   │   │   │   ├── CronogramaTab.tsx     # Cronograma + import CSV + template
│   │   │   │   ├── EventsTab.tsx         # Eventos da release
│   │   │   │   ├── RegressivosTab.tsx    # Testes regressivos
│   │   │   │   ├── ReleasePhasesPanel.tsx # Pipeline 5 fases (focus ring, aria-labels)
│   │   │   │   ├── ReleaseTimeline.tsx   # Timeline visual
│   │   │   │   └── ReleaseSquadCard.tsx  # Card de squad na release
│   │   │   └── tests/
│   │   │       ├── SquadTestArea.tsx     # Area de testes por squad
│   │   │       ├── ReleaseSuiteCard.tsx  # Suite na release
│   │   │       ├── ReleaseFeatureRow.tsx # Feature na release
│   │   │       ├── ReleaseTestCaseRow.tsx # Caso de teste
│   │   │       └── ReleaseBugsList.tsx   # Bugs da release
│   │   ├── pages/
│   │   │   ├── ReleasesPage.tsx          # Listagem (5 abas)
│   │   │   └── ReleaseDashboard.tsx      # Dashboard individual (lazy)
│   │   ├── services/
│   │   │   ├── releasePersistence.ts     # Supabase + localStorage + sendBeacon
│   │   │   ├── releaseMetrics.ts         # Metricas agregadas
│   │   │   └── releaseExport.ts          # Export JPG
│   │   ├── store/
│   │   │   └── releaseStore.ts           # Zustand store (629 linhas)
│   │   └── types/
│   │       └── release.types.ts          # Tipos (151 linhas)
│   └── squads/                           # Cadastros (7 arquivos)
│       ├── components/
│       │   ├── PermissionsEditor.tsx      # Editor de permissoes (94 linhas)
│       │   ├── ProfilesPanel.tsx         # Painel de perfis de acesso (104 linhas)
│       │   ├── SquadDetail.tsx           # Detalhe do squad + membros (293 linhas)
│       │   └── UsersPanel.tsx            # Painel de usuarios admin (225 linhas)
│       ├── pages/
│       │   └── SquadsPage.tsx            # Orchestrador (tabs, modais, CRUD)
│       ├── services/
│       │   └── squadsService.ts          # CRUD squads, members, permissions, users
│       └── store/
│           └── activeSquadStore.ts       # Squad ativo global
```

---

## 4. Rotas (HashRouter com Lazy Loading)

| Rota | Componente | Acesso | Lazy |
|------|-----------|--------|------|
| `/login` | AuthPage | Publica | Nao |
| `/change-password` | ChangePasswordPage | Protegida | Nao |
| `/` | DashboardHome | Protegida | Nao |
| `/sprints` | HomePage | Protegida | Nao |
| `/sprints/compare` | ComparePage | Protegida | **Sim** |
| `/sprints/:sprintId` | SprintDashboard | Protegida | Nao |
| `/status-report` | StatusReportHomePage | Protegida | Nao |
| `/status-report/:reportId` | StatusReportPage | Protegida | **Sim** |
| `/releases` | ReleasesPage | Protegida | Nao |
| `/releases/:releaseId` | ReleaseDashboard | Protegida | **Sim** |
| `/squads` | SquadsPage | Protegida | **Sim** |
| `/profile` | ProfilePage | Protegida | Nao |
| `/docs` | DocsPage | Protegida | **Sim** |

Sidebar: Inicio → Status Report → Cobertura QA → Releases | Cadastros · Documentacao
Topbar: Breadcrumb (Inicio / Area atual) + Squad label + Avatar menu (perfil, senha, squad, logout)

---

## 5. Modulos

### 5.1 Auth
- Login via Supabase Auth (email + senha)
- Roles: `admin`, `gerente`, `user`
- Senha gerada via `crypto.randomBytes` (sem hardcoded)
- Politica: minimo 8 chars, maiuscula, numero, especial
- Troca obrigatoria no primeiro login (`must_change_password`)

### 5.2 Cobertura QA (Sprints)
- 3 tipos: `squad` (padrao), `regressivo`, `integrado`
- 8 abas: Overview, Report, Bugs, Features, Blockers, Alignments, Notes, Config
- KPIs: Health Score, MTTR, Capacidade Real, Indice de Retrabalho, Burndown
- Compare sprints com 9 graficos (usa chartColors.ts centralizado)
- Export: JPG, JSON, CSV cobertura, CSV suite
- Import: .feature (Gherkin), .csv
- Config: pesos Health Score e Impacto Prevenido em accordion "Avancado"
- Feedback: "Salvo" no ConfigTab, severity pills no filtro de bugs, strikethrough resolvidos

### 5.3 Status Report
- Multi-report por SM (criar, listar, duplicar, migrar, concluir, favoritar)
- Secoes dinamicas (customizaveis, nao limitadas aos 6 defaults)
- Items com predecessores, deteccao de ciclos (wouldCreateCycle DFS)
- Gantt SVG com barras, dependencias tracejadas, badge ATRASO/CICLO com icones
- Preview 2 colunas formato Word + copiar para clipboard
- Periodo como date range (periodStart/periodEnd)
- 5 abas: Editor, Preview Report, Gantt, Combinados do Time, Time & Calendario
- Combinados: DOR, DOD, cerimonias, acordos
- Time: membros (efetivos/temporarios), ausencias, folgas
- Squad selecionavel da lista de cadastros ao criar report
- Auto-calculo bidirecional duracao ↔ deadline

### 5.4 Releases
- Pipeline 5 fases: Corte → Geracao → Homologacao → Beta → Producao
- Status: planejada → em_desenvolvimento → corte → em_homologacao → em_regressivo → aprovada → em_producao → concluida
- 5 abas: Checkpoint, Regressivos, Historico, Cronograma, Eventos
- Rollout % com steps predefinidos (0, 1, 2, 3, 5, 10, 20, 40, 60, 80, 100)
- Cronograma: import CSV com template (RELEASE, PLATAFORMA, VERSAO, CORTE, GERACAO VERSAO, TESTES HOMOLOGACAO, BETA, PRODUCAO, STATUS)
- Parser aceita: dd/mm/yyyy, dd/mm, yyyy-mm-dd, serial Excel
- Areas de teste por squad dentro de cada release
- Pipeline dots com simbolos acessiveis (✓ done, ◉ active, ○ pending)

### 5.5 Cadastros (Squads)
- CRUD squads com nome, descricao, cor
- Roles: `qa_lead`, `qa`, `stakeholder`
- Permissoes granulares por membro (7 permissoes de exclusao)
- Perfis de permissao reutilizaveis
- Gestao de usuarios (admin): criar, ativar/desativar, alterar role, resetar senha
- Arquivamento de squads
- Componentes extraidos: PermissionsEditor, ProfilesPanel, UsersPanel, SquadDetail

---

## 6. Persistencia

### Fluxo de Save
```
updateField → _commit → computeFields → saveToStorage → upsertMasterIndex → queueRemotePersist (debounce 700ms)
```

### localStorage (cache sincrono)
- `qaDashboardData_<sprintId>` — SprintState
- `qaDashboardMasterIndex` — SprintIndexEntry[]
- `statusReport_<id>` — StatusReportState
- `statusReportMasterIndex` — StatusReportIndexEntry[]
- `release_<id>` — Release
- `releaseMasterIndex` — ReleaseIndexEntry[]

### Supabase (primario)
- Tabela `sprints`: id, data (jsonb), status, squad_id, updated_at
- Tabela `status_reports`: id, data (jsonb), squad_id, status, updated_at
- Tabela `releases`: id, data (jsonb), status, version, production_date, updated_at
- Realtime via WebSocket por recurso
- Sync paginado (PAGE_SIZE=100)
- Crash recovery: `beforeunload` + `navigator.sendBeacon`

### Audit Trail
- Tabela `audit_logs`: user_id, resource_type, resource_id, action, changes (jsonb)
- Via RPC `audit_action()` com SECURITY DEFINER (anti-forging)
- Logado em: create/delete bugs, create/delete items

---

## 7. Server (Express — server.js)

| Endpoint | Metodo | Rate Limit | Auth |
|----------|--------|-----------|------|
| `/config.js` | GET | — | — |
| `/api/health` | GET | 100/min | — |
| `/api/dashboard/:projectKey` | GET/PUT | 100/min | — |
| `/api/admin/create-user` | POST | 30/min | Bearer + admin |
| `/api/admin/reset-password` | POST | 30/min | Bearer + admin |
| `/api/status-report-flush` | POST | 30/min | — |
| `/api/release-flush` | POST | 30/min | — |
| `/api/sprint-flush` | POST | 30/min | — |
| `*` | GET | — | Serve SPA |

Seguranca: Helmet, CORS via env `CORS_ORIGINS`, crypto passwords, input validation no flush.

---

## 8. Migrations (27 sequenciais)

| # | Arquivo | Descricao |
|---|---------|-----------|
| 1 | `20260326000000_create_sprints` | Tabela sprints + Realtime |
| 2 | `20260327000000_multi_user` | profiles, squads, squad_members, RLS |
| 3 | `20260327000001_fix_handle_new_user` | Fix trigger (error handling) |
| 4 | `20260327000002_create_squad_rpc` | RPC create_squad_with_lead |
| 5 | `20260327000003_fix_rls_recursion` | Security definer functions |
| 6 | `20260327000004_global_role_and_permissions` | global_role + permissions JSONB |
| 7 | `20260327000005_seed_admin_user` | Seed admin |
| 8 | `20260327000006_permission_profiles` | permission_profiles + defaults |
| 9 | `20260327000007_squad_desc_color_and_user_mgmt` | Squad desc/color + profiles.active |
| 10 | `20260327000008_fix_squad_rpc_overload` | Fix RPC overload |
| 11 | `20260327000009_fk_squad_members_profiles` | FK squad_members → profiles |
| 12 | `20260327000010_status_reports` | status_reports + RLS |
| 13 | `20260327000011_audit_logs` | audit_logs + RLS squad-scoped |
| 14 | `20260329000012_squad_config` | squad_config + RLS |
| 15 | `20260330000013_gerente_role_and_quality_beta` | Role gerente |
| 16 | `20260330000014_squad_archive_and_seed` | Arquivamento squads |
| 17 | `20260330000015_allow_edit_system_profiles` | Editar perfis sistema |
| 18 | `20260330000016_expand_permissions` | Expandir permissoes |
| 19 | `20260330000017_fix_backend_rls` | Fix RLS audit/status/squad_config |
| 20 | `20260330000018_audit_rpc_and_trigger_fix` | Audit RPC + trigger error handling |
| 21 | `20260330000019_releases` | Tabela releases |
| 22 | `20260331000020_expand_permissions_releases` | Permissoes releases |
| 23 | `20260403000021_dashboard_states` | dashboard_states |
| 24 | `20260403000022_fix_releases_rls` | Fix RLS releases |
| 25 | `20260403000023_add_composite_indices` | Indices compostos |
| 26 | `20260403000024_updated_at_triggers` | Triggers updated_at |
| 27 | `20260403000025_fix_null_squad_id` | Fix null squad_id |

---

## 9. Variaveis de Ambiente

| Variavel | Obrigatoria | Descricao |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | Modo colaborativo | URL Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Modo colaborativo | Chave publica anon (frontend) |
| `SUPABASE_URL` | Backend | URL Supabase (server.js) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Chave service_role (admin) |
| `CORS_ORIGINS` | Nao | Origens permitidas (default: localhost) |
| `STORAGE_TYPE` | Nao | `'local'` ou `'supabase'` (default: local) |
| `PORT` | Nao | Porta Express (default: 3000) |

---

## 10. Design Tokens (index.css @theme)

```css
/* Cores */
--color-bg, --color-surface, --color-surface-2
--color-border, --color-border-md
--color-text, --color-text-2, --color-text-3
--color-blue, --color-blue-light, --color-blue-text
--color-green, --color-green-light, --color-green-mid, --color-green-text
--color-amber, --color-amber-light, --color-amber-mid
--color-yellow, --color-yellow-light
--color-red, --color-red-light, --color-red-mid

/* Tipografia */
--font-family-sans: "IBM Plex Sans"
--font-family-mono: "IBM Plex Mono"

/* Layout */
--radius-sm: 6px, --radius-md: 8px, --radius-lg: 12px
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
--focus-ring: 0 0 0 3px rgba(24, 95, 165, 0.3)
```

Chart.js: cores centralizadas em `src/lib/chartColors.ts` (CHART_COLORS, PALETTE, helpers).
Styles compartilhados: `src/styles/shared.ts` (inputStyle, btnPrimary, labelSm, etc.).

---

## 11. Componentes Compartilhados

| Componente | Arquivo | Descricao |
|-----------|---------|-----------|
| Button | `app/components/Button.tsx` | 5 variants (primary, secondary, ghost, outline, danger), 3 sizes |
| ConfirmModal | `app/components/ConfirmModal.tsx` | Modal de confirmacao com borda vermelha |
| ErrorBoundary | `app/components/ErrorBoundary.tsx` | Catch de erros com fallback UI + retry |
| NewBugModal | `app/components/NewBugModal.tsx` | Modal de criacao de bug |
| Toast | `app/components/Toast.tsx` | showToast() global, undo action support |
| UserMenu | `app/components/UserMenu.tsx` | Dropdown: perfil, senha, squad, logout |

---

## 12. Comandos

```bash
npm install          # Instalar dependencias
npm run dev:client   # Frontend (Vite, porta 5173)
npm run dev          # Backend (Express, porta 3000)
npm run typecheck    # Verificar tipos TypeScript
npm run build        # Build de producao (tsc + vite)
npm start            # Inicia server.js
npm run seed         # Seed de dados locais
supabase start       # Sobe banco local (Docker)
supabase db push --local  # Aplica migrations
```

---

## 13. E2E Tests (Playwright)

| Spec | Modulo | Testes |
|------|--------|--------|
| home.spec.ts | Sprints | Sem erros JS, sidebar, botao, snapshot |
| status-report.spec.ts | Status Report | Listagem, CRUD, abas, snapshots |
| releases.spec.ts | Releases | Sem erros, tabs, cronograma, snapshot |
| squads.spec.ts | Squads | Sem erros, tabs, novo squad, snapshot |
| persistencia.spec.ts | Cross | Master index, sem credenciais |
| visual-regression.spec.ts | Cross | Snapshots visuais |
| cadastros.spec.ts | Squads | Cadastros |
| dashboard-home.spec.ts | Home | Dashboard |

Login automatico via helper `login()` (admin@tostatos.com).

---

## 14. Skills e Commands do Claude

### Skills (.claude/skills/)
| Skill | Comando | Persona |
|-------|---------|---------|
| `ux-expert` | UX | Jordan Vega — UX Designer |
| `qa-senior` | QA | Alex Moura — QA Senior (+ regressivo visual + funcional) |
| `product-manager` | PO | Marina Caldas — Product Manager |
| `software-engineer` | DEV | Rafael Torres — Engenheiro Senior |
| `front` | FRONT | Frontend QA Reviewer |
| `back` | BACK | Backend Engineer (6 modos) |

### Commands (.claude/commands/)
- `regressivo.md` — Ciclo completo de regressao QA
- `regressivo-visual.md` — Regressao visual com Playwright CLI
- `seguranca.md` — Testes de seguranca

---

## 15. Otimizacoes Implementadas

- **Lazy loading**: 5 rotas pesadas carregadas sob demanda
- **React.memo**: 16 sub-componentes memoizados (OverviewTab, ComparePage, CronogramaTab, ReportDashboard, ItemRow, SectionCard)
- **Paginacao**: syncAllFromSupabase usa PAGE_SIZE=100
- **Crash recovery**: beforeunload + sendBeacon em 3 modulos
- **Console guards**: Todos console.log/warn/error condicionados a import.meta.env.DEV
- **Error Boundary**: Outlet envolto em ErrorBoundary com fallback UI
- **Shared styles**: src/styles/shared.ts elimina duplicacao de 28 style objects
- **Chart colors**: src/lib/chartColors.ts centraliza palette para future dark mode
- **Focus ring global**: CSS focus-visible em todos elementos interativos
- **aria-labels**: Todos botoes interativos com labels acessiveis
