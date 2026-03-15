# QA Dashboard — Documentação de Engenharia

> **Versão:** 2.0 · **Última atualização:** Março 2026
> **Tipo de sistema:** Single Page Application (SPA) — Vanilla JS, sem frameworks

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Modelo de Dados (State)](#3-modelo-de-dados-state)
4. [Persistência e Sincronização](#4-persistência-e-sincronização)
5. [Roteamento e Navegação](#5-roteamento-e-navegação)
6. [Funcionalidades e Regras de Negócio](#6-funcionalidades-e-regras-de-negócio)
   - 6.1 [Home — Gerenciamento de Sprints](#61-home--gerenciamento-de-sprints)
   - 6.2 [Configurações da Sprint](#62-configurações-da-sprint)
   - 6.3 [KPIs — Visão Executiva](#63-kpis--visão-executiva)
   - 6.4 [QA Health Score](#64-qa-health-score)
   - 6.5 [Burndown Chart](#65-burndown-chart)
   - 6.6 [Gestão de Casos de Teste (Gherkin)](#66-gestão-de-casos-de-teste-gherkin)
   - 6.7 [Ações em Massa (Bulk Update)](#67-ações-em-massa-bulk-update)
   - 6.8 [Evidências Visuais (Mockup)](#68-evidências-visuais-mockup)
   - 6.9 [Acompanhamento Diário por Funcionalidade](#69-acompanhamento-diário-por-funcionalidade)
   - 6.10 [Alertas — Impedimentos e Falhas](#610-alertas--impedimentos-e-falhas)
   - 6.11 [Histórico de Bugs](#611-histórico-de-bugs)
   - 6.12 [MTTR (Mean Time To Resolution)](#612-mttr-mean-time-to-resolution)
   - 6.13 [Bloqueios Operacionais](#613-bloqueios-operacionais)
   - 6.14 [Alinhamentos e Débitos Técnicos](#614-alinhamentos-e-débitos-técnicos)
   - 6.15 [Report Diário](#615-report-diário)
   - 6.16 [Anotações do Projeto](#616-anotações-do-projeto)
   - 6.17 [Importação de Casos de Teste](#617-importação-de-casos-de-teste)
   - 6.18 [Exportação de Dados](#618-exportação-de-dados)
7. [Fluxos de Status e Transições](#7-fluxos-de-status-e-transições)
8. [Mapeamento de Funções Críticas](#8-mapeamento-de-funções-críticas)
9. [Decisões de Arquitetura e Trade-offs](#9-decisões-de-arquitetura-e-trade-offs)

---

## 1. Visão Geral do Sistema

O **QA Dashboard** é uma ferramenta de acompanhamento de qualidade de software para gestão de sprints. Permite que equipes de QA registrem, monitorem e comuniquem o progresso de testes, bugs, bloqueios e métricas de qualidade em tempo real, sem dependência de backend obrigatório.

### Casos de Uso Principais

| Persona | Uso principal |
|---|---|
| QA Engineer | Registrar execução de cenários, bugs e bloqueios diariamente |
| QA Lead | Monitorar progresso, burndown e MTTR por sprint e squad |
| Tech Lead / PO | Visualização executiva: Health Score, status de bloqueios, bugs abertos |
| Gerência | Exportar snapshot da sprint como imagem para relatórios |

### Capacidades Técnicas

- Gerenciamento de múltiplas sprints via tela Home com filtros
- Sem necessidade de login ou autenticação
- Funciona 100% offline (LocalStorage)
- Backup opcional via API Node.js local
- Exportação para PNG (captura de tela) e JSON
- Importação via `.feature` (Gherkin), `.csv` e `.xlsx`

---

## 2. Arquitetura Técnica

### Padrão Arquitetural

O sistema segue o padrão **MVC** (Model-View-Controller) implementado em Vanilla JavaScript puro, sem uso de frameworks (React, Vue, Angular, etc.).

```
┌─────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR                               │
│                                                                 │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────┐   │
│  │  model.js    │   │   view.js    │   │  controller.js   │   │
│  │              │   │              │   │                  │   │
│  │ window.state │◄──│ renderAll()  │   │ event handlers   │   │
│  │ saveState()  │   │ renderCharts │   │ updateFeature()  │   │
│  │ normalizeState│  │ renderTables │   │ addBug()         │   │
│  │ loadFromServer│  │ renderKPIs   │   │ importFeature()  │   │
│  └──────┬───────┘   └──────────────┘   └──────────────────┘   │
│         │                                                       │
│  ┌──────▼───────┐   ┌──────────────┐                          │
│  │ LocalStorage │   │ home_logic.js│                          │
│  │  (primary)   │   │              │                          │
│  └──────┬───────┘   │ renderHome() │                          │
│         │           │ filters/DnD  │                          │
│  ┌──────▼───────┐   └──────────────┘                          │
│  │  Node.js API │   ┌──────────────┐                          │
│  │  (secondary) │   │home_styles.cs│                          │
│  │  PUT/GET     │   └──────────────┘                          │
│  └──────────────┘                                              │
└─────────────────────────────────────────────────────────────────┘
```

### Arquivos e Responsabilidades

| Arquivo | Responsabilidade |
|---|---|
| `public/index.html` | Estrutura HTML, CSS inline global, carregamento de scripts |
| `public/scripts/model.js` | Estado global (`window.state`), normalização, persistência |
| `public/scripts/view.js` | Toda a renderização HTML (KPIs, tabelas, gráficos, acordeões) |
| `public/scripts/controller.js` | Handlers de eventos, lógica de negócio, importação/exportação |
| `public/scripts/home_logic.js` | Tela Home: CRUD de sprints, filtros, drag-and-drop, injeção de HTML |
| `public/scripts/home_styles.css` | Estilos exclusivos da tela Home |

### Dependências Externas (CDN)

| Biblioteca | Versão | Uso |
|---|---|---|
| Chart.js | latest | Gráficos (Burndown, Pizza, Barras, MTTR) |
| chartjs-plugin-datalabels | 2.0.0 | Labels nos gráficos de barras |
| html2canvas | 1.4.1 | Exportação do dashboard como imagem PNG |
| SheetJS (xlsx) | 0.20.3 | Leitura de arquivos `.xlsx` e `.xls` na importação |
| Google Fonts (Inter) | — | Tipografia do sistema |

---

## 3. Modelo de Dados (State)

O estado completo de uma sprint é um objeto JavaScript (`window.state`) com a seguinte estrutura:

```javascript
{
  config: {
    sprintDays: 20,          // Total de dias da sprint (calculado automaticamente se startDate+endDate definidos)
    title: "QA Dashboard",   // Título exibido no header
    startDate: "2025-01-06", // Data ISO início da sprint
    endDate: "2025-01-24",   // Data ISO fim da sprint
    targetVersion: "1.0.0",  // Versão alvo do release
    squad: "Checkout",       // Nome do squad/time
    qaName: "João Silva",    // Nome do QA responsável

    // Pesos do QA Health Score (configuráveis pelo usuário)
    hsCritical: 15,  // Penalidade por bug Crítico aberto
    hsHigh:     10,  // Penalidade por bug Alto aberto
    hsMedium:    5,  // Penalidade por bug Médio aberto
    hsLow:       2,  // Penalidade por bug Baixo aberto
    hsRetest:    2,  // Penalidade por cada reteste
    hsBlocked:  10,  // Penalidade por funcionalidade bloqueada
    hsDelayed:   2   // Penalidade por caso em atraso
  },

  currentDate: "2025-01-10", // Data do report ativo (ISO)

  reports: {
    "2025-01-10": "Texto do report diário..."  // Um report por data
  },

  notes: {
    premises: "",             // Premissas gerais (texto livre)
    actionPlan: "",           // Plano de ação (texto livre)
    operationalPremises: ""   // Premissas operacionais (texto livre)
  },

  alignments: [
    { id: 1234567890, text: "Botão desalinhado, aprovado com débito técnico" }
  ],

  features: [
    {
      id: 1234567890,
      name: "Tela de Login",
      tests: 5,              // COMPUTED: cases.length + manualTests
      manualTests: 2,        // Testes manuais sem cenário Gherkin (carga massiva)
      exec: 3,               // COMPUTED: sum de execution[Dx] para todos os dias
      execution: {           // COMPUTED em saveState(): por dia total executado
        "D1": 2, "D3": 1
      },
      manualExecData: {      // Source of truth para execução manual por dia
        "D1": 1, "D3": 1
      },
      gherkinExecs: {        // COMPUTED em saveState(): execuções Gherkin por dia
        "D1": 1              // conta status Concluído E Falhou
      },
      mockupImage: "",       // Base64 da imagem de referência (PNG/JPG/WebP)
      status: "Ativa",       // "Ativa" | "Bloqueada"
      blockReason: "",       // Motivo do bloqueio (só relevante se status = "Bloqueada")
      activeFilter: "Todos", // Filtro de exibição dos cenários na UI
      cases: [
        {
          id: 1234567891,
          name: "Login com credenciais válidas",
          complexity: "Baixa",    // "Baixa" | "Moderada" | "Alta"
          status: "Concluído",    // "Pendente" | "Concluído" | "Falhou" | "Bloqueado"
          executionDay: "D1",     // Dia da sprint em que foi executado
          gherkin: "Dado que...\nQuando...\nEntão..."
        }
      ]
    }
  ],

  blockers: [
    {
      id: 1234567890,
      date: "2025-01-10",   // Data do bloqueio
      reason: "Ambiente de testes instável",
      hours: 4              // Horas perdidas
    }
  ],

  bugs: [
    {
      id: "BUG-001",
      feature: "Tela de Login",     // Nome da funcionalidade associada
      desc: "Botão não responde",
      stack: "Front",               // "Front" | "BFF" | "Back"
      severity: "Alta",             // "Baixa" | "Média" | "Alta" | "Crítica"
      categoria: "Layout",
      assignee: "Dev João",
      status: "Aberto",             // "Aberto" | "Em Andamento" | "Resolvido"
      retests: 2,                   // Número de retestes realizados
      openedAt: "2025-01-08",       // Data de abertura (ISO)
      resolvedAt: ""                // Data de resolução (ISO, preenchida ao marcar "Resolvido")
    }
  ]
}
```

### Campos Computados vs. Campos Persistidos

| Campo | Tipo | Calculado em |
|---|---|---|
| `feature.tests` | Computado | `saveState()` → `cases.length + manualTests` |
| `feature.exec` | Computado | `saveState()` → soma de todos os dias de `execution` |
| `feature.execution` | Computado | `saveState()` → `manualExecData[Dx] + gherkinExecs[Dx]` |
| `feature.gherkinExecs` | Computado | `saveState()` → casos com status `Concluído` ou `Falhou` e `executionDay` preenchido |
| `config.sprintDays` | Auto-calculado | `updateConfig()` e `saveState()` → `(endDate - startDate) + 1` |
| `feature.manualExecData` | Persistido | Editado pelo usuário na tabela diária |
| `case.executionDay` | Persistido | Selecionado pelo usuário no date picker do card |

---

## 4. Persistência e Sincronização

### Camada Primária — LocalStorage

Cada sprint é armazenada em uma chave isolada:

```
localStorage["qaDashboardData_{sprintId}"]  →  JSON.stringify(state)
localStorage["qaDashboardMasterIndex"]       →  JSON.stringify([{ id, title, squad, startDate, endDate, totalTests, totalExec, updatedAt }])
```

O **Master Index** é o índice leve usado pela Home Screen. Contém apenas os metadados de cada sprint (não o estado completo), permitindo listar e filtrar sprints sem desserializar todos os dados.

### Camada Secundária — Node.js API (opcional)

Quando um servidor Node.js local está rodando, o sistema sincroniza via HTTP:

```
GET  /api/dashboard/{sprintId}  →  carrega estado do servidor
PUT  /api/dashboard/{sprintId}  →  salva estado no servidor
      body: { payload: state }
```

**Estratégia de fallback:**
1. Tenta carregar do servidor (`loadStateFromServer`)
2. Se o servidor falhar ou retornar 404, carrega do LocalStorage
3. Ao salvar (`saveState`), sempre salva no LocalStorage e agenda sincronização remota via debounce de 700ms

### Debounce de Persistência Remota

```
Evento do usuário
       ↓
  saveState()
       ↓
  localStorage.setItem(...)   ← imediato
       ↓
  queueRemotePersist(700ms)   ← debounce
       ↓ (após 700ms sem nova alteração)
  persistStateToServer()      ← HTTP PUT
```

Se uma requisição já estiver em andamento (`remotePersistInFlight = true`), a nova é enfileirada (`remotePersistQueued = true`) e disparada após a conclusão da atual.

### Ciclo de Vida do Estado na Inicialização

```
hashchange → #sprint={id}
       ↓
  window.currentSprintId = id
       ↓
  initSprint()
       ↓
  loadStateFromServer()   [tenta API]
       ↓ (falha ou nulo)
  localStorage.getItem(storageKey)
       ↓
  normalizeState(rawState)   [preenche campos faltantes com defaults]
       ↓
  state = resultado normalizado
       ↓
  renderAll()
```

---

## 5. Roteamento e Navegação

O sistema usa **hash routing** (sem servidor necessário):

| Hash | Tela exibida |
|---|---|
| `#home` ou vazio | Tela Home (lista de sprints) |
| `#sprint={sprintId}` | Dashboard de sprint específica |

```javascript
window.addEventListener('hashchange', handleHashChange);

// Ao navegar para uma sprint:
homeWrapper.style.display = 'none';
exportWrapper.style.display = 'block';
window.currentSprintId = sprintId;
initSprint();

// Ao voltar para home:
exportWrapper.style.display = 'none';
homeWrapper.style.display = 'block';
renderHomeScreen();
```

**Nota:** O estado da tela Home (`home-wrapper`) é injetado dinamicamente no DOM apenas uma vez via `injectHomeAndModalViews()` e permanece oculto quando não está ativo. O `window.currentSprintId` é zerado ao voltar para a Home, impedindo que saves acidentais afetem sprints ativas.

---

## 6. Funcionalidades e Regras de Negócio

---

### 6.1 Home — Gerenciamento de Sprints

**Localização:** `public/scripts/home_logic.js` + `home_styles.css`

A tela Home é o ponto de entrada da aplicação. Exibe um grid de cards com todas as sprints cadastradas.

#### Criação de Sprint

Ao criar uma nova sprint, o sistema:
1. Gera um ID único: `sprint_${Date.now()}`
2. Clona o `DEFAULT_STATE` com título e squad do formulário
3. Salva o estado no LocalStorage com chave `qaDashboardData_{id}`
4. Registra no Master Index via `upsertSprintInMasterIndex()`
5. Navega automaticamente para `#sprint={id}`

#### Exclusão de Sprint

A exclusão remove:
- O registro do Master Index (`qaDashboardMasterIndex`)
- Os dados completos da sprint (`qaDashboardData_{id}`)

Não há lixeira — a operação é irreversível e protegida por modal de confirmação.

#### Filtros da Home

Os filtros operam em memória de sessão (variável `_homeFilters`) e não são persistidos:

| Filtro | Origem dos dados | Regra |
|---|---|---|
| **Squad** | `sprint.squad` de cada entrada no Master Index | Igualdade exata (case-sensitive) |
| **Status** | Calculado em tempo real: `totalExec >= totalTests AND totalTests > 0` → "Concluída", caso contrário "Em Andamento" | Enum: `active`, `completed` |
| **Ano** | Extrai o ano de `sprint.startDate` (fallback: `sprint.endDate`). Sprints sem data aparecem apenas no filtro "Todos" | Igualdade de string no ano |

A função `_renderFilteredCards()` é chamada separadamente da inicialização da barra de filtros (`renderHomeScreen()`), permitindo que mudanças de filtro atualizem apenas os cards sem re-renderizar os selects.

#### Drag & Drop — Reordenação Manual

Implementado via HTML5 Drag and Drop API com event delegation no container `#sprint-list`. O flag `container._dndBound = true` previne registros duplicados de listeners entre re-renders. A nova ordem é persistida imediatamente no Master Index ao soltar o card.

#### Barra de Progresso no Card

```
pct = round((totalExec / totalTests) * 100)
```
- Cor azul (`#3b82f6`) → Em Andamento
- Cor verde (`#10b981`) → Concluída
- Se `totalTests === 0`, mostra 0%

---

### 6.2 Configurações da Sprint

**Tab:** ⚙️ Configurações
**Arquivos:** `controller.js (updateConfig)`, `view.js (renderHeaderAndConfig)`

| Campo | Tipo | Regra de negócio |
|---|---|---|
| **Título** | Texto | Exibido no header e na Home |
| **Squad** | Texto | Exibido no subtítulo e nos filtros da Home |
| **QA Responsável** | Texto | Exibido no subtítulo |
| **Data de Início** | Date | Usado para calcular `sprintDays` e mapear `DayKey ↔ Data` |
| **Data de Fim** | Date | Usado para calcular `sprintDays` e como limite máximo no date picker |
| **Dias da Sprint** | Número | Auto-calculado quando `startDate` e `endDate` definidos: `(endDate - startDate + 1)`. Editável manualmente quando datas não definidas. |
| **Versão Alvo** | Texto | Informativo, exibido no subtítulo |

#### Auto-cálculo de `sprintDays`

Quando o usuário altera `startDate` ou `endDate`:
```javascript
diff = round((endDate - startDate) / 86400000) + 1
if (diff > 0) sprintDays = diff
```
O campo `cfg-days` na UI é atualizado imediatamente sem necessidade de salvar. O mesmo cálculo é replicado em `saveState()` para garantir consistência na persistência.

#### Pesos do QA Health Score

Permite ao time configurar a penalidade de cada tipo de evento. Valores padrão:

| Evento | Peso padrão | Descrição |
|---|---|---|
| Bug Crítico aberto | 15 | Penalidade máxima — risco de bloqueio de release |
| Bug Alto aberto | 10 | Impacta fluxo principal |
| Bug Médio aberto | 5 | Impacta funcionalidade sem bloquear |
| Bug Baixo aberto | 2 | Estético ou pouco impactante |
| Por reteste | 2 | Cada ciclo de retest adicional |
| Por funcionalidade bloqueada | 10 | Feature sem condição de ser testada |
| Por caso em atraso | 2 | Por cenário que está atrasado em relação ao ideal diário |

---

### 6.3 KPIs — Visão Executiva

**Tab:** Visão Executiva
**Arquivo:** `view.js (updateCalculations)`

O dashboard exibe 7 KPIs principais em cards no topo:

#### KPI 1 — QA Health Score
Veja seção [6.4](#64-qa-health-score) para a fórmula detalhada.

#### KPI 2 — Status da Sprint

```
lastDayWithActivity = maior número de dia Dx com execução registrada
idealAteHoje        = (totalTests / sprintDays) * lastDayWithActivity
atrasoCasos         = round(idealAteHoje - totalExec)

Se atrasoCasos == 0         → "No Ritmo"     (verde)
Se 1 <= atrasoCasos <= 5    → "Atenção"      (amarelo)
Se atrasoCasos > 5          → "Em Atraso"    (vermelho)
```

#### KPI 3 — Total de Testes

```
totalTests = Σ feature.tests
           = Σ (feature.cases.length + feature.manualTests)
```

#### KPI 4 — Executados

```
totalExec = Σ feature.exec
          = Σ (soma dos execution[Dx] de cada feature)
```

#### KPI 5 — Meta Diária

```
meta = ceil(totalTests / sprintDays)
```

#### KPI 6 — Casos em Atraso

```
atrasoCasos = max(0, round(idealAteHoje - totalExec))
```

Onde `idealAteHoje` usa o **último dia com atividade registrada** como referência (não a data atual do calendário), evitando falso-positivo no fim de semana ou feriado.

#### KPI 7 — Bugs Abertos

```
openBugs = count(bugs where status == "Aberto" OR status == "Em Andamento")
```

---

### 6.4 QA Health Score

**Arquivo:** `view.js (updateCalculations)`

O QA Health Score é um índice de 0 a 100 que reflete a saúde geral da sprint, descontando penalidades configuráveis para cada tipo de evento negativo.

#### Fórmula

```
healthScore = 100
            - Σ (bugs abertos por severidade × peso_severidade)
            - Σ (retestes × peso_retest)
            - (qtd_funcionalidades_bloqueadas × peso_bloqueada)
            - (atrasoCasos × peso_atraso)

healthScore = max(0, min(100, healthScore))
```

#### Interpretação

| Faixa | Cor | Interpretação |
|---|---|---|
| 90 – 100 | Verde | Sprint saudável, entrega em risco baixo |
| 70 – 89 | Amarelo | Atenção — bugs ou atrasos impactando |
| 0 – 69 | Vermelho | Entrega em risco — ação imediata necessária |

#### Exemplo Prático

Sprint com:
- 1 bug Crítico aberto (peso 15) → -15
- 2 bugs Médios abertos (peso 5 cada) → -10
- 3 retestes (peso 2 cada) → -6
- 1 funcionalidade Bloqueada (peso 10) → -10
- 8 casos em atraso (peso 2 cada) → -16

```
healthScore = 100 - 15 - 10 - 6 - 10 - 16 = 43%  (vermelho)
```

---

### 6.5 Burndown Chart

**Arquivo:** `view.js (renderCharts)`

O Burndown Chart visualiza o progresso ideal vs. real de execução de testes ao longo da sprint.

#### Construção das Séries

**Linha Ideal:** distribui `totalTests` uniformemente pelos dias da sprint.

```
meta = totalTests / sprintDays  (testes por dia, fracionado)

labels  = ["Início", "D1", "D2", ..., "D{sprintDays}"]   ← sprintDays+1 pontos
ideal[0] = totalTests
ideal[i] = max(0, totalTests - (meta × i))   para i = 1..sprintDays
```

**Linha Real:** acumula execuções a partir do estado zero.

```
real[0] = totalTests  (ponto "Início" — nenhum teste executado ainda)
real[i] = real[i-1] - execution[D{i}]   (subtrai os executados naquele dia)
real[i] = max(0, real[i])
```

#### Rótulo do Eixo X

Quando `startDate` está configurado, os labels mostram tanto o `D{i}` quanto a data de calendário:
```
"D1\n06/01"
"D2\n07/01"
...
```

Quando não há `startDate`, exibe apenas `D1`, `D2`, etc.

#### Regra de Alinhamento (Off-by-one corrigido)

A linha ideal começa em `totalTests` no ponto "Início" (antes do D1). A linha real também começa em `totalTests` no mesmo ponto. Isso garante que, no primeiro dia da sprint (D1), ambas as linhas partem do mesmo patamar, evitando cruzamento visual espúrio.

---

### 6.6 Gestão de Casos de Teste (Gherkin)

**Tab:** Gestão de Casos de Teste
**Arquivos:** `view.js (renderTestCasesAccordion)`, `controller.js`

Cada funcionalidade é representada como um accordion expansível. Dentro dele, cada cenário Gherkin é um card individual.

#### Contagem de Testes por Funcionalidade

```
feature.tests = feature.cases.length + feature.manualTests
```

- `cases.length` = cenários Gherkin cadastrados individualmente
- `manualTests` = quantidade de testes manuais sem cenário detalhado ("carga massiva")

#### Status dos Cenários

| Status | Significado | Contabilizado em `gherkinExecs`? |
|---|---|---|
| `Pendente` | Não iniciado | Não |
| `Concluído` | Passou com sucesso | **Sim** |
| `Falhou` | Executado mas falhou | **Sim** |
| `Bloqueado` | Impedido de ser executado | Não |

> **Regra crítica:** Tanto `Concluído` quanto `Falhou` contribuem para o burndown e para o KPI "Executados". Um teste executado que falhou ainda é contabilizado como executado (não é regredido para Pendente).

#### Restrição de Dia de Execução

Ao alterar o status para qualquer valor diferente de `Pendente`, o campo "Data de Execução" torna-se **obrigatório**:

1. O status fica "pendente" em memória (`pendingTestCaseStatus`)
2. O campo de data fica destacado em vermelho
3. O status só é confirmado ao salvar quando a data for selecionada
4. A data inserida é convertida para `DayKey` (ex: `D3`) via `dateToDayKey()`

#### Validação de Dia de Execução

```javascript
dayKey = dateToDayKey(dateStr)
// onde:
diff    = round((dateStr - startDate) / 86400000)
dayNum  = diff + 1
// Válido se 1 <= dayNum <= sprintDays
```

Se a data estiver fora do range da sprint, o sistema exibe um aviso e não confirma o status.

#### Filtro por Status no Accordion

Cada funcionalidade tem um filtro independente (Todos / Pendentes / Concluídos / Falharam / Bloqueados). O filtro é persistido em `feature.activeFilter` e não afeta os cálculos — apenas oculta cards na UI via CSS (`display: none`).

#### Complexidade dos Cenários

Informativa — não afeta cálculos. Opções: Baixa, Moderada, Alta.

---

### 6.7 Ações em Massa (Bulk Update)

**Arquivo:** `controller.js (bulkApplyStatus, _renderBulkBar)`

Permite selecionar múltiplos cenários de uma funcionalidade e aplicar o mesmo status e data de execução para todos simultaneamente.

#### Fluxo

1. Usuário seleciona cenários via checkbox individual ou "Selecionar Todos"
2. A barra de ações (`bulk-bar-{fIndex}`) aparece mostrando quantos estão selecionados
3. Usuário escolhe o status desejado e opcionalmente a data
4. Ao clicar em "Aplicar em Massa":
   - Para cada cenário selecionado: `tc.status = newStatus`
   - Se data fornecida: `tc.executionDay = dateToDayKey(bulkDate)`
   - Se não fornecida e `tc.executionDay` está vazio: usa `dateToDayKey(currentDate)` como fallback
   - Se `newStatus === "Falhou"`: abre modal de registro de bug ao final

#### Estado de Seleção

A seleção é mantida em `window._selectedCases` como dicionário `{ "fIndex:tcIndex": true }`. Isso evita re-render completo ao marcar checkboxes — apenas `_renderBulkBar()` é chamado, que atualiza o DOM diretamente nos elementos existentes.

```javascript
_renderBulkBar(fIndex):
  - Atualiza checkbox "selecionar todos" (checked / indeterminate / desmarcado)
  - Mostra/oculta .bulk-actions
  - Atualiza .bulk-count
  - Aplica/remove outline azul em cada tc-card
```

`saveState()` (e consequente `renderAll()`) só é chamado ao confirmar a aplicação.

---

### 6.8 Evidências Visuais (Mockup)

**Arquivo:** `controller.js (uploadMockupImage, removeMockupImage)`, `view.js`

Cada funcionalidade suporta uma imagem de referência visual (mockup, wireframe, screenshot) que fica visível durante a validação de cada cenário Gherkin.

#### Regras de Upload

- Formatos aceitos: `image/*` (PNG, JPG, GIF, WebP)
- Tamanho máximo: **5MB**
- Armazenamento: Base64 no campo `feature.mockupImage`
- Limite prático de LocalStorage: ≈ 5MB total por domínio. Imagens grandes podem atingir este limite se houver muitas sprints.

#### Exibição

- **No header do accordion:** thumbnail de 60px de altura com botões "Remover" e "Substituir"
- **Em cada card de cenário:** a imagem aparece ao lado direito do textarea Gherkin (35% da largura). O textarea ocupa os 65% restantes.
- **Clique na imagem:** abre em tela cheia numa nova aba via `window.open()` com base64 dataURL

#### Persistência

A imagem é salva dentro do estado da sprint (`state.features[i].mockupImage`), portanto é exportada junto com o JSON de backup e incluída na importação de JSON.

---

### 6.9 Acompanhamento Diário por Funcionalidade

**Tab:** Área Operacional
**Arquivo:** `view.js (renderTables)`, `controller.js (updateFeatureExecution)`

Uma tabela com features nas linhas e dias da sprint nas colunas. Cada célula representa o total de testes executados naquela funcionalidade naquele dia.

#### Cabeçalho das Colunas

Quando `startDate` está configurado:
```
D1        D2        D3
06/01     07/01     08/01
```
Quando não configurado: apenas `D1`, `D2`, etc.

#### Cálculo do Valor de Cada Célula

O usuário edita o **total** na célula. Internamente:

```
totalDigitado = manualVal + gherkinCount  (Gherkin já executados naquele dia)
manualVal     = totalDigitado - gherkinCount
```

Se `totalDigitado < gherkinCount`: alerta e ajusta para `gherkinCount` (não é possível informar menos do que os Gherkin já executados).

Se o total ultrapassaria `feature.tests` (limite máximo da feature):
```
manualVal = feature.tests - sumOther - gherkinCount
```
onde `sumOther` = soma de todos os outros dias (usando `manualExecData` + `gherkinExecs` — nunca o `execution` stale).

#### Source of Truth

- `manualExecData[Dx]`: execuções manuais por dia (editado pelo usuário)
- `gherkinExecs[Dx]`: execuções Gherkin por dia (computado de `cases` em `saveState`)
- `execution[Dx]`: total por dia — **computed**, nunca editado diretamente

---

### 6.10 Alertas — Impedimentos e Falhas

**Tab:** Visão Executiva (seção inferior)
**Arquivo:** `view.js (renderAlertsList)`

A seção de Alertas exibe em tempo real dois tipos de problema, separados visualmente:

#### Bloco 1 — Itens Bloqueados

Lista todas as features com `status === "Bloqueada"`, exibindo o nome da feature e o motivo do impedimento (`blockReason`).

#### Bloco 2 — Cenários com Falha

Lista todos os cenários de teste com `status === "Falhou"`, exibindo o nome do cenário e a funcionalidade à qual pertencem.

**Regra:** Se ambos os blocos têm itens, um separador tracejado é inserido entre eles. Se nenhum bloco tem itens, exibe mensagem positiva de "tudo limpo".

---

### 6.11 Histórico de Bugs

**Tab:** Área Operacional
**Arquivos:** `view.js (renderTables)`, `controller.js (openBugModal, saveBugFromModal)`

#### Ciclo de Vida de um Bug

```
Aberto → Em Andamento → Resolvido
```

Ao transitar para **Resolvido**, um modal solicita a data de resolução (`resolvedAt`). Esta data é essencial para o cálculo de MTTR. Se o usuário cancelar, o status retorna ao anterior.

#### Registro de Bug

O modal de registro/edição suporta dois modos:
- **Criação** (`_editingBugIndex === null`): novo bug inserido no início da lista, com `openedAt = state.currentDate`
- **Edição** (`_editingBugIndex !== null`): atualiza campos editáveis, preservando `status`, `retests`, `openedAt`, `resolvedAt`

#### Filtros da Tabela de Bugs

Três filtros independentes por botões pill:

| Filtro | Opções |
|---|---|
| Status | Todos / Aberto / Em Andamento / Resolvido |
| Stack | Todos / Front / BFF / Back |
| Atribuição | Todos / Não Atribuído / {nomes únicos dos bugs} |

Os filtros são mantidos em `window._bugFilters` e persistem durante a sessão. O badge "N de M bugs" é atualizado dinamicamente.

#### Retestes

`bug.retests` é incrementado manualmente pelo usuário. Cada reteste penaliza o Health Score em `config.hsRetest` pontos.

---

### 6.12 MTTR (Mean Time To Resolution)

**Tab:** Área Operacional
**Arquivos:** `controller.js (calcMTTR, renderMTTRKPI, renderMTTRChart)`, `view.js`

O **MTTR (Mean Time to Resolution)** é a métrica que indica, em média, quanto tempo a equipe leva para corrigir uma falha — desde o momento em que o bug é reportado (`openedAt`) até ser validado e marcado como `Resolvido` (`resolvedAt`).

#### Fórmula de Cálculo

```
MTTR_bug  = (resolvedAt - openedAt) em dias (arredondado)
MTTR_grupo = Σ MTTR_bug / count(bugs_resolvidos_no_grupo)
```

Apenas bugs com `status === "Resolvido"` E com ambas as datas (`openedAt` e `resolvedAt`) preenchidas entram no cálculo.

#### Implementação

```javascript
calcMTTR(bug):
  open     = new Date(bug.openedAt + 'T00:00:00')
  resolved = new Date(bug.resolvedAt + 'T00:00:00')
  diffMs   = resolved - open
  return   max(0, round(diffMs / 86400000))   // em dias
```

#### KPI Global de MTTR

```
MTTR_global = Σ calcMTTR(bug) / count(bugs_resolvidos_com_datas)
```
Exibido no card "MTTR Médio" com precisão de 1 casa decimal (ex: `3.5d`).

#### Gráfico MTTR por Stack × Criticidade

O gráfico de barras agrupa os bugs por combinação de **Stack** (Front, BFF, Back) × **Severidade** (Baixa, Média, Alta, Crítica) e calcula o MTTR médio de cada grupo.

```
Para cada (stack, severidade):
  grupo = bugs onde stack == stack AND severity == severidade AND status == "Resolvido"
  MTTR_grupo = Σ calcMTTR(b) / grupo.length
```

**Por que cruzar Stack e Criticidade?**

| Análise | Diagnóstico |
|---|---|
| MTTR Front < MTTR Back | Arquitetura de backend complexa, débito técnico ou falta de automação |
| MTTR bugs Críticos alto | Risco de bloqueio de release — processo de hotfix ineficiente |
| MTTR bugs Baixos alto | Backlog despriorizado, processo de gestão de bugs falho |

**Interpretação prática:**

- Se o MTTR de bugs Críticos no Back-end ultrapassa 24h, há sinal de alerta vermelho
- MTTR crescente de sprint para sprint → processo de correção degradando
- MTTR estável com muitos bugs → alta volumetria, processo eficiente mas demanda alta
- MTTR zero → bug resolvido no mesmo dia (possível falso positivo ou bug trivial)

**Nota técnica:** O `openedAt` é definido como `state.currentDate` no momento de criação do bug (com fallback para `new Date().toISOString().split('T')[0]` se `currentDate` estiver indefinido). Isso garante que o MTTR sempre tenha uma data base válida.

---

### 6.13 Bloqueios Operacionais

**Tab:** Área Operacional

Registra impedimentos técnicos ou organizacionais que impactaram o andamento da sprint.

#### Campos

| Campo | Tipo | Descrição |
|---|---|---|
| Data | Date | Dia do impedimento |
| Motivo | Texto | Descrição do bloqueio |
| Horas Perdidas | Número | Horas consumidas pelo bloqueio |

#### KPI de Horas Bloqueadas

```
totalHoras = Σ blocker.hours
```
Exibido no KPI "Horas Bloqueadas" na Visão Executiva.

---

### 6.14 Alinhamentos e Débitos Técnicos

**Tab:** Área Operacional

Lista de itens acordados entre QA, Dev e PO para aceitar divergências ou débitos técnicos sem abrir bug formal.

Exemplos típicos:
- "Comportamento X aprovado como won't fix nesta sprint"
- "Desalinhamento de layout no mobile — débito para próximo ciclo"
- "Fluxo Y não testado por falta de massa de dados — retestado na próxima sprint"

Os alinhamentos são exibidos na Visão Executiva para comunicação com stakeholders.

---

### 6.15 Report Diário

**Tab:** Área Operacional

Um campo de texto livre por data, usado para comunicar o status do dia em standup ou relatório.

```
state.reports = {
  "2025-01-10": "Texto do report...",
  "2025-01-11": "Texto do report seguinte..."
}
```

O report ativo é o da `state.currentDate`. Trocar a data no seletor de data do header ativa o report daquele dia.

Na Visão Executiva, o report do dia atual é exibido em modo leitura dentro de um card azul.

---

### 6.16 Anotações do Projeto

**Tab:** Anotações do Projeto

Três campos de texto livre separados por propósito:

| Campo | Uso recomendado |
|---|---|
| **Premissas Operacionais** | Condições e acordos que governam a execução dos testes (ex: "Ambiente de staging obrigatório", "Dados reais não devem ser usados") |
| **Observações e Prazos** | Datas críticas, marcos, observações de contexto |
| **Plano de Ação** | Lista de ações corretivas para bugs ou atrasos |

As premissas operacionais e o plano de ação são exibidos na Visão Executiva para visibilidade executiva.

---

### 6.17 Importação de Casos de Teste

**Arquivo:** `controller.js (_importFromFeatureText, _importFromCSV, _importFromXLSX)`

O sistema suporta três formatos de importação a partir de um único botão.

#### Formato `.feature` (Gherkin)

Suporta **múltiplos blocos `Feature:`** em um único arquivo:

```gherkin
Funcionalidade: Tela de Login

Cenario: Login com sucesso
Dado que o usuario esta na pagina de login
...

Funcionalidade: Recuperação de Senha

Cenario: Solicitar redefinição
Dado que o usuario clica em "Esqueci minha senha"
...
```

**Regras de parsing:**
- Keywords aceitas: `Feature:`, `Funcionalidade:`, `Scenario:`, `Cenario:`, `Cenário:`, `Scenario Outline:`, `Esquema do Cenario:`
- Cada `Feature:` encontrado cria (ou atualiza por nome) uma funcionalidade
- Cenários encontrados antes de qualquer `Feature:` são agrupados em "Nova Funcionalidade Importada"
- Funcionalidades existentes (mesmo nome, case-insensitive) recebem os novos cenários em vez de criar duplicata

#### Formato `.csv`

Colunas detectadas automaticamente por nome (case-insensitive, busca parcial):

| Coluna esperada | Detectada por |
|---|---|
| Funcionalidade | `funcionalidade`, `feature` |
| Cenário | `cenário`, `cenario`, `scenario`, `caso`, `título`, `titulo`, `name` |
| Gherkin | `gherkin`, `passos`, `steps`, `descri` |
| Complexidade | `complexidade`, `complexity` |

**Parser CSV robusto:** suporta campos com quebra de linha dentro de aspas (necessário para Gherkin multilinha em uma célula).

#### Formato `.xlsx` / `.xls`

Usa SheetJS para converter a primeira planilha em array de objetos. A detecção de colunas segue os mesmos critérios do CSV. Suporta células com quebra de linha interna (Gherkin).

#### Comportamento Comum (todos os formatos)

- Funcionalidade existente (mesmo nome) → cenários são **adicionados** (não substituídos)
- Funcionalidade nova → criada com estado padrão (`Ativa`, sem bloqueio)
- Cenários importados: complexidade `Baixa`, status `Pendente`, executionDay vazio
- Complexidade: normalizada por igualdade case-insensitive (Baixa/Moderada/Alta); padrão `Baixa` se não reconhecida

---

### 6.18 Exportação de Dados

| Ação | Formato | Conteúdo |
|---|---|---|
| Exportar JSON (sprint) | `.json` | `state` completo da sprint atual |
| Exportar Imagem | `.png` | Captura da aba "Visão Executiva" em 2x de escala |
| Backup Geral (home) | `.json` | Bundle com metadados + estado completo de **todas** as sprints |

#### Exportação de Imagem

Usa `html2canvas` com as seguintes preparações:
1. Navega para a aba "Visão Executiva" se não estiver ativa
2. Desliga animações CSS e animações do Chart.js
3. Oculta botões de ação e navegação de abas
4. Aguarda 800ms para que os gráficos terminem de renderizar
5. Captura `#export-wrapper` com `scale: 2` (alta resolução)
6. Restaura o estado da UI após a captura

---

## 7. Fluxos de Status e Transições

### Cenário de Teste

```
Pendente ──────────────────────────────────────────────►
    │                                                    │
    │  (usuário define status + data de execução)        │
    ▼                                                    │
Concluído ◄──────── (data de exec. obrigatória) ────────┤
    │                                                    │
Falhou ◄──────────── (data de exec. obrigatória) ────────┤
    │  └─► abre modal de registro de bug automaticamente │
    │                                                    │
Bloqueado ◄──────── (sem data obrigatória) ─────────────┘
```

### Bug

```
Aberto
  │
  ▼
Em Andamento
  │
  ▼ (modal solicita data de resolução)
Resolvido ──► resolvedAt preenchido ──► MTTR calculável
```

**Reversão de status:** Ao mover um bug de `Resolvido` para qualquer outro status, o campo `resolvedAt` é automaticamente limpo, removendo o bug dos cálculos de MTTR.

### Funcionalidade

```
Ativa
  │  (usuário muda status)
  ▼
Bloqueada ──► motivo (blockReason) torna-se editável
              feature aparece no painel de Alertas
              penalidade no Health Score ativada
  │  (usuário muda status de volta)
  ▼
Ativa ──► blockReason é automaticamente limpo
```

---

## 8. Mapeamento de Funções Críticas

| Função | Arquivo | Descrição |
|---|---|---|
| `saveState()` | model.js | Recalcula campos computados, salva no localStorage, agenda sync remoto, chama `renderAll()` |
| `normalizeState(raw)` | model.js | Garante que todos os campos existem com valores padrão. Chamada ao carregar qualquer estado |
| `renderAll()` | view.js | Orquestra todas as funções de renderização |
| `updateCalculations()` | view.js | Calcula KPIs, Health Score, status da sprint |
| `renderCharts()` | view.js | Desenha todos os gráficos Chart.js. Só executa se tab-1 está visível |
| `renderTestCasesAccordion()` | view.js | Gera todo o HTML do accordion de features+cenários |
| `renderTables()` | view.js | Renderiza tabela diária, tabela de bugs (com filtros) |
| `renderBugFilters()` | view.js | Renderiza barra de filtros de bugs com contagem dinâmica |
| `updateConfig(field, value)` | controller.js | Atualiza config, auto-calcula sprintDays, chama saveState |
| `handleTestCaseStatusChange()` | controller.js | Gerencia transição de status com validação de executionDay |
| `handleExecutionDayChange()` | controller.js | Converte data de calendário para DayKey, confirma status pendente |
| `dateToDayKey(dateStr)` | controller.js | Converte `"2025-01-08"` → `"D3"` usando startDate como base |
| `dayKeyToDate(dayKey)` | controller.js | Converte `"D3"` → `"2025-01-08"` usando startDate como base |
| `calcMTTR(bug)` | controller.js | Calcula MTTR individual em dias |
| `bulkApplyStatus(fIndex)` | controller.js | Aplica status em massa nos cenários selecionados |
| `_renderBulkBar(fIndex)` | controller.js | Atualiza UI da barra de seleção múltipla sem re-render |
| `uploadMockupImage(fIndex, el)` | controller.js | Valida e converte imagem para base64, salva no state |
| `importFeature(event)` | controller.js | Dispatcher: detecta formato e chama parser correto |
| `_importFromFeatureText(text)` | controller.js | Parser de .feature com suporte a múltiplas features |
| `_importFromCSV(text)` | controller.js | Parser CSV robusto com suporte a multiline |
| `_importFromXLSX(buffer)` | controller.js | Parser XLSX via SheetJS |
| `renderHomeScreen()` | home_logic.js | Renderiza filtros + cards de sprint na tela Home |
| `_renderFilteredCards()` | home_logic.js | Re-renderiza apenas os cards com filtros aplicados |
| `upsertSprintInMasterIndex()` | home_logic.js | Atualiza metadados da sprint no índice mestre |
| `initSprintDragDrop()` | home_logic.js | Registra event listeners de DnD (uma vez por sessão) |
| `initFeatureDragDrop()` | view.js | Registra DnD das features no accordion (uma vez por render) |

---

## 9. Decisões de Arquitetura e Trade-offs

### Vanilla JS sem Framework

**Decisão:** Nenhum framework (React, Vue, etc.)
**Razão:** Zero dependência de build tools, funciona abrindo o arquivo HTML diretamente ou via qualquer servidor web estático. Tempo de setup zerado para o usuário final.
**Trade-off:** Renderização via `innerHTML` em bloco — não há virtual DOM, então `renderAll()` re-renderiza tudo. Mitigado com a função `isUserTypingIn()` que aborta renders em seções onde o usuário está digitando.

### LocalStorage como Primary Store

**Decisão:** LocalStorage como persistência principal, API Node.js como opcional.
**Razão:** Funciona 100% offline, sem configuração de banco de dados. Ideal para uso individual ou em rede interna simples.
**Trade-off:** Limite de ≈5MB total por domínio. Imagens de mockup em base64 consomem esse espaço. Para uso intensivo com muitas imagens, recomenda-se o backend Node.js.

### Imagem como Base64 no State

**Decisão:** Armazenar `mockupImage` como base64 string diretamente no state.
**Razão:** Elimina a necessidade de um servidor de arquivos. A imagem viaja junto com o backup JSON e é restaurada automaticamente.
**Trade-off:** Aumenta significativamente o tamanho do state. Imagens de 1MB em base64 ocupam ≈1.33MB no localStorage. Limite de 5MB por origem pode ser atingido com poucas imagens grandes.

### DayKey em vez de Data ISO para Execução

**Decisão:** Armazenar `executionDay` como `"D3"` em vez de `"2025-01-08"`.
**Razão:** Permite que o dashboard funcione sem datas configuradas — o usuário pode usar apenas "Dia 1, Dia 2..." sem amarrar a um calendário.
**Trade-off:** Requer funções de conversão (`dateToDayKey`, `dayKeyToDate`) e pode causar inconsistências se `startDate` for alterado após registros de execução.

### Debounce de 700ms na Sincronização Remota

**Decisão:** Aguardar 700ms de inatividade antes de fazer o PUT na API.
**Razão:** Evitar uma requisição HTTP por cada tecla digitada. O localStorage já foi salvo imediatamente.
**Trade-off:** Em caso de fechamento abrupto do navegador dentro dos 700ms, a API pode ficar desatualizada por até uma edição. O localStorage estará sempre atualizado.

### `_dndBound` Flag para Event Delegation

**Decisão:** Flag na referência do elemento DOM para prevenir duplo registro de listeners.
**Razão:** `renderAll()` é chamado frequentemente. Sem o flag, cada render registraria novos listeners acumulando memória e comportamento duplicado.
**Trade-off:** Se o elemento for removido e reinserido no DOM (ex: `innerHTML = ''` no pai), o elemento perde o flag mas os listeners também são removidos junto com o elemento antigo — portanto o comportamento é correto.

---

*Documentação gerada com base na análise completa do código-fonte em Março de 2026.*
