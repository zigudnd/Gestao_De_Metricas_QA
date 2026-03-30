# Contexto Completo do Projeto — ToStatos QA Dashboard

> **Objetivo deste documento:** Fornecer contexto completo para onboarding rapido em novas conversas.
> Leia este arquivo antes de iniciar qualquer tarefa no projeto.
> **Ultima atualizacao:** 29 Março 2026

---

## 1. O que e o ToStatos

Plataforma de gestao de metricas QA para acompanhamento de sprints ageis. Centraliza KPIs, progresso de execucao de testes, bugs, bloqueios, alinhamentos tecnicos, status reports semanais e notas operacionais em um unico dashboard colaborativo.

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
├── index.css                          # Tailwind v4 @import + @theme (cores, fontes, tokens)
├── lib/
│   ├── supabase.ts                    # Cliente Supabase singleton
│   └── auditService.ts               # Servico de audit logs (logAudit)
├── app/
│   ├── components/
│   │   ├── ConfirmModal.tsx           # Modal de confirmacao reutilizavel
│   │   ├── Toast.tsx                  # Componente Toast/Snackbar global (showToast)
│   │   ├── NewBugModal.tsx            # Modal de criacao de bug
│   │   ├── ProtectedRoute.tsx         # Guard de auth + redirect must_change_password
│   │   └── TermoConclusaoModal.tsx    # Modal de conclusao de sprint
│   ├── layout/
│   │   ├── AppShell.tsx               # Layout raiz — syncAll no mount (sprints + status reports)
│   │   ├── Sidebar.tsx                # Navegacao lateral (Sprints, Squads, Status Report, Docs)
│   │   ├── Topbar.tsx                 # Barra superior com acoes contextuais
│   │   └── SaveToast.tsx              # Toast de "Salvo" (observa lastSaved)
│   ├── pages/
│   │   ├── DashboardHome.tsx          # Pagina inicial do app (rota /)
│   │   └── DocsPage.tsx               # Pagina de documentacao do sistema
│   └── routes.tsx                     # Hash Router com todas as rotas
├── modules/
│   ├── auth/
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx           # Login / Registro
│   │   │   ├── ProfilePage.tsx        # Editar perfil (display_name, senha)
│   │   │   └── ChangePasswordPage.tsx # Troca obrigatoria (fora do AppShell)
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
│   │   │   ├── HomePage.tsx           # Listagem compacta de sprints (cards lista)
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
│   ├── squads/
│   │   ├── pages/
│   │   │   └── SquadsPage.tsx         # 3 abas: Squads, Perfis de Acesso, Usuarios
│   │   └── services/
│   │       └── squadsService.ts       # CRUD squads, members, permissions, users, reset senha
│   └── status-report/
│       ├── components/
│       │   ├── ReportDashboard.tsx     # Dashboard KPIs (progresso, atrasos, cadeia, carga)
│       │   ├── SectionCard.tsx         # Card de secao expandivel com items
│       │   ├── SectionManager.tsx      # Modal de gestao de secoes (CRUD, reordenar)
│       │   ├── ItemRow.tsx             # Linha de item com priority bar, move arrows
│       │   ├── ItemFormModal.tsx       # Modal de criar item (campos essenciais + avancados)
│       │   ├── ItemDetailPanel.tsx     # Painel lateral de detalhes do item
│       │   ├── ReportPreview.tsx       # Preview exportavel 2 colunas + generateClipboardText
│       │   └── GanttView.tsx           # Gantt SVG com dependencias e scroll indicator
│       ├── pages/
│       │   ├── StatusReportHomePage.tsx # Listagem de reports (filtros, favoritos, migrar, duplicar)
│       │   └── StatusReportPage.tsx    # Editor de report (tabs: Editor, Preview, Gantt)
│       ├── services/
│       │   ├── statusReportPersistence.ts # localStorage + Supabase + Realtime + sendBeacon
│       │   ├── statusReportExport.ts   # Export JPG via html2canvas
│       │   └── dateEngine.ts           # Topological sort de datas com dependencias
│       ├── store/
│       │   ├── statusReportStore.ts    # Zustand store (CRUD, deps, secoes, config)
│       │   └── seedData.ts            # Dados de exemplo para demo
│       └── types/
│           └── statusReport.types.ts  # Tipos: Item, Section, Config, ComputedDates
supabase/
├── config.toml                        # Config Supabase local
└── migrations/                        # 13 migrations SQL sequenciais
server.js                              # Express: serve SPA + API admin + health + flush
```

---

## 4. Rotas (HashRouter)

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | AuthPage | Publica |
| `/change-password` | ChangePasswordPage | Protegida (fora do AppShell) |
| `/` | DashboardHome | Protegida |
| `/sprints` | HomePage | Protegida |
| `/sprints/compare` | ComparePage | Protegida |
| `/sprints/:sprintId` | SprintDashboard | Protegida |
| `/squads` | SquadsPage | Protegida |
| `/status-report` | StatusReportHomePage | Protegida |
| `/status-report/:reportId` | StatusReportPage | Protegida |
| `/profile` | ProfilePage | Protegida |
| `/docs` | DocsPage | Protegida |

**ProtectedRoute:** redireciona para `/login` se nao autenticado. Se `must_change_password === true`, redireciona para `/change-password` (rota standalone, sem sidebar/topbar).

---

## 5. Modulos

### 5.1 Auth (`src/modules/auth/`)

- **AuthPage** — Login com email/senha via Supabase Auth. Registro desabilitado (usuarios criados pelo admin).
- **authStore** (Zustand) — Gerencia `user`, `session`, `profile` (id, email, display_name, global_role).
- **ProfilePage** — Editar display_name, alterar senha.
- **ChangePasswordPage** — Troca obrigatoria no primeiro login. Rota standalone (fora do AppShell) para UX limpa.
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

**HomePage** — Lista de sprints em formato compacto (cards lista com dot colorido, titulo, subtitle com squad + periodo + progresso, mini progress bar). Acoes no hover (favoritar, excluir). Filtros: busca, squad, status, ano. Admin ve todas as sprints; demais veem apenas sprints dos seus squads.

### 5.3 Squads (`src/modules/squads/`)

3 abas: **👥 Squads**, **🔐 Perfis de Acesso**, **👤 Usuarios** (admin only)

- **Squad** — Equipe com nome, descricao, cor (swatch picker). Criada via RPC `create_squad_with_lead`. Cards expansiveis com contagem de membros.
- **Roles:** `qa_lead` (lider), `qa`, `stakeholder`
- **Permissoes granulares** por membro: `delete_sprints`, `delete_bugs`, `delete_features`, `delete_test_cases`, `delete_suites`, `delete_blockers`, `delete_alignments`
- **Permission Profiles** — Templates de permissao reutilizaveis (4 de sistema + custom)
- **Adicionar membro** — Toggle form com autocomplete, seletor de role (QA Lead/QA/Stakeholder), seletor de perfil de permissao
- **Avatares variados por role** — Admin: amarelo, QA Lead: azul escuro, QA: verde, Stakeholder: cinza
- **Gestao de usuarios (admin):** criar (senha Mudar@123), resetar senha (🔑), ativar/desativar, alterar role global, filtros (role + status + busca por squad)
- **Toasts de sucesso** em todas as acoes CRUD
- **Auto-dismiss** do erro toast (6s)
- **Empty state** com CTA na aba Squads

### 5.4 Status Report (`src/modules/status-report/`)

Modulo de relatorios de status semanais por squad/projeto.

**StatusReportHomePage** — Listagem de reports com:
- Filtros: status (Todos/Ativos/Concluidos/Favoritos), busca, data range
- Acoes: criar, duplicar, migrar itens entre reports (copiar/mover), concluir/reativar, excluir
- Cards com star favorito, titulo, squad, item count, periodo, timestamp

**StatusReportPage** — Editor com 3 abas:
1. **Editor** — Secoes customizaveis (CRUD, reordenar, cores), itens com prioridade, stacks, %, dependencias, move arrows (sempre visiveis, opacity 0.3→1 no hover)
2. **Preview Report** — Layout 2 colunas (left/right), exportavel para clipboard (texto) e JPG
3. **Gantt** — Timeline SVG com barras de progresso, dependencias (Bezier curves), hoje line, scroll indicator

**ReportDashboard** (colapsavel) — KPIs derivados:
- Progresso geral (ring chart), itens atrasados, sem data, risco cadeia (dependem de atrasados)
- Alerta de alta prioridade parados (< 30%)
- Barras por secao, por responsavel (top 6), por stack
- Breakdown por prioridade

**ItemFormModal** — Campos essenciais (titulo, secao, prioridade, stacks, %, responsavel) + toggle "Mais opcoes" (datas, predecessores, notas, Jira)

**Indicador de sync** — "● Salvo HH:MM" no header (verde quando synced, amarelo quando salvando)

**Export JPG** — Loading state "Gerando..." durante html2canvas

**Persistencia** — localStorage + Supabase + Realtime + sendBeacon flush no beforeunload

**Secoes default:** Sprint Atual (amber), Implantados (green), Debitos Tecnicos (red), Aguardando Producao (cyan), Fila de Teste (purple), Backlog (gray)

**Tipos:**
```ts
interface StatusReportItem {
  id, title, section, priority: 'high'|'medium'|'low',
  stacks: ('ios'|'android'|'bff'|'back')[],
  resp, pct: number, startDate, durationDays, deadlineDate,
  dependsOn: string[], jira, notes, createdAt, updatedAt
}

