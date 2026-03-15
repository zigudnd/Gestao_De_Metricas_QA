# Documentação Técnica — QA Dashboard
**Versão:** 2.1 | **Atualizado em:** 2026-03-15

---

## Sumário

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Arquitetura e Estrutura de Arquivos](#2-arquitetura-e-estrutura-de-arquivos)
3. [Camada de Persistência](#3-camada-de-persistência)
4. [Roteamento e Navegação](#4-roteamento-e-navegação)
5. [Funcionalidade: Home — Gestão de Sprints](#5-funcionalidade-home--gestão-de-sprints)
6. [Funcionalidade: Dashboard de Sprint](#6-funcionalidade-dashboard-de-sprint)
7. [Funcionalidade: Gestão de Cenários (Gherkin)](#7-funcionalidade-gestão-de-cenários-gherkin)
8. [Funcionalidade: Rastreamento de Bugs](#8-funcionalidade-rastreamento-de-bugs)
9. [Funcionalidade: MTTR — Mean Time to Resolution](#9-funcionalidade-mttr--mean-time-to-resolution)
10. [Funcionalidade: Burndown Chart](#10-funcionalidade-burndown-chart)
11. [Funcionalidade: QA Health Score](#11-funcionalidade-qa-health-score)
12. [Funcionalidade: Relatórios e Notas](#12-funcionalidade-relatórios-e-notas)
13. [Funcionalidade: Importação de Cenários](#13-funcionalidade-importação-de-cenários)
14. [Funcionalidade: Evidências Visuais (Mockups)](#14-funcionalidade-evidências-visuais-mockups)
15. [Funcionalidade: Exportação de Dados](#15-funcionalidade-exportação-de-dados)
16. [Funcionalidade: PDF de Conclusão de Sprint](#16-funcionalidade-pdf-de-conclusão-de-sprint)
17. [API do Servidor Node.js](#17-api-do-servidor-nodejs)
18. [API do Servidor MongoDB (server_mongo.js)](#18-api-do-servidor-mongodb-server_mongojs)
19. [Guia de Manutenção por Funcionalidade](#19-guia-de-manutenção-por-funcionalidade)
20. [Dependências Externas](#20-dependências-externas)

---

## 1. Visão Geral do Sistema

O **QA Dashboard** é uma aplicação web para acompanhamento de qualidade de software durante sprints ágeis. Permite que equipes de QA gerenciem múltiplas sprints, rastreiem casos de teste (Gherkin e manuais), monitorem bugs, calculem métricas como MTTR e QA Health Score, e visualizem progresso por meio de gráficos interativos.

### Stack Tecnológica

| Camada       | Tecnologia                                      |
|--------------|-------------------------------------------------|
| Frontend     | HTML5 + CSS3 + JavaScript (Vanilla, sem framework) |
| Padrão MVC   | Separação manual: `model.js`, `view.js`, `controller.js`, `home_logic.js` |
| Gráficos     | Chart.js 4 + chartjs-plugin-datalabels          |
| Planilhas    | SheetJS (xlsx 0.20.3)                           |
| Screenshot   | html2canvas 1.4.1                               |
| PDF          | jsPDF 2.5.1 (geração de PDF multi-página no browser) |
| Tipografia   | Google Fonts — Inter                            |
| Backend      | Node.js + Express 4                             |
| Persistência | LocalStorage (primário) + arquivo JSON local, Supabase ou MongoDB (secundário) |

### Princípio Fundamental

> O sistema funciona **100% offline** via LocalStorage. O servidor Node.js e o Supabase são camadas de **backup secundário**. A ausência do servidor não impede o uso da aplicação.

---

## 2. Arquitetura e Estrutura de Arquivos

```
qa_dashboard_project/
├── server.js                    # API Express (backup remoto — JSON local ou Supabase)
├── server_mongo.js              # API Express com MongoDB via Mongoose
├── package.json
├── .env                         # Variáveis de ambiente (MONGODB_URI, etc.) — não versionado
├── data/                        # JSONs por sprint (modo local) — não versionado
│   └── dashboard_{sprintId}.json
├── public/
│   ├── index.html               # SPA principal — todo o HTML estático
│   └── scripts/
│       ├── model.js             # Estado global, persistência, normalização
│       ├── view.js              # Renderização de todos os painéis da sprint
│       ├── controller.js        # Handlers de eventos, importação, lógica de negócio, PDF
│       └── home_logic.js        # Tela Home: CRUD de sprints, filtros, drag & drop
└── documentacao/
    ├── DOCUMENTACAO_TECNICA.md  # Este arquivo
    └── TUTORIAL_MONGODB.md      # Tutorial passo a passo de setup com MongoDB
```

### Diagrama de Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│                        BROWSER (SPA)                         │
│                                                              │
│  ┌────────────┐   eventos   ┌──────────────────────────────┐ │
│  │  index.html│◄───────────►│     controller.js            │ │
│  │  (DOM/HTML)│             │  window.* handlers           │ │
│  └─────┬──────┘             └──────┬───────────┬───────────┘ │
│        │ renderAll()               │           │             │
│        ▼                          ▼           ▼             │
│  ┌────────────┐            ┌────────────┐ ┌─────────────┐   │
│  │  view.js   │            │  model.js  │ │home_logic.js│   │
│  │ renderAll()│◄──state────│ saveState()│ │ Home Screen │   │
│  │ renderXxx()│            │normalizeState│ │ Sprint CRUD │   │
│  └────────────┘            └──────┬─────┘ └──────┬──────┘   │
│                                   │               │          │
│                            ┌──────▼───────────────▼──────┐  │
│                            │       LocalStorage           │  │
│                            │  qaDashboardMasterIndex      │  │
│                            │  qaDashboardData_{sprintId}  │  │
│                            └──────────────┬───────────────┘  │
└───────────────────────────────────────────│──────────────────┘
                                            │ fetch (debounced 700ms)
                                            ▼
                            ┌───────────────────────────────┐
                            │      server.js (Node.js)      │
                            │  GET /api/dashboard/:id       │
                            │  PUT /api/dashboard/:id       │
                            └──────────────┬────────────────┘
                                           │
                         ┌─────────────────┼──────────────────┐
                         ▼                                    ▼
                  ┌─────────────┐                  ┌──────────────────┐
                  │  data/*.json│                  │   Supabase DB    │
                  │ (modo local)│                  │ dashboard_states │
                  └─────────────┘                  └──────────────────┘
```

### Responsabilidade de Cada Arquivo

| Arquivo          | Responsabilidade Principal                                                    |
|------------------|-------------------------------------------------------------------------------|
| `model.js`       | Define `DEFAULT_STATE`, `normalizeState()`, `saveState()`, comunicação com API |
| `view.js`        | Toda a renderização HTML da sprint ativa (tabs, KPIs, gráficos, cenários, bugs) |
| `controller.js`  | Handlers de ação do usuário: edição de config, bugs, casos de teste, importação |
| `home_logic.js`  | Tela Home: listagem, criação, exclusão, reordenação e filtros de sprints        |
| `home_styles.css`| Estilos exclusivos da tela Home e seus componentes                             |
| `index.html`     | Estrutura HTML estática, CDNs, variáveis CSS globais                           |
| `server.js`      | REST API Express para persistência remota (local ou Supabase)                  |

---

## 3. Camada de Persistência

### Chaves de LocalStorage

| Chave                              | Conteúdo                                           | Responsável          |
|------------------------------------|----------------------------------------------------|----------------------|
| `qaDashboardMasterIndex`           | Array de metadados de todas as sprints             | `home_logic.js`      |
| `qaDashboardData_{sprintId}`       | Estado completo de uma sprint específica           | `model.js`           |

### Ciclo de Vida do Estado

```
Inicialização da Aplicação
           │
           ▼
   window.location.hash?
     ┌─────┴─────┐
   #home      #sprint={id}
     │              │
     ▼              ▼
renderHomeScreen()  1. Carrega LocalStorage → qaDashboardData_{id}
                    2. Se não existe: cloneDefaultState()
                    3. normalizeState(rawState) → preenche campos faltantes
                    4. Tenta carregar do servidor (async, não bloqueante)
                    5. renderAll()
```

### Fluxo de Salvamento

```
Usuário altera dado
        │
        ▼
   saveState()
   ┌────────────────────────────────────┐
   │ 1. Recalcula f.tests, f.exec       │
   │    para cada feature               │
   │ 2. localStorage.setItem(key, JSON) │
   │ 3. upsertSprintInMasterIndex()     │
   │ 4. queueRemotePersist(700ms)       │ ← debounce
   │ 5. renderAll()                     │
   └────────────────────────────────────┘
                  │ (após 700ms)
                  ▼
        persistStateToServer()
        PUT /api/dashboard/{sprintId}
        body: { payload: state }
```

### Estratégia Anti-Colisão de Requisições

```
remotePersistInFlight = true  → nova chamada enfileira (remotePersistQueued = true)
remotePersistInFlight = false → executa imediatamente
Após finalizar → se remotePersistQueued: reagenda com delay de 2000ms
```

---

## 4. Roteamento e Navegação

O sistema usa **hash routing** nativo do browser. Não há roteador de terceiros.

### Tabela de Rotas

| Hash              | Tela Exibida                          | Ação Disparada           |
|-------------------|---------------------------------------|--------------------------|
| `#home`           | Tela Home — listagem de sprints       | `renderHomeScreen()`     |
| `#sprint={id}`    | Dashboard de sprint específica        | Carrega estado + `renderAll()` |
| *(vazio/default)* | Redireciona para `#home`              | —                        |

### Diagrama de Navegação

```
┌──────────────────────────────────────────────────────────────┐
│                       TELA HOME (#home)                      │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│   │ Sprint A │  │ Sprint B │  │ Sprint C │  │+ Nova    │   │
│   │ card     │  │ card     │  │ card     │  │  Sprint  │   │
│   └────┬─────┘  └──────────┘  └──────────┘  └────┬─────┘   │
│        │click                                     │click     │
└────────│─────────────────────────────────────────-│──────────┘
         │                                          │
         ▼                                          ▼
┌─────────────────────────┐              ┌──────────────────────┐
│  SPRINT DASHBOARD       │              │  MODAL NOVA SPRINT   │
│  #sprint={sprintId}     │◄─── ← Sprints (backBtn) ───────────│
│                         │                                     │
│  Tabs:                  │              Campos:                │
│  ├─ Painel Geral        │              - Título *             │
│  ├─ Gestão de Cenários  │              - Squad (opcional)     │
│  ├─ Burndown            │                                     │
│  ├─ Bugs & MTTR         │              Cria: novo estado      │
│  ├─ Health Score        │              + upsert no index      │
│  ├─ Alinhamentos        │              → redirect #sprint=id  │
│  └─ Relatórios          │              └──────────────────────┘
└─────────────────────────┘
```

---

## 5. Funcionalidade: Home — Gestão de Sprints

**Arquivos:** `home_logic.js`, `home_styles.css`

### Regras de Negócio

- Cada sprint é identificada por um ID único: `sprint_` + `Date.now()`
- O **Master Index** (`qaDashboardMasterIndex`) armazena apenas metadados leves (título, squad, datas, totalTests, totalExec) para permitir listagem rápida sem carregar todos os estados completos
- O estado completo de cada sprint é armazenado separadamente em `qaDashboardData_{sprintId}`
- Filtros de Home são de **sessão** (não persistidos): resetam ao recarregar
- A ordem das sprints no Master Index é a ordem exibida na tela e pode ser alterada por drag & drop

### Diagrama de Fluxo — Criação de Sprint

```
Usuário clica "Nova Sprint"
        │
        ▼
openCreateModal() → exibe modal
        │
        ▼
Preenche Título + Squad (opcional) → submit
        │
        ▼
createNewSprint(event)
  │
  ├─ Valida: título não vazio
  ├─ Gera ID: 'sprint_' + Date.now()
  ├─ Clona DEFAULT_STATE
  ├─ Aplica config.title e config.squad
  ├─ localStorage.setItem('qaDashboardData_' + id, JSON)
  ├─ upsertSprintInMasterIndex(id, state)
  ├─ closeCreateModal()
  └─ window.location.hash = '#sprint=' + id
```

### Diagrama de Fluxo — Exclusão de Sprint

```
Usuário clica [🗑️] no card (hover)
        │
        ▼
deleteSprint(sprintId, title)
  ├─ Armazena sprintToDelete
  └─ Exibe modal de confirmação

        │ clica "Excluir"
        ▼
confirmDeleteSprint()
  ├─ Remove do Master Index (filter by id)
  ├─ saveMasterIndex(novoIndex)
  ├─ localStorage.removeItem('qaDashboardData_' + id)
  ├─ closeDeleteModal()
  └─ renderHomeScreen()
```

### Diagrama de Fluxo — Filtros

```
renderHomeScreen()
  ├─ Lê getMasterIndex() → allSprints
  ├─ Extrai squads únicos e anos únicos
  ├─ Renderiza filterBar HTML (selects com valores de _homeFilters)
  └─ Chama _renderFilteredCards()

Usuário altera select
  │
  ▼
setHomeFilter(field, value)
  ├─ _homeFilters[field] = value
  └─ _renderFilteredCards()         ← só re-renderiza os cards, não o filterBar

_renderFilteredCards()
  ├─ getMasterIndex() → allSprints
  ├─ Aplica filtros: squad, status, year
  ├─ Atualiza contador (#home-filter-count)
  ├─ Atualiza visibilidade do btn "Limpar"
  └─ Gera HTML dos cards → sprint-list.innerHTML
```

### Diagrama de Sequência — Drag & Drop de Sprints

```
Usuário              DOM (container)         getMasterIndex()     saveMasterIndex()
   │                       │                        │                    │
   │ dragstart (handle)     │                        │                    │
   │──────────────────────►│                        │                    │
   │                       │ _dragSrcId = sprintId  │                    │
   │                       │ card.classList.add(dnd-dragging)            │
   │                       │                        │                    │
   │ dragover (outro card) │                        │                    │
   │──────────────────────►│                        │                    │
   │                       │ card.classList.add(dnd-over)               │
   │                       │                        │                    │
   │ drop                  │                        │                    │
   │──────────────────────►│                        │                    │
   │                       │────────────────────────►                    │
   │                       │              retorna index[]                │
   │                       │ splice(srcIdx, 1) → insert at dstIdx       │
   │                       │────────────────────────────────────────────►│
   │                       │                        │      salva         │
   │                       │ _renderFilteredCards() │                    │
```

### Status de Sprint (Computed)

```javascript
_sprintStatus(sprint):
  if (sprint.totalTests > 0 && sprint.totalExec >= sprint.totalTests)
    → 'completed'  (verde, stripe gradiente green)
  else
    → 'active'     (azul, stripe gradiente blue)
```

---

## 6. Funcionalidade: Dashboard de Sprint

**Arquivo:** `view.js`

### Estrutura de Abas

| Tab ID   | Label              | Conteúdo Principal                                      |
|----------|--------------------|----------------------------------------------------------|
| `tab-1`  | Painel Geral       | KPIs, Burndown, gráfico de bugs por stack/criticidade    |
| `tab-2`  | Gestão de Cenários | Accordion por feature, casos de teste Gherkin            |
| `tab-3`  | Bugs & MTTR        | Tabela de bugs, heatmap MTTR Stack × Criticidade         |
| `tab-4`  | Health Score       | Score calculado, gráfico radar, histórico                |
| `tab-5`  | Alinhamentos       | Lista de decisões/anotações de alinhamento               |
| `tab-6`  | Relatórios         | Notas diárias e relatório exportável                     |

### KPIs do Painel Geral

| KPI                  | Fórmula                                                           |
|----------------------|-------------------------------------------------------------------|
| Total de Testes      | Σ `feature.tests` (casos Gherkin + manuais)                      |
| Executados           | Σ `feature.exec`                                                  |
| % Progresso          | `(totalExec / totalTests) × 100`                                  |
| Bugs Abertos         | `bugs.filter(b => b.status !== 'Resolvido').length`               |
| Bugs Críticos        | `bugs.filter(b => b.severity === 'Crítico' && status ≠ 'Resolvido').length` |
| Health Score         | Ver seção 11                                                      |

### Diagrama de Fluxo — renderAll()

```
renderAll()
  ├─ renderConfigSection()       → Header, config, data selector
  ├─ renderKPIs()                → 6 cards de métricas
  ├─ renderBurndown()            → Gráfico linha Chart.js
  ├─ renderBugCharts()           → Gráficos pizza/bar de bugs
  ├─ renderFeaturesSection()     → Accordion de cenários (tab-2)
  ├─ renderBugsSection()         → Tabela de bugs (tab-3)
  ├─ renderMTTRSection()         → Heatmap MTTR (tab-3)
  ├─ renderHealthScore()         → Score + radar (tab-4)
  ├─ renderAlignments()          → Lista alinhamentos (tab-5)
  └─ renderReportsSection()      → Notas diárias (tab-6)
```

---

## 7. Funcionalidade: Gestão de Cenários (Gherkin)

**Arquivos:** `view.js` (renderização), `controller.js` (handlers)

### Estrutura de Dados

```javascript
// Feature (Funcionalidade)
{
  id: Number,            // identificador incremental
  name: String,          // nome da funcionalidade
  status: String,        // 'Ativa' | 'Bloqueada'
  blockReason: String,   // motivo do bloqueio (se status === 'Bloqueada')
  tests: Number,         // total = cases.length + manualTests (calculado em saveState)
  manualTests: Number,   // testes manuais não-Gherkin
  exec: Number,          // total executados (calculado em saveState)
  execution: Object,     // { D1: N, D2: N, ... } execuções por dia (calculado)
  manualExecData: Object,// { D1: N, D2: N, ... } execuções manuais por dia (editável)
  gherkinExecs: Object,  // { D1: N, D2: N, ... } execuções Gherkin por dia (calculado)
  activeFilter: String,  // filtro ativo nos casos: 'Todos'|'Pendente'|'Concluído'|'Falhou'
  mockupImage: String,   // base64 DataURL da imagem de referência (ou '')
  cases: [               // casos de teste Gherkin
    {
      id: Number,
      name: String,
      complexity: String,  // 'Baixa' | 'Média' | 'Alta'
      status: String,      // 'Pendente' | 'Concluído' | 'Falhou'
      executionDay: String,// 'D1' | 'D2' | ... (dia em que foi executado)
      gherkin: String      // texto Gherkin completo
    }
  ]
}
```

### Diagrama de Fluxo — Status de Caso de Teste

```
        ┌──────────┐
        │ Pendente │  ◄── estado inicial
        └─────┬────┘
              │ usuário muda status
     ┌────────┴────────┐
     ▼                 ▼
┌──────────┐      ┌─────────┐
│ Concluído│      │  Falhou │
└──────────┘      └─────────┘
     ↕                 ↕
   Pode retornar a Pendente ou alternar entre Concluído ↔ Falhou

Regra: ambos 'Concluído' E 'Falhou' contam como EXECUTADO para o burndown
(gherkinExecs + manualExecData → f.exec)
```

### Diagrama de Sequência — Alterar Status de Caso de Teste

```
Usuário               controller.js           model.js (saveState)
   │                        │                        │
   │ select onChange         │                        │
   │───────────────────────►│                        │
   │                        │ pendingTestCaseStatus[key] = value
   │                        │ (debounce 300ms)        │
   │                        │───────────────────────►│
   │                        │                        │ Recalcula gherkinExecs
   │                        │                        │ Recalcula f.exec
   │                        │                        │ localStorage.setItem
   │                        │                        │ upsertSprintInMasterIndex
   │                        │                        │ queueRemotePersist(700ms)
   │                        │                        │ renderAll()
   │◄───────────────────────────────────────────────│
```

### Diagrama de Fluxo — Adicionar Feature

```
addFeature()
  ├─ Gera novo ID: max(features.map(f=>f.id)) + 1
  ├─ Cria objeto feature com mockupImage: ''
  ├─ state.features.push(novaFeature)
  └─ saveState() → renderAll()
```

### Diagrama de Fluxo — Adicionar Caso de Teste

```
addTestCase(fIndex)
  ├─ Gera ID: max(feature.cases.map(c=>c.id)) + 1
  ├─ Cria caso: { name: 'Novo Caso', complexity: 'Baixa', status: 'Pendente', executionDay: '', gherkin: '' }
  ├─ state.features[fIndex].cases.push(novoCase)
  └─ saveState() → renderAll()
```

---

## 8. Funcionalidade: Rastreamento de Bugs

**Arquivos:** `view.js` (renderização), `controller.js` (handlers)

### Estrutura de Dados — Bug

```javascript
{
  id: Number,
  title: String,
  severity: String,   // 'Baixo' | 'Médio' | 'Alto' | 'Crítico' | 'Blocker'
  stack: String,      // 'Front-end' | 'Back-end' | 'Banco de Dados' | 'Mobile' | 'Infra'
  status: String,     // 'Aberto' | 'Em Análise' | 'Aguardando Retest' | 'Resolvido'
  feature: String,    // nome da feature relacionada (opcional)
  assignee: String,   // responsável pela correção (opcional)
  openedAt: String,   // 'YYYY-MM-DD' — data de abertura
  resolvedAt: String, // 'YYYY-MM-DD' — data de resolução (apenas quando Resolvido)
  description: String // descrição detalhada (opcional)
}
```

### Diagrama de Fluxo — Ciclo de Vida do Bug

```
┌─────────┐    análise    ┌──────────────┐    fix     ┌──────────────────────┐
│  Aberto │──────────────►│  Em Análise  │───────────►│ Aguardando Retest    │
└─────────┘               └──────────────┘            └──────────┬───────────┘
     ▲                                                             │
     │                   reteste falhou                           │ reteste passou
     └─────────────────────────────────────────────────────────   │
                                                                   ▼
                                                           ┌──────────────┐
                                                           │  Resolvido   │
                                                           │ resolvedAt = │
                                                           │ data seleção │
                                                           └──────────────┘
```

### Diagrama de Sequência — Resolver Bug (Modal Especial)

```
Usuário               controller.js                     model.js
   │                        │                               │
   │ select → 'Resolvido'    │                               │
   │───────────────────────►│                               │
   │                        │ _resolveModalBugIndex = idx   │
   │                        │ Exibe modal com date picker   │
   │◄───────────────────────│                               │
   │                        │                               │
   │ Seleciona data + confirma                              │
   │───────────────────────►│                               │
   │                        │ bug.status = 'Resolvido'      │
   │                        │ bug.resolvedAt = dataSelecionada
   │                        │───────────────────────────────►│
   │                        │                               │ saveState()
   │◄───────────────────────────────────────────────────────│
   │                      renderAll() → MTTR atualiza
```

---

## 9. Funcionalidade: MTTR — Mean Time to Resolution

**O MTTR (Mean Time to Resolution, Tempo Médio de Resolução)** é a métrica central de desempenho operacional do sistema. Indica, em média, quanto tempo a equipe leva para corrigir uma falha desde o momento em que o bug é reportado até ser validado como "Resolvido".

### Por que o MTTR é crítico para a gestão de qualidade

O MTTR não é apenas um número — é um diagnóstico da saúde técnica e operacional da equipe. Analisar o MTTR cruzando **Stack** (camada tecnológica) com **Criticidade** (severidade do bug) permite identificar exatamente onde a operação está travando e agir com precisão cirúrgica.

### Fórmula de Cálculo

```
Para cada bug resolvido:
  MTTR_bug = resolvedAt(data) − openedAt(data)   [em dias, mínimo 0]

Para um grupo (Stack × Criticidade):
  MTTR_grupo = Σ MTTR_bug_i  /  count(bugs_resolvidos_no_grupo)

MTTR Global da Sprint:
  MTTR_global = Σ MTTR_bug_i  /  count(todos_bugs_resolvidos_com_datas)
```

### Implementação no Sistema

```javascript
// Calcula MTTR de um bug individual (em dias)
calcMTTR(bug):
  open     = new Date(bug.openedAt + 'T00:00:00')
  resolved = new Date(bug.resolvedAt + 'T00:00:00')
  diffMs   = resolved - open
  return   Math.max(0, Math.round(diffMs / 86400000))

// Condições para inclusão no cálculo:
// 1. bug.status === 'Resolvido'
// 2. bug.openedAt não é vazio
// 3. bug.resolvedAt não é vazio
```

### Exemplo Prático

Se a equipe de Back-end resolveu 4 bugs **Críticos** na sprint com os seguintes tempos:

| Bug         | openedAt   | resolvedAt | MTTR (dias) |
|-------------|------------|------------|-------------|
| Login falha | 2026-03-01 | 2026-03-03 | 2           |
| Timeout API | 2026-03-02 | 2026-03-05 | 3           |
| Null pointer| 2026-03-03 | 2026-03-07 | 4           |
| DB deadlock | 2026-03-04 | 2026-03-07 | 3           |

**MTTR Back-end Crítico = (2 + 3 + 4 + 3) / 4 = 3 dias**

### Heatmap MTTR: Stack × Criticidade

O sistema renderiza uma tabela cruzada onde cada célula mostra o MTTR médio do grupo. A intensidade da cor indica o risco:

```
                │  Baixo  │  Médio  │   Alto  │ Blocker │ Crítico │
────────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤
Front-end       │  1 dia  │  2 dias │  3 dias │    —    │  5 dias │
Back-end        │  3 dias │  4 dias │  7 dias │  2 dias │  3 dias │
Banco de Dados  │    —    │  6 dias │ 10 dias │    —    │  8 dias │
Mobile          │  1 dia  │    —    │  4 dias │    —    │    —    │
Infra           │    —    │    —    │  2 dias │  1 dia  │    —    │

Legenda de cor:
  ■ Verde  (≤ 2 dias)  — Saudável
  ■ Amarelo(3-5 dias)  — Atenção
  ■ Laranja(6-9 dias)  — Alerta
  ■ Vermelho(≥ 10 dias)— Crítico
```

### Tabela de Diagnóstico por Padrão

| Padrão Identificado no Heatmap           | Diagnóstico                                                         | Ação Recomendada                                                    |
|------------------------------------------|---------------------------------------------------------------------|---------------------------------------------------------------------|
| MTTR Front < MTTR Back                   | Arquitetura backend complexa, débito técnico ou falta de testes     | Revisar cobertura de testes de integração no back-end               |
| MTTR bugs Críticos alto (> 5 dias)       | Risco direto de bloqueio de release, processo de escalada ineficaz  | Criar SLA de resposta para bugs Críticos/Blocker (< 24h)            |
| MTTR bugs Baixos alto (> 15 dias)        | Backlog de baixa prioridade despriorizado, acúmulo de débito técnico| Alocar % do tempo da sprint para dívida técnica                     |
| MTTR alto em Banco de Dados              | Complexidade de migrations, ausência de DBA dedicado                | Introduzir revisão de queries e índices antes do deploy             |
| MTTR Blocker < MTTR Crítico              | Escalada correta de Blockers, mas Críticos mal classificados        | Revisar critérios de severidade com o time                          |
| MTTR homogêneo alto em todas as stacks   | Processo de handoff Dev→QA lento, falta de CI/CD ou ambientes       | Mapear o processo de fix-to-deploy e identificar filas              |

### Integração com IA — RCA Assistida

O MTTR alto em uma Stack específica abre porta para análise de causa raiz assistida por IA (Root Cause Analysis):

```
Fluxo de RCA com IA:
  1. MTTR Back-end Crítico > 7 dias identificado no heatmap
  2. QA exporta lista de bugs resolvidos (Stack=Back-end, Criticidade=Crítico)
  3. Prompt para LLM: "Analise esses bugs e identifique padrões na causa raiz"
  4. LLM sugere: débito técnico em módulo X, falta de tratamento de exceção Y
  5. Time prioriza correção estrutural na próxima sprint
  6. MTTR da sprint seguinte é monitorado para validar o impacto
```

### Diagrama de Sequência — Renderização do MTTR

```
renderMTTRSection()
        │
        ├─ Filtra bugs: status === 'Resolvido' && openedAt && resolvedAt
        ├─ Para cada bug: calcula MTTR_bug em dias
        │
        ├─ Calcula MTTR Global: média de todos os bugs resolvidos
        │
        ├─ Agrupa por [stack][severity]:
        │    matrix[stack][sev] = { sum: 0, count: 0 }
        │    Para cada bug: matrix[bug.stack][bug.severity].sum += mttr
        │                   matrix[bug.stack][bug.severity].count++
        │
        ├─ Para cada célula: mttr_celula = sum / count  (ou '—' se count = 0)
        │
        └─ Renderiza tabela HTML com cor de fundo proporcional ao MTTR
```

---

## 10. Funcionalidade: Burndown Chart

**Arquivo:** `view.js` → `renderBurndown()`

### Regras de Negócio

- O gráfico exibe a linha **ideal** (decrescente linear) e a linha **real** (baseada nas execuções diárias)
- O eixo X tem `sprintDays + 1` pontos: começando em "Início" com `totalTests` pendentes
- O eixo Y representa **testes pendentes** (não executados)
- Testes com status `'Concluído'` OU `'Falhou'` **ambos** contam como executados (o teste foi realizado, independente do resultado)

### Fórmula do Burndown

```
Dia 0 (Início):  totalTests pendentes
Dia N:           totalTests − Σ execuções de D1 até DN

Linha Ideal:
  idealPorDia = totalTests / sprintDays
  ideal[d]    = totalTests − (d × idealPorDia)

Linha Real:
  real[0]     = totalTests
  real[d]     = real[d-1] − execucoesDoDia[d]
  (onde execucoesDoDia[d] = Σ feature.execution['Dd'] para todas features)
```

### Diagrama de Fluxo — Cálculo do Burndown

```
renderBurndown()
  │
  ├─ Calcula sprintDays a partir de startDate/endDate (ou config.sprintDays)
  ├─ Calcula totalTests = Σ feature.tests
  │
  ├─ Linha Ideal:
  │    labels[0] = 'Início' → idealData[0] = totalTests
  │    Para d de 1 a sprintDays:
  │      labels[d] = `D${d}`
  │      idealData[d] = totalTests − (d × totalTests/sprintDays)
  │
  ├─ Linha Real:
  │    realData[0] = totalTests
  │    Para d de 1 a sprintDays:
  │      execD = Σ feature.execution[`D${d}`] para todas features
  │      realData[d] = realData[d-1] − execD
  │
  ├─ Flags de Dias com Execução Zero (zeroExecFlags):
  │    Para d de 1 a sprintDays:
  │      inRange = d <= maxDay (último dia com dado real)
  │      execVal = globalExecution[`D${d}`] || 0
  │      zeroExecFlags[d] = inRange && execVal === 0
  │
  ├─ Coloração condicional dos pontos da linha real:
  │    pointBackgroundColor[d] = zeroExecFlags[d] ? '#ef4444' : '#2563eb'
  │    pointRadius[d]          = zeroExecFlags[d] ? 7 : 4
  │
  ├─ Coloração do rótulo do eixo X:
  │    ticks.color(ctx) = zeroExecFlags[ctx.index] ? '#ef4444' : '#94a3b8'
  │    ticks.font(ctx)  = { weight: zeroExecFlags[ctx.index] ? '700' : '400' }
  │
  └─ Chart.js renderiza gráfico de linhas
```

> **Dias com execução zero** (dentro do intervalo executado) são sinalizados em **vermelho** no gráfico: o ponto fica maior (7px), vermelho, e o rótulo do eixo X fica negrito vermelho. Isso permite identificar visualmente dias improdutivos (impedimentos, ausências, feriados).

### Integração com Execução de Casos de Teste

```
saveState() recalcula:
  feature.gherkinExecs = { D1: count, D2: count, ... }
    ← casos com (status==='Concluído' || 'Falhou') && executionDay set

  feature.execution[Dd] = feature.manualExecData[Dd] + feature.gherkinExecs[Dd]
  feature.exec = Σ feature.execution[Dd]
```

---

## 11. Funcionalidade: QA Health Score

**Arquivo:** `view.js` → `renderHealthScore()`

### Conceito

O **Health Score** é um indicador de -100 a 100 que mede a saúde geral do processo de QA na sprint. Começa em 100 e vai sendo penalizado por eventos negativos.

### Pesos de Penalidade (configuráveis em Configurações)

| Evento                  | Campo de Config   | Valor Padrão | Lógica                              |
|-------------------------|-------------------|--------------|-------------------------------------|
| Bug Crítico/Blocker aberto | `hsCritical`   | −15 pts each | Multiplica por quantidade            |
| Bug Alto aberto         | `hsHigh`          | −10 pts each |                                     |
| Bug Médio aberto        | `hsMedium`        | −5 pts each  |                                     |
| Bug Baixo aberto        | `hsLow`           | −2 pts each  |                                     |
| Retest pendente         | `hsRetest`        | −2 pts each  | bugs status = 'Aguardando Retest'   |
| Feature bloqueada       | `hsBlocked`       | −10 pts each |                                     |
| Cenário com atraso      | `hsDelayed`       | −2 pts each  | executionDay definido mas status Pendente |

### Fórmula

```
score = 100
      − (bugsAbertosCriticosBlocker × hsCritical)
      − (bugsAbertosAltos            × hsHigh)
      − (bugsAbertosMedios           × hsMedium)
      − (bugsAbertosBaixos           × hsLow)
      − (bugsAguardandoRetest        × hsRetest)
      − (featuresBlockeadas          × hsBlocked)
      − (scenariosAtrasados          × hsDelayed)

score = Math.max(-100, Math.min(100, score))
```

### Classificação do Score

| Faixa         | Classificação  | Cor       |
|---------------|----------------|-----------|
| 80 a 100      | Excelente      | Verde     |
| 60 a 79       | Bom            | Azul      |
| 40 a 59       | Regular        | Amarelo   |
| 20 a 39       | Atenção        | Laranja   |
| < 20          | Crítico        | Vermelho  |

---

## 12. Funcionalidade: Relatórios e Notas

**Arquivo:** `view.js` → `renderReportsSection()`

### Tipos de Notas

| Campo                 | Chave no State             | Descrição                                     |
|-----------------------|----------------------------|-----------------------------------------------|
| Premissas             | `notes.premises`           | Premissas gerais da sprint                    |
| Premissas Operacionais| `notes.operationalPremises`| Condições operacionais (ambientes, acessos)   |
| Plano de Ação         | `notes.actionPlan`         | Próximas ações planejadas pelo QA             |
| Relatório Diário      | `reports[currentDate]`     | Nota do dia selecionado (indexado por data)   |

### Relatório Diário

- Cada dia tem seu próprio campo de texto, indexado pela data no formato `YYYY-MM-DD`
- O seletor de data (`currentDateSelector`) define qual relatório está sendo visualizado/editado
- Mudança de `state.currentDate` atualiza o campo exibido sem apagar outros dias

---

## 13. Funcionalidade: Importação de Cenários

**Arquivo:** `controller.js`

### Formatos Suportados

| Formato | Extensão     | Parser                           |
|---------|--------------|----------------------------------|
| Gherkin | `.feature`   | `_importFromFeatureText(text)`   |
| CSV     | `.csv`       | `_importFromCSV(text)`           |
| Excel   | `.xlsx/.xls` | `_importFromXLSX(arrayBuffer)`   |

### Diagrama de Fluxo — Dispatcher de Importação

```
importFeature(event)
  │
  ├─ file.name.endsWith('.feature') → FileReader (text) → _importFromFeatureText()
  ├─ file.name.endsWith('.csv')     → FileReader (text, UTF-8) → _importFromCSV()
  └─ file.name.endsWith('.xlsx'/'.xls') → FileReader (ArrayBuffer) → _importFromXLSX()
```

### Parser .feature — Multi-Feature

```
_importFromFeatureText(text):
  ├─ Divide por linhas
  ├─ featuresMap = {}  // nome → { scenarios: [] }
  ├─ featuresOrder = []
  ├─ currentFeatureName = null
  ├─ currentScenarioName = null
  ├─ currentGherkinLines = []
  │
  ├─ Para cada linha:
  │    Se começa com 'Feature:' → finaliza cenário atual, inicia nova feature
  │    Se começa com 'Scenario:' ou 'Scenario Outline:' → finaliza cenário anterior
  │    Senão → acumula em currentGherkinLines
  │
  └─ Merge com state.features (por nome, case-insensitive):
       feature existente → adiciona cenários à feature existente
       feature nova → cria nova feature e adiciona ao state
```

### Parser CSV — Campo Multiline

O parser CSV é **stateful e character-by-character** para suportar quebras de linha dentro de campos entre aspas (necessário para Gherkin em células CSV):

```
_parseCSV(text):
  inQuotes = false
  Para cada caractere ch:
    Se ch == '"':
      Se inQuotes e próximo == '"': adiciona literal " (escape)
      Senão: toggle inQuotes
    Se ch == ',' e !inQuotes: fecha campo
    Se ch == '\n'/'\r' e !inQuotes: fecha linha
    Se ch == '\n'/'\r' e inQuotes: adiciona \n ao campo (multiline)
    Senão: adiciona ao campo atual
```

### Detecção de Colunas CSV/XLSX — Padrão Posicional

A importação utiliza **detecção por posição de coluna** (não por palavra-chave). O template padrão segue a ordem:

```
Coluna 0 (A) → Feature (nome da funcionalidade)
Coluna 1 (B) → Cenário (nome do caso de teste)
Coluna 2 (C) → Gherkin (passos BDD) — opcional
Coluna 3 (D) → Complexidade — opcional
Coluna 4 (E) → Status — opcional
```

```
CSV:  row[0] = Feature, row[1] = Cenario
XLSX: XLSX.utils.sheet_to_json(sheet, { header: 1 })
      → array de arrays → row[0], row[1]
```

> **Importante:** A primeira linha do arquivo é tratada como cabeçalho e ignorada. A partir da segunda linha, a coluna 0 é sempre Feature e a coluna 1 é sempre Cenário, independentemente dos nomes das colunas.

### Template CSV

```csv
Feature,Cenario,Gherkin,Complexidade,Status
Login,"Validar login com credenciais válidas","Given o usuário acessa /login
When preenche email e senha válidos
Then é redirecionado ao dashboard",Baixa,Pendente
```

### Diagrama de Fluxo — Merge de Importação

```
_mergeImportedFeatures(featuresMap, featuresOrder):
  Para cada featureName em featuresOrder:
    Busca feature existente em state.features (toLowerCase)
    │
    ├─ Encontrou → adiciona cenários à feature existente (sem duplicar por nome)
    └─ Não encontrou → cria nova feature com ID incremental, push em state.features

  saveState() → renderAll()
  alert('X novas features, Y novas cenários importados')
```

---

## 14. Funcionalidade: Evidências Visuais (Mockups)

**Arquivos:** `controller.js` (upload/remoção), `view.js` (exibição)

### Regras de Negócio

- Cada **Feature** pode ter uma imagem de referência (mockup, screenshot, wireframe)
- A imagem é armazenada como **Base64 DataURL** no campo `feature.mockupImage`
- Tamanho máximo: **5 MB** (verificado antes do upload)
- Somente arquivos `image/*` são aceitos
- A imagem aparece em dois contextos:
  1. **Accordion de configuração da feature** — thumbnail 60px de altura, com botões de Substituir e Remover
  2. **Card de caso de teste** — preview lateral (largura: `clamp(120px, 35%, 260px)`) ao lado do textarea Gherkin

### Diagrama de Fluxo — Upload de Mockup

```
uploadMockupImage(fIndex, inputEl):
  ├─ Valida: arquivo selecionado?
  ├─ Valida: file.type.startsWith('image/')? → alerta e aborta
  ├─ Valida: file.size > 5MB? → alerta e aborta
  │
  ├─ FileReader.readAsDataURL(file)
  │    onload:
  │      state.features[fIndex].mockupImage = e.target.result
  │      inputEl.value = ''
  │      saveState()    ← renderAll() é chamado internamente
  └─ (imagem aparece imediatamente no próximo render)
```

### Diagrama de Fluxo — Preview em Janela

```
previewMockup(fIndex):
  ├─ Lê state.features[fIndex].mockupImage (não usa inline onclick com base64)
  ├─ Se vazio: return
  └─ window.open('', '_blank')
       document.write(<html com <img src=base64>)
```

### Diagrama de Fluxo — Remoção de Mockup

```
removeMockupImage(fIndex):
  └─ showConfirmModal('Remover Imagem', mensagem,
       callback: state.features[fIndex].mockupImage = ''
                 saveState()
     )
```

---

## 15. Funcionalidade: Exportação de Dados

**Arquivo:** `home_logic.js` → `exportAllData()`

### Formato de Export

```json
{
  "metadata": {
    "exportDate": "2026-03-14T12:00:00.000Z",
    "version": "2.0",
    "sprintCount": 5
  },
  "sprints": [
    {
      "id": "sprint_1710000000000",
      "data": { /* estado completo da sprint */ }
    }
  ]
}
```

### Diagrama de Fluxo

```
exportAllData():
  ├─ getMasterIndex() → lista de sprints
  ├─ Para cada sprint:
  │    localStorage.getItem('qaDashboardData_' + sprint.id)
  │    JSON.parse → adiciona ao bundle
  ├─ JSON.stringify(bundle, null, 2) → encodeURIComponent
  ├─ Cria <a> com href data:text/json e download filename
  ├─ .click() → browser baixa o arquivo
  └─ .remove()

Arquivo gerado: qa_dashboard_backup_YYYY-MM-DD.json
```

---

## 16. Funcionalidade: PDF de Conclusão de Sprint

**Arquivo:** `controller.js` → `window.exportSprintPDF()`

**Dependência:** jsPDF 2.5.1 (carregado via CDN no `index.html`) + html2canvas 1.4.1

### Estrutura do Documento PDF

O PDF é gerado com múltiplas páginas em formato A4 portrait:

| Página | Conteúdo |
|--------|----------|
| 1      | Retrato Visual da Sprint — capturas dos gráficos (Burndown, Health Score, Bugs por Funcionalidade, Bugs por Stack) via html2canvas |
| 2      | Alinhamentos Técnicos e de Produto — texto dos campos de alinhamento registrados na sprint |
| 3      | Tabela de Bugs — lista de todos os bugs com severidade, status, dev responsável, MTTR |
| 4      | Execução por Funcionalidade — tabela com totais de testes, executados, bugs e status por feature |
| 5      | Premissas, Plano de Ação e Bloqueios — campos de riscos e anotações de gestão |
| N+     | Reports Diários — um bloco por dia com data, texto do report e status das features |

### Restrição de Encoding

> jsPDF com a fonte padrão Helvetica suporta apenas **Latin-1 (ISO-8859-1)**. Caracteres fora desse conjunto (emojis, traço em, seta Unicode `→`) serão exibidos como caixa vazia no Chrome. A função substitui esses caracteres antes de chamar `doc.text()`:
> - Emojis → removidos
> - `—` (U+2014) → `-`
> - `→` (U+2192) → `:`
> - `·` (ponto central) → `|`

### Diagrama de Fluxo

```
exportSprintPDF()
  │
  ├─ Verifica se jsPDF está carregado (window.jspdf)
  ├─ Abre tab-1 temporariamente (display:block, visibility:hidden)
  │    para garantir que os canvas Chart.js estejam renderizados
  │
  ├─ html2canvas(chartContainer) → imageData base64
  │    └─ Página 1: cabeçalho + imagem dos gráficos
  │
  ├─ Página 2: Alinhamentos Técnicos (model.state.notes.alignments)
  │
  ├─ Página 3: Tabela de Bugs (model.state.bugs[])
  │
  ├─ Página 4: Tabela por Funcionalidade (model.state.features[])
  │
  ├─ Página 5: Premissas / Plano de Ação / Bloqueios (model.state.risks)
  │
  ├─ Para cada dia D1..maxDay:
  │    Página N: Report diário + status features naquele dia
  │
  ├─ Rodapé em todas as páginas: "{sprint title} | {data} | Pag X/Y"
  │
  └─ doc.save('{squad}_{title}.pdf')
```

### Manutenção

- **Adicionar nova seção ao PDF**: Adicione uma nova chamada a `doc.addPage()` + `_pdfHeader()` + `doc.text()` ou `doc.autoTable()` em `exportSprintPDF()` no ponto desejado.
- **Mudar fonte/tamanho**: Altere `doc.setFontSize()` e `doc.setFont()` nas seções correspondentes.
- **Adicionar logo**: Use `doc.addImage(base64, 'PNG', x, y, w, h)` após a leitura da imagem.

---

## 17. API do Servidor Node.js

**Arquivo:** `server.js`

### Endpoints

| Método | Rota                         | Descrição                                  | Auth       |
|--------|------------------------------|--------------------------------------------|------------|
| GET    | `/api/health`                | Status do serviço                          | Nenhuma    |
| GET    | `/config.js`                 | Configuração runtime para o frontend       | Nenhuma    |
| GET    | `/api/dashboard/:projectKey` | Lê estado de uma sprint                    | Nenhuma    |
| PUT    | `/api/dashboard/:projectKey` | Salva/atualiza estado de uma sprint        | Nenhuma    |
| GET    | `*`                          | Serve `public/index.html` (SPA fallback)   | Nenhuma    |

### Modos de Storage

```
STORAGE_TYPE=local (padrão):
  GET → lê data/dashboard_{key}.json
  PUT → escreve data/dashboard_{key}.json (JSON.stringify com indent 2)

STORAGE_TYPE=supabase:
  GET → supabase.from('dashboard_states').select().eq('project_key', key).maybeSingle()
  PUT → supabase.from('dashboard_states').upsert({project_key, payload, updated_at})
```

### Variáveis de Ambiente

| Variável                      | Padrão      | Obrigatória (supabase) |
|-------------------------------|-------------|------------------------|
| `PORT`                        | `3000`      | Não                    |
| `STORAGE_TYPE`                | `local`     | Não                    |
| `QA_PROJECT_KEY`              | `android`   | Não                    |
| `SUPABASE_URL`                | —           | Sim (supabase)         |
| `SUPABASE_SERVICE_ROLE_KEY`   | —           | Sim (supabase)         |

### Diagrama de Sequência — Inicialização com Servidor

```
Browser                   model.js                    server.js
   │                          │                            │
   │ hash = #sprint=id        │                            │
   │─────────────────────────►│                            │
   │                          │ loadStateFromServer(id)    │
   │                          │───────────────────────────►│
   │                          │                            │ GET /api/dashboard/id
   │                          │◄───────────────────────────│
   │                          │                            │ 200: { payload: state }
   │                          │                            │ 404: não encontrado
   │                          │ Se 404 ou erro:             │
   │                          │   usa LocalStorage         │
   │                          │ Se 200:                    │
   │                          │   normalizeState(payload)  │
   │                          │   renderAll()              │
   │◄─────────────────────────│                            │
```

---

## 18. API do Servidor MongoDB (server_mongo.js)

**Arquivo:** `server_mongo.js`
**ODM:** Mongoose 8+
**Banco:** MongoDB Atlas (cloud) ou instância local

### Schema Mongoose

```javascript
const dashboardSchema = new mongoose.Schema({
    sprint_id:  { type: String, required: true, unique: true, index: true },
    payload:    { type: mongoose.Schema.Types.Mixed, required: true },
    updated_at: { type: Date, default: Date.now }
}, { strict: false });
```

Cada documento representa uma sprint completa. O campo `payload` armazena o JSON de estado integralmente (sem schema rígido).

### Endpoints

| Método | Rota                         | Descrição                                     |
|--------|------------------------------|-----------------------------------------------|
| GET    | `/api/health`                | Status do serviço + estado da conexão MongoDB |
| GET    | `/config.js`                 | Configuração runtime (projectKey, storageType)|
| GET    | `/api/dashboard/:sprintId`   | Lê payload de uma sprint                      |
| PUT    | `/api/dashboard/:sprintId`   | Upsert (cria ou atualiza) uma sprint          |
| GET    | `/api/sprints`               | Lista todas as sprints (id, title, squad, updatedAt) |
| DELETE | `/api/dashboard/:sprintId`   | Remove uma sprint                             |
| GET    | `*`                          | Serve `public/index.html` (SPA fallback)      |

### Variáveis de Ambiente

| Variável          | Padrão    | Obrigatória |
|-------------------|-----------|-------------|
| `MONGODB_URI`     | —         | **Sim**     |
| `PORT`            | `3000`    | Não         |
| `QA_PROJECT_KEY`  | `android` | Não         |

### Como Iniciar

```bash
# Instalar dependências (inclui mongoose)
npm install

# Criar .env na raiz do projeto
echo "MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/qa_dashboard" > .env

# Iniciar o servidor MongoDB
node server_mongo.js
```

### Diferenças em Relação ao server.js

| Aspecto          | `server.js`              | `server_mongo.js`         |
|------------------|--------------------------|---------------------------|
| Storage          | JSON local ou Supabase   | MongoDB via Mongoose      |
| Multi-sprint     | Por chave de projeto     | Por sprint_id (document)  |
| Listagem         | Não suportado            | GET /api/sprints          |
| Delete           | Não suportado            | DELETE /api/dashboard/:id |
| Rota de config   | `storageType: 'local'`   | `storageType: 'mongodb'`  |

---

## 19. Guia de Manutenção por Funcionalidade

### 17.1 Adicionar Nova Aba ao Dashboard

1. **`index.html`**: Adicione `<button class="tab-btn" onclick="openTab('tab-N', this)">Label</button>` no `.tabs-nav`
2. **`index.html`**: Adicione `<div id="tab-N" class="tab-content"><!-- conteúdo --></div>`
3. **`view.js`**: Crie função `renderNovaAba()` e chame-a em `renderAll()`
4. **`controller.js`**: Adicione handlers de eventos específicos da nova aba

**Integração:** `renderAll()` → nova função de render → lê `state` → gera HTML

---

### 17.2 Adicionar Novo Campo a Bug

1. **`model.js`**: Adicione `if (b.novoCampo === undefined) b.novoCampo = '';` em `normalizeState()` dentro do `bugs.forEach`
2. **`view.js`**: Atualize o HTML do modal de bugs e a tabela de listagem em `renderBugsSection()`
3. **`controller.js`**: Atualize `saveBug()` para ler o novo campo do form
4. **MTTR** (se o campo afetar métricas): Atualize `renderMTTRSection()` em `view.js`

**Integração:** `normalizeState` garante compatibilidade retroativa → `saveBug()` persiste → `renderBugsSection()` exibe

---

### 17.3 Adicionar Novo Campo a Feature/Caso de Teste

1. **`model.js`**: Adicione campo em `DEFAULT_STATE.features[0]` e guard em `normalizeState()` no `features.forEach`
2. **`view.js`**: Atualize `renderFeaturesSection()` para exibir o campo
3. **`controller.js`**: Atualize handlers como `addFeature()`, `updateFeature()` se necessário
4. **Importação**: Se o campo pode vir via CSV/XLSX, atualize `_importFromCSV()` e `_importFromXLSX()` em `controller.js` — adicione mapeamento de coluna e keyword de detecção

**Integração:** `normalizeState` → `renderFeaturesSection()` → `saveState()` → `localStorage`

---

### 17.4 Adicionar Novo Filtro na Home

1. **`home_logic.js`**: Adicione campo em `_homeFilters`: `let _homeFilters = { squad: 'all', status: 'all', year: 'all', novoFiltro: 'all' }`
2. **`home_logic.js`**: No HTML do `filterBarEl` em `renderHomeScreen()`, adicione o `<select>` com `onchange="setHomeFilter('novoFiltro', this.value)"`
3. **`home_logic.js`**: Em `_renderFilteredCards()`, adicione a condição de filtro no `.filter()`
4. **`home_logic.js`**: Em `clearHomeFilters()`, inclua o novo campo no reset: `_homeFilters.novoFiltro = 'all'` e adicione o ID ao array de selects para reset

**Integração:** `setHomeFilter()` → `_renderFilteredCards()` (sem re-renderizar o filterBar)

---

### 17.5 Alterar Pesos do Health Score

Os pesos são configuráveis pelo usuário em runtime via painel de Configurações da sprint (campos `hs*`). Para alterar os **defaults**:

1. **`model.js`**: Edite `DEFAULT_STATE.config.hsCritical`, `hsHigh`, etc.
2. **`model.js`**: Atualize os guards em `normalizeState()` para refletir novos defaults

**Integração:** `state.config.hs*` → `renderHealthScore()` em `view.js` lê esses valores

---

### 17.6 Adicionar Nova Stack ao MTTR

1. **`view.js`** → `renderMTTRSection()`: Adicione a nova stack ao array de stacks que itera nas linhas da tabela
2. **`view.js`** → modal de bug: Adicione a opção ao `<select>` de Stack no formulário de bugs
3. **`model.js`**: O campo `bug.stack` é uma String livre — não requer alteração no modelo

**Integração:** O MTTR é calculado dinamicamente a partir dos dados; adicionar a stack ao select e à tabela é suficiente.

---

### 17.7 Adicionar Novo Formato de Importação

1. **`index.html`**: Atualize o atributo `accept` do `<input type="file" id="importFeatureFile">` para incluir a nova extensão
2. **`controller.js`**: Em `importFeature(event)`, adicione `else if (fileName.endsWith('.novaext'))` com o parser correspondente
3. **`controller.js`**: Implemente `_importFromNovoFormato(data)` com a mesma interface de saída: chama `_mergeImportedFeatures(featuresMap, featuresOrder)`

---

### 17.8 Trocar Backend de Supabase para Local (ou vice-versa)

```bash
# Para usar storage local:
export STORAGE_TYPE=local

# Para usar Supabase:
export STORAGE_TYPE=supabase
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

O servidor detecta a variável no startup e configura o cliente correto. **Não requer alteração de código.**

---

### 17.9 Alterar Duração Default da Sprint

1. **`model.js`**: Edite `DEFAULT_STATE.config.sprintDays` (atualmente 20)
2. **Importante:** A duração real é derivada de `startDate` e `endDate` quando ambos estão preenchidos. `sprintDays` é apenas fallback.

---

### 17.10 Manutenção do Drag & Drop de Sprints

O DnD usa o flag `container._dndBound` para evitar registro duplicado de listeners. Se `_renderFilteredCards()` é chamado múltiplas vezes, `initSprintDragDrop()` só registra os listeners **uma vez** por elemento container.

Se o DnD parar de funcionar:
1. Verifique se `#sprint-list` está presente no DOM quando `initSprintDragDrop()` é chamado
2. Confirme que o elemento de handle tem a classe `.dnd-handle` e está dentro de um `.sprint-card[data-sprint-id]`
3. O atributo `draggable="true"` deve estar no `.dnd-handle`, não no card

---

## 20. Dependências Externas

### CDNs (carregados em `index.html`)

| Biblioteca               | Versão  | Uso                                           | URL CDN                                                        |
|--------------------------|---------|-----------------------------------------------|----------------------------------------------------------------|
| Chart.js                 | latest  | Burndown, gráficos de bugs, radar             | `cdn.jsdelivr.net/npm/chart.js`                                |
| chartjs-plugin-datalabels| 2.0.0   | Labels nos gráficos de barras/pizza           | `cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0`         |
| html2canvas              | 1.4.1   | Screenshot do dashboard para exportação PNG   | `cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js` |
| SheetJS (xlsx)           | 0.20.3  | Leitura de arquivos .xlsx/.xls na importação  | `cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`   |
| jsPDF                    | 2.5.1   | Geração de PDF multi-página no browser        | `cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js` |
| Google Fonts (Inter)     | —       | Tipografia                                    | `fonts.googleapis.com`                                         |

> **Nota sobre jsPDF:** A fonte padrão Helvetica suporta apenas Latin-1 (ISO-8859-1). Caracteres Unicode fora desse range (emojis, `—`, `→`, `·`) devem ser substituídos antes de renderizar texto no PDF.

### Pacotes Node.js (`package.json`)

| Pacote                  | Uso                                          |
|-------------------------|----------------------------------------------|
| `express`               | Framework HTTP do servidor                   |
| `cors`                  | Habilita CORS para dev local                 |
| `@supabase/supabase-js` | Cliente Supabase (opcional, `server.js`)     |
| `mongoose`              | ODM MongoDB (obrigatório, `server_mongo.js`) |
| `dotenv`                | Carrega variáveis de `.env`                  |

---

*Documentação v2.1 — atualizada em 2026-03-15. Para contribuições ou correções, edite este arquivo em `documentacao/DOCUMENTACAO_TECNICA.md`.*
