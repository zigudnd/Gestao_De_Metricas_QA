# Engineering Documentation — ToStatos QA Dashboard

> **Versão:** 3.1 — Supabase Integration
> **Última atualização:** Março 2026
> **Tipo de sistema:** Single Page Application (SPA) — React 19 + TypeScript + Vite

---

## Stack

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend Framework | React | 19.x |
| Language | TypeScript | 5.x |
| Build Tool | Vite | 6.x |
| State Management | Zustand | 5.x |
| Routing | React Router DOM | 7.x |
| Charts | Chart.js + react-chartjs-2 | 4.x / 5.x |
| Chart Labels | chartjs-plugin-datalabels | 2.x |
| Persistência Local | localStorage (cache síncrono) | — |
| Banco de Dados | Supabase (PostgreSQL) | 2.x |
| Realtime | Supabase Realtime (WebSocket) | 2.x |
| Client Supabase | @supabase/supabase-js | 2.x |
| Export | html2canvas | — |
| CSS | CSS Variables + inline styles | — |

---

## Estrutura de Diretórios

```
src/
├── lib/
│   └── supabase.ts                # Cliente Supabase singleton (createClient)
├── app/
│   ├── components/
│   │   ├── ConfirmModal.tsx       # Modal de confirmação reutilizável
│   │   ├── NewBugModal.tsx        # Modal de criação de bug reutilizável
│   │   └── TermoConclusaoModal.tsx # Modal de termo de conclusão de sprint
│   ├── layout/
│   │   ├── AppShell.tsx           # Layout raiz — inicia syncAllFromSupabase no mount
│   │   ├── Sidebar.tsx            # Navegação lateral com ícones
│   │   ├── Topbar.tsx             # Barra superior com ações contextuais
│   │   └── SaveToast.tsx          # Toast de "Salvo" (observa lastSaved)
│   ├── pages/
│   │   └── DocsPage.tsx           # Página de documentação do sistema
│   ├── routes.tsx                 # Hash Router com todas as rotas
│   └── main.tsx                   # Entry point React
├── modules/
│   └── sprints/
│       ├── components/dashboard/
│       │   ├── OverviewTab.tsx    # Dashboard de resumo com KPIs e gráficos
│       │   ├── ReportTab.tsx      # Daily Report por data
│       │   ├── BugsTab.tsx        # Gestão completa de bugs
│       │   ├── FeaturesTab.tsx    # Suites, funcionalidades e casos de teste
│       │   ├── BlockersTab.tsx    # Registro de impedimentos
│       │   ├── AlignmentsTab.tsx  # Alinhamentos técnicos
│       │   ├── NotesTab.tsx       # Notas da sprint
│       │   ├── ConfigTab.tsx      # Configurações da sprint, Health Score e Impacto Prevenido
│       │   └── useSprintMetrics.ts # Hook com métricas derivadas
│       ├── pages/
│       │   ├── HomePage.tsx       # Listagem e gestão de sprints
│       │   ├── SprintDashboard.tsx # Dashboard individual com tabs
│       │   └── ComparePage.tsx    # Comparação entre sprints (9 gráficos)
│       ├── services/
│       │   ├── persistence.ts     # localStorage (cache) + Supabase (primário) + computeFields
│       │   ├── compareService.ts  # KPIs para comparação entre sprints
│       │   ├── exportService.ts   # Exportação PNG e JSON
│       │   └── importService.ts   # Parser .feature / .csv
│       ├── store/
│       │   └── sprintStore.ts     # Zustand store — persiste no Supabase + Realtime
│       └── types/
│           └── sprint.types.ts    # Todos os tipos TypeScript
└── index.css                      # CSS variables + reset global
```

---

## Arquitetura de Estado

### Store Central (`sprintStore.ts`)

O estado de cada sprint aberta é gerenciado pelo Zustand via `useSprintStore`.

```
SprintStore {
  sprintId: string
  state: SprintState          // dados da sprint ativa
  lastSaved: number           // timestamp do último save (triggera SaveToast)
  activeSuiteFilter: Set<str> // suites visíveis no filtro
}
```

### Ciclo de Commit (_commit)

Todo update segue este padrão:

```
1. Chama _commit({ ...state, novoCampo })
2. computeFields(next)        → recalcula tests, exec, gherkinExecs
3. saveToStorage(id, s)       → grava no localStorage (síncrono, imediato)
4. upsertMasterIndex(id)      → atualiza totalTests/totalExec no índice local
5. queueRemotePersist()       → debounce 700ms → upsert no Supabase (async)
6. set({ state, lastSaved })  → atualiza o store e dispara SaveToast
```