interface StatusReportConfig {
  title, date, squad, period, periodStart, periodEnd
}

interface SectionDef { id, label, color, side: 'left'|'right' }
```

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

### Fluxo de Save (Sprints)
```
updateField → _commit → computeFields → saveToStorage → upsertMasterIndex → queueRemotePersist (debounce 700ms)
```

### Fluxo de Save (Status Reports)
```
updateField → _commit → saveToLocalStorage → upsertMasterIndex → queueRemotePersist (debounce 700ms)
beforeunload → sendBeacon(/api/status-report-flush) para flush pendente
```

### localStorage (cache sincrono)
- `qaDashboardData_<sprintId>` — SprintState completo
- `qaDashboardMasterIndex` — SprintIndexEntry[]
- `statusReport_<reportId>` — StatusReportState completo
- `statusReportMasterIndex` — StatusReportIndexEntry

### Supabase (primario quando disponivel)
- Tabela `sprints`: `id (text PK)`, `data (jsonb)`, `status (text)`, `squad_id (uuid FK)`, `updated_at`
- Tabela `status_reports`: `id (text PK)`, `data (jsonb)`, `squad_id (uuid FK)`, `status (text)`, `updated_at`
- `syncAllFromSupabase()` — startup: puxa dados e popula localStorage
- Realtime subscriptions para sync multi-usuario

### Realtime
```
supabase.channel('sprint:<id>').on('postgres_changes', UPDATE) → normalizeState → computeFields → set()
supabase.channel('status-report:<id>').on('postgres_changes', UPDATE) → normalizeState → set()
```

---

## 9. Server (Express — server.js)

| Endpoint | Metodo | Auth | Descricao |
|----------|--------|------|-----------|
| `/config.js` | GET | Nao | Config JS injetada no client |
| `/api/health` | GET | Nao | Health check (`{ ok: true }`) |
| `/api/dashboard/:projectKey` | GET | Nao | Busca dashboard (Supabase ou local) |
| `/api/dashboard/:projectKey` | PUT | Nao | Salva dashboard |
| `/api/admin/create-user` | POST | Bearer + admin | Cria usuario via Supabase Auth Admin |
| `/api/admin/reset-password` | POST | Bearer + admin | Reseta senha para Mudar@123 + flag must_change_password |
| `/api/status-report-flush` | POST | Nao | Flush de status report via sendBeacon |
| `*` | GET | Nao | Fallback: serve `public/index.html` (SPA) |

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
| 11 | `20260327000010_status_reports.sql` | Tabela status_reports + RLS + indices |
| 12 | `20260327000011_audit_logs.sql` | Tabela audit_logs |

**Total: 13 migrations**

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
- **Status Report JPG** — Export da aba Preview via html2canvas (com loading state)
- **Status Report Clipboard** — Texto formatado para colar em Slack/Teams (`generateClipboardText`)

### Importacao
- **.feature** — Parser Gherkin (Feature/Scenario/Cenario) → cria features e casos
- **.csv** — Formato: `Funcionalidade,Cenario,Complexidade,Gherkin` → cria features e casos
- **JSON** — Importa backup completo como nova sprint (`importFromJSON`)

---

## 14. Componentes Compartilhados

| Componente | Arquivo | Descricao |
|-----------|---------|-----------|
| `ConfirmModal` | `src/app/components/ConfirmModal.tsx` | Modal de confirmacao com titulo, descricao, botao destrutivo |
| `Toast` / `showToast` | `src/app/components/Toast.tsx` | Snackbar com auto-dismiss, tipos (success/info/error), acao opcional (undo) |
| `ProtectedRoute` | `src/app/components/ProtectedRoute.tsx` | Guard de auth + redirect must_change_password |
| `NewBugModal` | `src/app/components/NewBugModal.tsx` | Modal de criacao rapida de bug |

---

## 15. Design System (index.css @theme)

### Paleta de cores semantica
- `--color-bg` (#f7f6f2), `--color-surface` (#fff), `--color-surface-2` (#f2f1ed)
- `--color-text` (#1a1a18), `--color-text-2` (#6b6a65), `--color-text-3` (#a09f99)
- `--color-blue` (#185fa5), `--color-blue-light` (#e6f1fb), `--color-blue-text` (#0c447c)
- `--color-green` (#3b6d11), `--color-green-light` (#eaf3de)
- `--color-red` (#a32d2d), `--color-red-light` (#fcebeb)
- `--color-amber` (#854f0b), `--color-amber-light` (#faeeda)
- `--color-border` (rgba 0.08), `--color-border-md` (rgba 0.14)

### Tokens
- `--radius-sm` (6px), `--radius-md` (8px), `--radius-lg` (12px)
- `--shadow-sm/md/lg/xl`
- `--focus-ring` (0 0 0 3px rgba blue 0.3)
- `--font-family-sans` (IBM Plex Sans), `--font-family-mono` (IBM Plex Mono)

---

## 16. Outros Documentos

| Documento | Conteudo |
|-----------|----------|
| `CLAUDE.md` | Quick start dev, stack, ciclo de qualidade, modulos, endpoints |
| `README.md` | Guia do usuario: instalacao Docker/Supabase, modos, deploy |
| `ENGINEERING_DOCS.md` | Arquitetura tecnica detalhada |
| `BUSINESS_RULES.md` | Regras de negocio implementadas |
| `documentacao/melhorias.md` | Notas de roadmap |
| `documentacao/BACKLOG_Q2.md` | Backlog planejado Q2 2026 |

---

## 17. Skills e Comandos Claude

### Skills (`.claude/skills/`)
| Skill | Persona | Descricao |
|-------|---------|-----------|
| `ux-expert` | Jordan Vega | Avaliacao de interface e usabilidade (7 dimensoes) |
| `product-manager` | Marina Caldas | Historias de usuario, features, backlog, RICE |
| `qa-senior` | — | Ciclo de QA com checklists |
| `software-engineer` | — | Implementacao tecnica |

### Comandos (`.claude/commands/`)
| Comando | Descricao |
|---------|-----------|
| `/regressivo` | Ciclo completo de regressao QA (6 fases) |
| `/regressivo-visual` | Regressao visual com Playwright CLI |
| `/seguranca` | Testes de seguranca |

### Triggers por palavra-chave (memory)
| Palavra | Acao |
|---------|------|
| `REGRESSIVO` | Executa `.claude/commands/regressivo.md` |
| `UX` | Executa protocolo UX Expert (Jordan Vega) |
| `PO` | Executa protocolo Product Manager (Marina Caldas) |
| `QA` | Executa QA Senior + regressivo visual + regressivo |
