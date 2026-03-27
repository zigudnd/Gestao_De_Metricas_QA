# Engineering Documentation — ToStatos QA Dashboard

> **Versao:** 4.0 — Multi-user + Auth + Squads
> **Ultima atualizacao:** Marco 2026
> **Tipo de sistema:** Single Page Application (SPA) — React 19 + TypeScript + Vite

---

## Stack

| Camada | Tecnologia | Versao |
|--------|-----------|--------|
| Frontend Framework | React | 19.x |
| Language | TypeScript | 5.9 |
| Build Tool | Vite | 6.4 |
| CSS | Tailwind CSS v4 + tema customizado (`@theme` em `index.css`) |
| State Management | Zustand | 5.x |
| Routing | React Router DOM (HashRouter) | 7.x |
| Charts | Chart.js + react-chartjs-2 | 4.x / 5.x |
| Chart Labels | chartjs-plugin-datalabels | 2.x |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | — |
| Persistencia Local | localStorage (cache sincrono) | — |
| Banco de Dados | Supabase (PostgreSQL) | 2.x |
| Autenticacao | Supabase Auth (GoTrue) | 2.x |
| Realtime | Supabase Realtime (WebSocket) | 2.x |
| Client Supabase | @supabase/supabase-js | 2.x |
| Export | html2canvas | — |
| E2E Testing | Playwright | 1.58 |

---

## Estrutura de Diretorios

```
src/
├── main.tsx                           # Entry point React
├── index.css                          # Tailwind v4 @import + @theme (cores, fontes)
├── lib/
│   └── supabase.ts                    # Cliente Supabase singleton (createClient)
├── app/
│   ├── components/
│   │   ├── ConfirmModal.tsx           # Modal de confirmacao reutilizavel
│   │   ├── NewBugModal.tsx            # Modal de criacao de bug reutilizavel
│   │   ├── ProtectedRoute.tsx         # Guard de autenticacao (redireciona p/ /login)
│   │   └── TermoConclusaoModal.tsx    # Modal de termo de conclusao de sprint
│   ├── layout/
│   │   ├── AppShell.tsx               # Layout raiz — inicia syncAllFromSupabase no mount
│   │   ├── Sidebar.tsx                # Navegacao lateral com icones
│   │   ├── Topbar.tsx                 # Barra superior com acoes contextuais
│   │   └── SaveToast.tsx              # Toast de "Salvo" (observa lastSaved)
│   ├── pages/
│   │   └── DocsPage.tsx               # Pagina de documentacao do sistema
│   └── routes.tsx                     # Hash Router com todas as rotas
├── modules/
│   ├── auth/                          # Modulo de autenticacao
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx           # Login / Registro
│   │   │   ├── ProfilePage.tsx        # Edicao de perfil (display_name)
│   │   │   └── ChangePasswordPage.tsx # Troca de senha
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
│   │       └── sprint.types.ts        # Todos os tipos TypeScript
│   └── squads/                        # Modulo de squads e gestao de usuarios
│       ├── pages/
│       │   └── SquadsPage.tsx         # Gestao de squads, membros, usuarios, permissoes
│       └── services/
│           └── squadsService.ts       # CRUD squads, members, permissions, users (admin)
supabase/
├── config.toml                        # Configuracao do Supabase local
└── migrations/                        # 11 migrations SQL sequenciais
server.js                              # Express: serve SPA + API admin + health
```

---

## Roteamento

| Rota | Componente | Acesso |
|------|-----------|--------|
| `/login` | AuthPage | Publica |
| `/` | redirect → `/sprints` | Protegida |
| `/sprints` | HomePage | Protegida |
| `/sprints/compare` | ComparePage | Protegida |
| `/sprints/:sprintId` | SprintDashboard | Protegida |
| `/squads` | SquadsPage | Protegida |
| `/profile` | ProfilePage | Protegida |
| `/change-password` | ChangePasswordPage | Protegida |
| `/docs` | DocsPage | Protegida |