### Realtime (co-edição)

Quando uma sprint é aberta (`initSprint`), o store cria uma subscription Supabase Realtime:

```
supabase.channel('sprint:<id>')
  .on('postgres_changes', { event: 'UPDATE', table: 'sprints', filter: 'id=eq.<id>' }, callback)

callback → normalizeState → computeFields → saveToStorage → set({ state })
```

A tela do colega atualiza em ~200ms sem necessidade de F5.
A subscription é cancelada em `resetSprint` (ao navegar para outra página).

### getFilteredFeatures

Seletor puro que aplica o `activeSuiteFilter` sobre `state.features`.
Usado em `OverviewTab` e `useSprintMetrics` para garantir consistência de métricas com os filtros.

---

## Componentes Compartilhados

### ConfirmModal
```tsx
<ConfirmModal
  title="Título"
  description="Descrição do que será excluído"
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
  stacks={string[]}                    // opcional — stacks já usadas na sprint
  currentDate={string}
  initialDraft={Partial<NewBugDraft>}  // opcional
  onConfirm={(draft) => void}
  onCancel={() => void}
/>
```
- Stacks padrão: `Front`, `BFF`, `Back`, `Mobile`, `Infra`.
- Stacks customizadas criáveis inline via opção "➕ Nova stack…" no select (sentinela `__new__`).
- Reutilizado em `BugsTab` e `FeaturesTab` (via status Falhou no TestCaseCard).

---

## Tipos Principais

