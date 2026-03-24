# Engineering Documentation — ToStatos QA Dashboard

> **Versão:** 3.0 — React Migration
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
| Backend | Node.js + Express | 4.x |
| Cloud DB | Supabase (opcional) | 2.x |
| Export | html2canvas | — |
| CSS | CSS Variables + inline styles | — |

---

## Estrutura de Diretórios

```
src/
├── app/
│   ├── components/
│   │   ├── ConfirmModal.tsx       # Modal de confirmação reutilizável
│   │   └── NewBugModal.tsx        # Modal de criação de bug reutilizável
│   ├── layout/
│   │   ├── AppShell.tsx           # Layout raiz (Sidebar + Topbar + Outlet)
│   │   ├── Sidebar.tsx            # Navegação lateral com ícones
│   │   ├── Topbar.tsx             # Barra superior
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
│       │   └── SprintDashboard.tsx # Dashboard individual com tabs
│       ├── services/
│       │   ├── persistence.ts     # localStorage + API REST + computeFields
│       │   ├── exportService.ts   # Exportação de imagem/PDF
│       │   └── importService.ts   # Parser .feature / .csv
│       ├── store/
│       │   └── sprintStore.ts     # Zustand store central
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
2. computeFields(next)    → recalcula tests, exec, gherkinExecs
3. saveToStorage(id, s)   → grava no localStorage
4. upsertMasterIndex(id)  → atualiza totalTests/totalExec no índice
5. queueRemotePersist()   → debounce 3s para sync com API
6. set({ state, lastSaved: Date.now() })
```

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

### Keys de localStorage
| Key | Conteúdo |
|-----|---------|
| `qaDashboardData_<sprintId>` | `SprintState` completo |
| `qaDashboardMasterIndex` | `SprintIndexEntry[]` |

### Favoritar Sprint
```ts
// persistence.ts
export function toggleFavoriteSprint(sprintId: string): void
// Lê o índice, inverte o campo favorite, salva.
```

### Sincronização Remota
- `GET /api/dashboard/:sprintId` → carrega do servidor
- `PUT /api/dashboard/:sprintId` → salva no servidor
- Debounce 3s. Falha silenciosa.

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
npm run dev:client   # Vite dev server
npm run dev          # Node.js + Express
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