Rotas protegidas passam por `ProtectedRoute` → redireciona para `/login` se nao autenticado.

---

## Modulo Auth (`src/modules/auth/`)

### authStore (Zustand)

```ts
AuthState {
  user: User | null              // Supabase User
  session: Session | null        // Supabase Session
  loading: boolean               // true ate getSession() resolver
  profile: Profile | null        // { id, email, display_name, global_role }
  setSession(session)
  updateDisplayName(name)
  signOut()
}
```

### Profile

```ts
interface Profile {
  id: string
  email: string
  display_name: string
  global_role: 'admin' | 'user'
}
```

### Bootstrap
- `supabase.auth.getSession()` restaura sessao existente ao carregar
- `supabase.auth.onAuthStateChange()` escuta login/logout/refresh
- `loadProfile(userId)` carrega dados da tabela `profiles`

### Credenciais padrao
- Admin: `admin@tostatos.com` / `Admin@123`
- Novos usuarios: `Mudar@123` (troca obrigatoria no primeiro login)

---

## Modulo Squads (`src/modules/squads/`)

### Types

```ts
type SquadRole = 'qa_lead' | 'qa' | 'stakeholder'

interface Squad {
  id: string; name: string; description: string
  color: string; created_by: string; created_at: string
}

interface SquadMember {
  id: string; squad_id: string; user_id: string
  role: SquadRole; permissions: MemberPermissions
  profile?: { email, display_name, global_role }
}

interface MemberPermissions {
  delete_sprints: boolean; delete_bugs: boolean
  delete_features: boolean; delete_test_cases: boolean
  delete_suites: boolean; delete_blockers: boolean
  delete_alignments: boolean
}

interface PermissionProfile {
  id: string; name: string; description: string
  permissions: MemberPermissions; is_system: boolean
}
```

### Funcoes do squadsService

| Funcao | Descricao |
|--------|-----------|
| `listMySquads()` | Lista squads do usuario |
| `createSquad(name, desc, color)` | Cria squad via RPC `create_squad_with_lead` |
| `updateSquad(id, fields)` | Atualiza squad |
| `deleteSquad(id)` | Exclui squad |
| `listSquadMembers(squadId)` | Lista membros com perfil |
| `addMember(squadId, userId, role, perms)` | Adiciona membro |
| `updateMemberRole(memberId, role)` | Altera role |
| `updateMemberPermissions(memberId, perms)` | Altera permissoes |
| `removeMember(memberId)` | Remove membro |
| `getMyRole(squadId)` | Retorna role do usuario logado |
| `getMySquadIds()` | Retorna squad_ids do usuario (para filtrar sprints) |
| `createUser(email, displayName)` | Cria usuario via `/api/admin/create-user` |
| `listAllUsers()` | Lista todos os perfis |
| `listAllUsersWithSquads()` | Lista usuarios com squads vinculados |
| `updateUserProfile(userId, fields)` | Atualiza display_name/global_role |
| `toggleUserActive(userId, active)` | Ativa/desativa usuario |
| `setGlobalRole(userId, role)` | Define role global (admin/user) |
| `listPermissionProfiles()` | Lista templates de permissao |
| `createPermissionProfile(name, desc, perms)` | Cria template |
| `updatePermissionProfile(id, name, desc, perms)` | Atualiza template |
| `deletePermissionProfile(id)` | Exclui template |

---

## Arquitetura de Estado

### Store Central (`sprintStore.ts`)

O estado de cada sprint aberta e gerenciado pelo Zustand via `useSprintStore`.

```
SprintStore {
  sprintId: string
  state: SprintState          // dados da sprint ativa
  lastSaved: number           // timestamp do ultimo save (triggera SaveToast)
  activeSuiteFilter: Set<str> // suites visiveis no filtro
}
```

### Ciclo de Commit (_commit)

Todo update segue este padrao:

```
1. Chama _commit({ ...state, novoCampo })
2. computeFields(next)        → recalcula tests, exec, gherkinExecs
3. saveToStorage(id, s)       → grava no localStorage (sincrono, imediato)
4. upsertMasterIndex(id)      → atualiza totalTests/totalExec no indice local
5. queueRemotePersist()       → debounce 700ms → upsert no Supabase (async)
6. set({ state, lastSaved })  → atualiza o store e dispara SaveToast
```

### Acoes do Store

Principais acoes alem do _commit:

| Acao | Descricao |
|------|-----------|
| `initSprint(id)` | Carrega sprint e inicia subscription Realtime |
| `resetSprint()` | Cancela subscription e limpa estado |
| `reorderFeatures(suiteId, from, to)` | Reordena features dentro de uma suite |
| `importFeatures(features)` | Importa features de arquivo (.feature/.csv) |

### Realtime (co-edicao)

Quando uma sprint e aberta (`initSprint`), o store cria uma subscription Supabase Realtime:

```
supabase.channel('sprint:<id>')
  .on('postgres_changes', { event: 'UPDATE', table: 'sprints', filter: 'id=eq.<id>' }, callback)

callback → normalizeState → computeFields → saveToStorage → set({ state })
```

A tela do colega atualiza em ~200ms sem necessidade de F5.
A subscription e cancelada em `resetSprint` (ao navegar para outra pagina).

### getFilteredFeatures

Seletor puro exportado que aplica o `activeSuiteFilter` sobre `state.features`.
Usado em `OverviewTab` e `useSprintMetrics` para garantir consistencia de metricas com os filtros.

---

## Componentes Compartilhados

### ConfirmModal
```tsx
<ConfirmModal
  title="Titulo"
  description="Descricao do que sera excluido"
  confirmLabel="Excluir"   // opcional, default: 'Excluir'
  onConfirm={() => void}
  onCancel={() => void}
/>
```
Borda vermelha no topo. Fechar clicando no backdrop.

### NewBugModal
```tsx
<NewBugModal
  featureNames={string[]}
  assignees={string[]}
  stacks={string[]}                    // opcional — stacks ja usadas na sprint
  currentDate={string}
  initialDraft={Partial<NewBugDraft>}  // opcional
  onConfirm={(draft) => void}
  onCancel={() => void}
/>
```
- Stacks padrao: `Front`, `BFF`, `Back`, `Mobile`, `Infra`.
- Stacks customizadas criaveis inline via opcao "Nova stack..." no select (sentinela `__new__`).
- Reutilizado em `BugsTab` e `FeaturesTab` (via status Falhou no TestCaseCard).

### ProtectedRoute
Guard de autenticacao. Verifica `useAuthStore.session`:
- Se `loading` → exibe spinner
- Se sem sessao → redireciona para `/login`
- Se autenticado → renderiza `children`

---

## Tipos Principais

### TestCase
```ts
interface TestCase {
  id: number
  name: string
  complexity: 'Baixa' | 'Moderada' | 'Alta'
  status: 'Pendente' | 'Concluido' | 'Falhou' | 'Bloqueado'
  executionDay: string   // 'D1', 'D2', ... | ''
  gherkin: string        // texto Gherkin completo do cenario
}
```

### Feature
```ts
interface Feature {
  id: number
  suiteId: number
  name: string
  tests: number           // calculado: cases.length + manualTests
  manualTests: number
  exec: number            // calculado: sum(execution)
  execution: Record<string, number>
  manualExecData: Record<string, number>
  gherkinExecs: Record<string, number>
  mockupImage: string     // base64
  status: 'Ativa' | 'Bloqueada' | 'Cancelada'
  blockReason: string
  activeFilter: TestCaseStatus | 'Todos'
  cases: TestCase[]
}
```

### Suite
```ts
interface Suite {
  id: number
  name: string
}
```

### Bug
```ts
interface Bug {
  id: string
  desc: string
  feature: string
  stack: 'Front' | 'BFF' | 'Back' | 'Mobile' | 'Infra' | string
  category?: string       // categoria opcional do bug
  severity: 'Critica' | 'Alta' | 'Media' | 'Baixa'
  assignee: string
  status: 'Aberto' | 'Em Andamento' | 'Falhou' | 'Resolvido'
  retests: number
  openedAt?: string       // ISO date string
  resolvedAt?: string     // ISO date string
  notes?: string
}
```