### TestCase
```ts
interface TestCase {
  id: number
  name: string
  complexity: 'Baixa' | 'Moderada' | 'Alta'
  status: 'Pendente' | 'Concluído' | 'Falhou' | 'Bloqueado'
  executionDay: string   // 'D1', 'D2', ... | ''
  gherkin: string
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

### Bug
```ts
interface Bug {
  id: string
  desc: string
  feature: string
  stack: 'Front' | 'BFF' | 'Back' | 'Mobile' | 'Infra' | string
  severity: 'Crítica' | 'Alta' | 'Média' | 'Baixa'
  assignee: string
  status: 'Aberto' | 'Em Andamento' | 'Falhou' | 'Resolvido'
  retests: number
  openedAt?: string
  resolvedAt?: string
  notes?: string
}
```

### Notes
```ts
interface Notes {
  premises: string          // Premissas do ciclo de testes
  actionPlan: string        // Plano de ação / gestão de risco
  operationalNotes: string  // Notas operacionais livres (massas, anotações, links)
}
```

### SprintIndexEntry
```ts
interface SprintIndexEntry {
  id: string
  title: string
  squad: string
  startDate: string
  endDate: string
  totalTests: number
  totalExec: number
  updatedAt: string
  favorite?: boolean
}
```

---

## SprintConfig — Campos relevantes

```ts
interface SprintConfig {
  sprintDays: number
  startDate: string
  endDate: string
  excludeWeekends: boolean   // true = exclui fins de semana (padrão)
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

---

## Helpers de Dias Úteis (`persistence.ts`)

```ts
// Conta dias úteis entre duas datas, respeitando excludeWeekends
countSprintDays(startDate: string, endDate: string, excludeWeekends: boolean): number

// Converte número de dia de sprint (1-based) em Date
sprintDayToDate(startDate: string, n: number, excludeWeekends: boolean): Date

// Converte uma data em chave 'D1'/'D2'/... ou null se fora do escopo
dateToSprintDayKey(dateStr: string, startDate: string, sprintDays: number, excludeWeekends: boolean): string | null
```

---

## computeFields

Função pura em `persistence.ts` que recalcula campos derivados:

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

## Persistência

### Tabela Supabase: `sprints`

```sql
create table sprints (
  id         text primary key,
  data       jsonb not null,          -- SprintState completo
  status     text default 'ativa',    -- 'ativa' | 'concluida'
  updated_at timestamptz default now()
);
```

### Keys de localStorage (cache local)
| Key | Conteúdo |
|-----|---------|
| `qaDashboardData_<sprintId>` | `SprintState` completo (cache) |
| `qaDashboardMasterIndex` | `SprintIndexEntry[]` (cache) |

O localStorage funciona como cache síncrono: leitura instantânea sem await, e fallback quando o Supabase está indisponível.

### Funções de persistência (`persistence.ts`)

| Função | Tipo | Descrição |
|--------|------|-----------|
| `loadFromStorage(id)` | sync | Lê do localStorage |
| `saveToStorage(id, state)` | sync | Grava no localStorage |
| `getMasterIndex()` | sync | Lê o índice do localStorage |
| `saveMasterIndex(index)` | sync | Grava o índice no localStorage |
| `loadFromServer(id)` | async | Carrega sprint do Supabase |
| `persistToServer(id, state)` | async | Upsert no Supabase |
| `syncAllFromSupabase()` | async | Startup: puxa todas as sprints do Supabase e popula o localStorage |
| `deleteSprintFromSupabase(id)` | async | Remove sprint do Supabase |
| `concludeSprint(id)` | sync + fire | Atualiza status local e no Supabase |
| `reactivateSprint(id)` | sync + fire | Idem para reativação |

### Favoritar Sprint
```ts
// persistence.ts
export function toggleFavoriteSprint(sprintId: string): void
// Lê o índice, inverte o campo favorite, salva no localStorage.
// Flags de favorito são locais — não sincronizadas com Supabase.
```

---

## Roteamento

```
/             → redirect /sprints
/sprints      → HomePage
/sprints/:id  → SprintDashboard
/docs         → DocsPage
```

---

## Gráficos (Chart.js)

### Registro Global
`ChartDataLabels` é registrado globalmente. Todo gráfico que **não** deve exibir labels precisa:
```ts
plugins: { datalabels: { display: false } }
```

### Progresso por Funcionalidade
- Agrupado por suite (`featsBySuite`).
- Fonte: `cases[].status` (não mais `f.exec`).
- Datasets: Concluído, Falhou, Bloqueado, Pendente.
- Um `<Bar>` por suite, legenda exibida apenas no primeiro.

---

## Drag & Drop

### Sprints (HomePage)
- HTML5 nativo. Reordena `MasterIndex` no localStorage.

### Funcionalidades (FeaturesTab / SuiteAccordion)
- HTML5 nativo com `dragIdx` / `dragOverIdx` locais.
- Chama `reorderFeatures(suiteId, fromDomIdx, toDomIdx)`.
- Escopo por suite (não cruza suites).

---

## Fluxos com Modal

| Ação | Modal | Comportamento ao Cancelar |
|------|-------|--------------------------|
| Caso → Concluído | Pede data de execução | Status não muda |
| Caso → Falhou | Abre NewBugModal pré-preenchido | Status fica Falhou, bug não criado |
| Bug → Resolvido | Pede data de resolução | Status não muda |
| Funcionalidade → Bloqueada | Pede motivo (obrigatório) | Status não muda |
| Funcionalidade → Cancelada | Pede alinhamento técnico (obrigatório) + cria Alinhamento automático | Status não muda |
| Excluir qualquer item | ConfirmModal | Item não excluído |

---

## Scripts

```bash
# Desenvolvimento
supabase start        # Sobe o banco local (Docker) — rodar antes do dev:client
npm run dev:client    # Vite dev server (http://localhost:5173)
npm run dev:client -- --host  # Expõe na rede local para co-edição

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

Hook (`src/modules/sprints/components/dashboard/useSprintMetrics.ts`) que deriva todos os KPIs do estado Zustand. Principais exports:

```ts
// Execução
totalTests, totalExec, remaining, execPercent
// Capacidade
testesComprometidos  // testes de features Bloqueadas
testesExecutaveis    // totalTests - testesComprometidos
capacidadeReal       // % de testes disponíveis para execução (0-100)
// Bugs
openBugs, resolvedBugs, inProgressBugs
mttrGlobal           // tempo médio de resolução (horas) de bugs Resolvidos
retestIndex          // % de bugs com retestes (Índice de Retrabalho)
defeitsPrevenidos    // total de bugs registrados
impactoPrevenido     // score ponderado: Σ(peso_severidade × qtd_bugs)
// Sprint
healthScore          // QA Health Score (0-100, penalidades configuráveis)
horasBloqueadas      // soma de blockers[].hours
metaPorDia           // remaining / diasRestantes
```

---

## CSS Variables

```css
--color-bg, --color-surface, --color-border, --color-border-md
--color-text, --color-text-2, --color-text-3
--color-blue, --color-blue-light, --color-blue-text
--color-green, --color-green-light, --color-green-text
--color-red, --color-red-light, --color-yellow
--font-family-sans, --font-family-mono
```