### Blocker
```ts
interface Blocker {
  id: number
  date: string           // ISO date string
  reason: string
  hours: number
}
```

### Alignment
```ts
interface Alignment {
  id: number
  text: string
}
```

### ResponsiblePerson
```ts
interface ResponsiblePerson {
  id: number
  role: string   // PO, TL, Coordenador, Gerente, etc.
  name: string
}
```

### Notes
```ts
interface Notes {
  premises: string          // Premissas do ciclo de testes
  actionPlan: string        // Plano de acao / gestao de risco
  operationalNotes: string  // Notas operacionais livres
}
```

### SprintConfig
```ts
interface SprintConfig {
  sprintDays: number
  title: string              // titulo da sprint
  startDate: string
  endDate: string
  targetVersion: string      // versao alvo da sprint
  squad: string              // nome do squad (texto livre)
  qaName: string             // nome do QA responsavel
  excludeWeekends: boolean   // true = exclui fins de semana (padrao)
  // Health Score weights
  hsCritical: number         // default 15
  hsHigh: number             // default 10
  hsMedium: number           // default 5
  hsLow: number              // default 2
  hsRetest: number           // default 2
  hsBlocked: number          // default 10
  hsDelayed: number          // default 2
  // Impacto Prevenido weights
  psCritical: number         // default 10
  psHigh: number             // default 5
  psMedium: number           // default 3
  psLow: number              // default 1
}
```

### SprintState
```ts
interface SprintState {
  config: SprintConfig
  currentDate: string
  reports: Record<string, string>   // { '2024-01-15': 'report text' }
  notes: Notes
  alignments: Alignment[]
  suites: Suite[]
  features: Feature[]
  blockers: Blocker[]
  bugs: Bug[]
  responsibles: ResponsiblePerson[]
}
```

### SprintIndexEntry
```ts
interface SprintIndexEntry {
  id: string
  title: string
  squad: string
  squadId?: string              // UUID da Squad no Supabase (null = sprint pessoal/legada)
  startDate: string
  endDate: string
  totalTests: number
  totalExec: number
  updatedAt: string
  favorite?: boolean
  status?: 'ativa' | 'concluida'
}
```

---

## Helpers de Dias Uteis (`persistence.ts`)

```ts
// Conta dias uteis entre duas datas, respeitando excludeWeekends
countSprintDays(startDate: string, endDate: string, excludeWeekends: boolean): number

// Converte numero de dia de sprint (1-based) em Date
sprintDayToDate(startDate: string, n: number, excludeWeekends: boolean): Date

// Converte uma data em chave 'D1'/'D2'/... ou null se fora do escopo
dateToSprintDayKey(dateStr: string, startDate: string, sprintDays: number, excludeWeekends: boolean): string | null
```

---

## computeFields

Funcao pura em `persistence.ts` que recalcula campos derivados:

```ts
// Por Feature:
gherkinExecs[Dk] = count of cases where executionDay === 'Dk'
execution[Dk]    = manualExecData[Dk] + gherkinExecs[Dk]
exec             = sum(execution)
tests            = cases.length + manualTests

// Por SprintState:
totalTests = sum(features[].tests)
totalExec  = sum(features[].exec)
```

---

## Persistencia

### Tabela Supabase: `sprints`

```sql
create table sprints (
  id         text primary key,
  data       jsonb not null,          -- SprintState completo
  status     text default 'ativa',    -- 'ativa' | 'concluida'
  updated_at timestamptz default now()
);
```

### Tabelas de autenticacao e squads

```sql
-- Criadas automaticamente pelo Supabase Auth:
auth.users                      -- usuarios (email, senha, metadata)

-- Tabelas customizadas:
profiles (id, email, display_name, global_role, active)
squads (id, name, description, color, created_by, created_at)
squad_members (id, squad_id, user_id, role, permissions, created_at)
permission_profiles (id, name, description, permissions, is_system, created_by, created_at)
```

### Keys de localStorage (cache local)
| Key | Conteudo |
|-----|---------|
| `qaDashboardData_<sprintId>` | `SprintState` completo (cache) |
| `qaDashboardMasterIndex` | `SprintIndexEntry[]` (cache) |

O localStorage funciona como cache sincrono: leitura instantanea sem await, e fallback quando o Supabase esta indisponivel.

### Funcoes de persistencia (`persistence.ts`)

| Funcao | Tipo | Descricao |
|--------|------|-----------|
| `loadFromStorage(id)` | sync | Le do localStorage |
| `saveToStorage(id, state)` | sync | Grava no localStorage |
| `getMasterIndex()` | sync | Le o indice do localStorage |
| `saveMasterIndex(index)` | sync | Grava o indice no localStorage |
| `upsertSprintInMasterIndex(id, state)` | sync | Atualiza/cria entrada no indice |
| `loadFromServer(id)` | async | Carrega sprint do Supabase |
| `persistToServer(id, state)` | async | Upsert no Supabase |
| `syncAllFromSupabase()` | async | Startup: puxa todas as sprints e popula o localStorage |
| `deleteSprintFromSupabase(id)` | async | Remove sprint do Supabase |
| `concludeSprint(id)` | sync + fire | Atualiza status local e no Supabase |
| `reactivateSprint(id)` | sync + fire | Idem para reativacao |
| `toggleFavoriteSprint(id)` | sync | Inverte favorito no indice local (nao sincroniza) |
| `normalizeState(raw)` | sync | Garante campos obrigatorios com defaults |
| `computeFields(state)` | sync | Recalcula campos derivados |

---

## Graficos (Chart.js)

### Registro Global
`ChartDataLabels` e registrado globalmente. Todo grafico que **nao** deve exibir labels precisa:
```ts
plugins: { datalabels: { display: false } }
```

### Progresso por Funcionalidade
- Agrupado por suite (`featsBySuite`).
- Fonte: `cases[].status` (nao mais `f.exec`).
- Datasets: Concluido, Falhou, Bloqueado, Pendente.
- Um `<Bar>` por suite, legenda exibida apenas no primeiro.

---

## Drag & Drop

### Sprints (HomePage)
- HTML5 nativo. Reordena `MasterIndex` no localStorage.

### Funcionalidades (FeaturesTab / SuiteAccordion)
- HTML5 nativo com `dragIdx` / `dragOverIdx` locais.
- Chama `reorderFeatures(suiteId, fromDomIdx, toDomIdx)`.
- Escopo por suite (nao cruza suites).

---

## Fluxos com Modal

| Acao | Modal | Comportamento ao Cancelar |
|------|-------|--------------------------|
| Caso → Concluido | Pede data de execucao | Status nao muda |
| Caso → Falhou | Abre NewBugModal pre-preenchido | Status fica Falhou, bug nao criado |
| Bug → Resolvido | Pede data de resolucao | Status nao muda |
| Funcionalidade → Bloqueada | Pede motivo (obrigatorio) | Status nao muda |
| Funcionalidade → Cancelada | Pede alinhamento tecnico (obrigatorio) + cria Alinhamento automatico | Status nao muda |
| Excluir qualquer item | ConfirmModal | Item nao excluido |

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

## useSprintMetrics

Hook (`src/modules/sprints/components/dashboard/useSprintMetrics.ts`) que deriva KPIs do estado Zustand. Exports:

```ts
// Auxiliares
sprintDays              // dias totais da sprint (default 20)
filtered                // features filtradas pelo activeSuiteFilter
activeFeatures          // features nao-canceladas

// Execucao
totalTests              // soma de feature.tests (features ativas)
totalExec               // soma de feature.exec
remaining               // totalTests - totalExec (min 0)
execPercent             // totalExec / testesExecutaveis * 100

// Capacidade
testesComprometidos     // testes de features Bloqueadas + casos individuais Bloqueados
testesExecutaveis       // totalTests - testesComprometidos
capacidadeReal          // testesExecutaveis / totalTests * 100
blockedFeatureCount     // features com algum impedimento

// Meta e Ritmo
metaPerDay              // ceil(testesExecutaveis / sprintDays)
exactMeta               // testesExecutaveis / sprintDays (sem arredondamento)
atrasoCasos             // diferenca entre meta ideal ate hoje e execucao real
ritmoStatus             // 'ok' | 'warning' | 'danger' baseado em atrasoCasos

// Bugs
openBugs                // bugs com status != Resolvido
totalRetests            // soma de bug.retests
retestIndex             // totalRetests / (totalBugs + totalRetests) * 100

// Sprint
healthScore             // 100 - penalidades (0-100)
totalBlockedHours       // soma de blockers[].hours
```

### Metricas em compareService (nao no hook)

O `compareService.ts` exporta `computeSprintKPIs(state)` com metricas adicionais para comparacao:

```ts
interface SprintKPIs {
  // Inclui tudo acima, mais:
  resolvedBugs            // count de bugs Resolvidos
  mttrGlobal              // tempo medio de resolucao (horas)
}
```

---

## Server (Express — server.js)

| Endpoint | Metodo | Descricao |
|----------|--------|-----------|
| `/config.js` | GET | Config JS injetada no client |
| `/api/health` | GET | Health check (`{ ok: true, storage }`) |
| `/api/dashboard/:projectKey` | GET | Busca dashboard (Supabase ou local) |
| `/api/dashboard/:projectKey` | PUT | Salva dashboard |
| `/api/admin/create-user` | POST | Cria usuario via Supabase Auth Admin (requer `SUPABASE_SERVICE_ROLE_KEY`) |
| `*` | GET | Fallback: serve `public/index.html` (SPA) |

---

## Exportacao / Importacao

### Exportacao (`exportService.ts`)

| Funcao | Formato | Descricao |
|--------|---------|-----------|
| `exportToImage()` | JPG | Captura da aba Overview via html2canvas |
| `exportJSON(state)` | JSON | Backup completo do SprintState |
| `exportCoverage(state)` | CSV | Relatorio de cobertura por suite/feature |
| `exportSuiteAsCSV(name, features)` | CSV | Exporta casos de teste de uma suite (reimportavel) |

### Importacao (`importService.ts` e `exportService.ts`)

| Funcao | Formato | Descricao |
|--------|---------|-----------|
| `parseFeatureText(text, suiteId)` | .feature | Parser Gherkin → cria features e casos |
| `parseCSVText(text, suiteId)` | .csv | Formato: Funcionalidade,Cenario,Complexidade,Gherkin |
| `importFromJSON(file)` | JSON | Importa backup como nova sprint |

---

## CSS — Tailwind v4 + Theme

O projeto usa **Tailwind CSS v4** com tema customizado via bloco `@theme` em `src/index.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #f7f6f2;
  --color-surface: #ffffff;
  --color-surface-2: #f2f1ed;
  --color-border: rgba(0, 0, 0, 0.08);
  --color-border-md: rgba(0, 0, 0, 0.14);
  --color-text: #1a1a18;
  --color-text-2: #6b6a65;
  --color-text-3: #a09f99;
  --color-blue: #185fa5;
  --color-blue-light: #e6f1fb;
  --color-blue-text: #0c447c;
  --color-green: #3b6d11;
  --color-green-light: #eaf3de;
  --color-green-mid: #639922;
  --color-amber: #854f0b;
  --color-amber-light: #faeeda;
  --color-amber-mid: #ba7517;
  --color-yellow: #b45309;
  --color-yellow-light: #fef3c7;
  --color-green-text: #3b6d11;
  --color-red: #a32d2d;
  --color-red-light: #fcebeb;
  --color-red-mid: #e24b4a;
  --font-family-sans: "IBM Plex Sans", system-ui, sans-serif;
  --font-family-mono: "IBM Plex Mono", monospace;
}
```
