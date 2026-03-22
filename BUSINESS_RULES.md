# Regras de Negócio — ToStatos QA Metrics Dashboard

> Documento vivo. Descreve todas as regras de negócio implementadas no sistema.
> Versão sincronizada com o estado atual do código-fonte.

---

## 1. Sprints

### 1.1 Criação
- Uma sprint requer obrigatoriamente um **Título**.
- O campo **Squad** é opcional.
- O ID é gerado automaticamente: `sprint_<timestamp>`.
- Ao criar, a sprint é aberta imediatamente no dashboard.

### 1.2 Listagem e Ordenação
- Sprints são exibidas na ordem em que foram arrastadas (drag & drop manual).
- Sprints **favoritas** são sempre exibidas antes das não-favoritas na lista.
- O filtro de status "Favoritas" exibe apenas as marcadas como favoritas.

### 1.3 Favoritar
- Qualquer sprint pode ser marcada/desmarcada como favorita via botão ⭐ no card.
- Favoritas recebem badge visual e aparecem no topo da lista.

### 1.4 Exclusão
- A exclusão de uma sprint requer confirmação via modal.
- Ao excluir, todos os dados da sprint são removidos permanentemente do localStorage.
- A entrada no Master Index também é removida.

### 1.5 Status Derivado
- **Em Andamento**: sprint com testes restantes ou sem testes cadastrados.
- **Concluída**: `totalExec >= totalTests` e `totalTests > 0`.

---

## 2. Suites de Testes

### 2.1 Criação e Gestão
- Uma suite deve ter um nome (renomeável a qualquer momento).
- A suite pode ser excluída com confirmação — **todas as funcionalidades vinculadas são removidas junto**.
- Suites podem ser filtradas no topo do Dashboard de Resumo e na aba Testes.

### 2.2 Restrições
- Não há limite de suites por sprint.
- Funcionalidades são sempre vinculadas a uma única suite (`suiteId`).

---

## 3. Funcionalidades

### 3.1 Status
| Status     | Regra de Transição |
|------------|-------------------|
| Ativa      | Qualquer transição sem modal |
| Bloqueada  | Exige modal obrigatório com **Motivo do Bloqueio** (não pode estar vazio) |
| Cancelada  | Exige modal com **Alinhamento Técnico** (não pode estar vazio). O texto é salvo como alinhamento na aba Alinhamentos com prefixo `[Cancelamento]` |

### 3.2 Cancelamento
- Ao cancelar uma funcionalidade, o sistema automaticamente cria um registro de Alinhamento no formato:
  `[Cancelamento] <nome da funcionalidade>: <texto informado>`
- O texto de justificativa é também salvo em `blockReason` da funcionalidade.

### 3.3 Reordenação
- Funcionalidades dentro de uma suite podem ser reordenadas via drag & drop.
- A reordenação é mantida dentro do escopo da suite (não permite mover entre suites via drag).

### 3.4 Cálculo de Testes
- `tests = cases.length + manualTests`
- `exec` é calculado a partir de `gherkinExecs` (casos com executionDay preenchido) + `manualExecData`.

---

## 4. Casos de Teste

### 4.1 Status e Transições
| Status     | Regra |
|------------|-------|
| Pendente   | Estado inicial padrão |
| Concluído  | Exige **data de execução** via modal. A data é convertida em `D1`/`D2`/... |
| Falhou     | Aplica o status imediatamente e abre o **modal de cadastro de bug** pré-preenchido |
| Bloqueado  | Aplicado diretamente sem modal |

### 4.2 Pré-preenchimento no cadastro de bug via Falhou
- Campo **Descrição**: `"Falhou: <nome do caso de teste>"`
- Campo **Funcionalidade**: nome da funcionalidade pai

### 4.3 Data de Execução
- A data de execução deve estar entre a Data de Início e a Data de Fim da sprint.
- É convertida em `D1`/`D2`/... relativo ao `startDate`.
- Datas fora do intervalo da sprint são rejeitadas silenciosamente (retornam `null` → `executionDay = ''`).

---

## 5. Bugs

### 5.1 Campos Obrigatórios para Criação
- **Descrição** (não pode estar vazio)
- **Data de Abertura**

### 5.2 Status e Transições
| Transição | Regra |
|-----------|-------|
| Qualquer → Resolvido | Exige **data de resolução** via modal |
| Outras transições | Aplicadas diretamente |

### 5.3 ID do Bug
- Gerado automaticamente: `BUG-<6 últimos dígitos do timestamp>`.
- Editável inline na tabela. A edição é commitada ao pressionar `Enter` ou ao sair do campo (`blur`).
- Edições são descartadas ao pressionar `Escape`.

### 5.4 Retestes
- Contagem manual incrementável por botão `+`.
- Retestes excessivos penalizam o QA Health Score.

### 5.5 MTTR (Mean Time to Repair)
- Calculado apenas para bugs com status **Resolvido** e com `openedAt` e `resolvedAt` preenchidos.
- Fórmula: `(resolvedAt - openedAt)` em dias (inteiro, mínimo 0).
- MTTR Global = média de todos os MTTRs individuais da sprint.

### 5.6 Responsável (Assignee)
- Nome salvo em histórico automático (datalist HTML).
- Nomes de responsáveis usados anteriormente ficam disponíveis como sugestão em novos bugs.

### 5.7 Stack do Bug
- Stacks padrão: `Front`, `BFF`, `Back`, `Mobile`, `Infra`.
- O modal de cadastro de bug (`NewBugModal`) permite criar stacks customizadas inline via opção "➕ Nova stack…" no select.
- Stacks customizadas ficam disponíveis apenas durante a sessão do modal e são re-derivadas a partir dos bugs existentes na sprint.

---

## 6. Blockers / Impedimentos

### 6.1 Campos
- **Data**: data do impedimento (qualquer data, não restrita ao intervalo da sprint)
- **Motivo**: texto livre com sugestões pré-definidas via datalist
- **Horas**: número de horas produtivas perdidas (mínimo 0)

### 6.2 Totalizador
- **Total bloqueado** = soma de todas as horas de todos os blockers da sprint.
- Exibido no KPI "Horas Bloqueadas" e no rodapé da tabela.

---

## 7. Alinhamentos Técnicos

### 7.1 Criação
- Manual: botão "+ Adicionar Alinhamento" na aba Alinhamentos
- Automática: ao cancelar uma funcionalidade (prefixo `[Cancelamento]`)

### 7.2 Edição
- Texto editável diretamente no card do alinhamento.

---

## 8. QA Health Score

### 8.1 Fórmula Base
```
healthScore = max(0, 100 - penalidades)
```

### 8.2 Penalidades (configuráveis)
| Fator | Penalidade |
|-------|-----------|
| Bugs Críticos | `count × peso_critico` |
| Bugs Alta | `count × peso_alta` |
| Bugs Média | `count × peso_media` |
| Bugs Baixa | `count × peso_baixa` |
| Total Retestes | `count × peso_reteste` |
| Funcionalidades Bloqueadas | `count × peso_blocked` |
| Atraso (%) | `atrasoPercent × peso_delayed / 10` |

### 8.3 Interpretação
| Range | Status |
|-------|--------|
| ≥ 90% | Excelente |
| 70–89% | Atenção |
| < 70% | Crítico |

---

## 9. Defeitos Prevenidos e Impacto Prevenido

### 9.1 Defeitos Prevenidos
- Contagem total de todos os bugs registrados na sprint, independentemente do status (Aberto, Em Andamento ou Resolvido).
- Representa o volume bruto de defeitos interceptados pelo QA antes de chegarem à produção.
- Exibido em verde no dashboard de resumo.

### 9.2 Impacto Prevenido
- Score ponderado que pondera cada bug pelo seu nível de criticidade.
- **Fórmula:** `Σ (peso_severidade × qtd_bugs_daquela_severidade)`
- Pesos padrão: Crítica = 10, Alta = 5, Média = 3, Baixa = 1.
- Pesos configuráveis individualmente na aba Configurações, seção "Impacto Prevenido — Pesos por Severidade".
- Campos de configuração: `psCritical`, `psHigh`, `psMedium`, `psLow`.
- Exibido em verde no dashboard de resumo.

---

## 10. Configuração de Dias da Sprint

### 10.1 Fins de Semana
- Por padrão, fins de semana são **excluídos** do cálculo de dias úteis da sprint (`excludeWeekends: true`).
- O usuário pode incluir fins de semana marcando a opção "Incluir fins de semana na duração" na aba Configurações.
- Impacta: cálculo de dias totais, labels do Burndown Chart, conversão de datas em `D1`/`D2`/... nos casos de teste.
- Helpers exportados de `persistence.ts`: `countSprintDays`, `sprintDayToDate`, `dateToSprintDayKey`.

---

## 11. Burndown Chart

### 9.1 Linha Ideal
- Parte do total de testes no `D0` (início) e chega a 0 no último dia da sprint.
- Calculada linearmente: `totalTests - (totalTests / sprintDays × dia)`.

### 9.2 Linha Real
- Mostra os testes restantes ao final de cada dia.
- Calculada acumulando as execuções por dia (`execution[D1]`, `execution[D2]`, ...).
- Pontos em **vermelho** indicam dias dentro do prazo sem nenhuma execução registrada.
- Dias futuros não são plotados (aparecem como `null` → linha interrompida).

### 9.3 Exibição de Dias
- Todos os dias da sprint são exibidos (sem autoSkip/maxTicksLimit).

---

## 12. Persistência de Dados

### 10.1 Armazenamento Local
- Estado completo de cada sprint: `localStorage["qaDashboardData_<sprintId>"]`
- Índice mestre de sprints: `localStorage["qaDashboardMasterIndex"]`
- Campos calculados (`tests`, `exec`, `gherkinExecs`) são recalculados via `computeFields` a cada `_commit`.

### 10.2 Sincronização Remota (Opcional)
- Disponível via API REST (`/api/dashboard/:sprintId`).
- Ativada quando o servidor Node.js/Express está rodando.
- Não impede o funcionamento local em caso de falha da API.

### 10.3 Ciclo de Save
```
updateField → _commit → computeFields → saveToStorage → upsertMasterIndex → set({ state, lastSaved })
```
- `lastSaved` atualizado a cada `_commit`, triggering o `SaveToast` por 2 segundos.

---

## 13. Importação de Casos de Teste

### 11.1 Formatos Suportados
| Formato | Regra |
|---------|-------|
| `.feature` | Parser de Gherkin — extrai Features e Scenarios/Scenario Outline |
| `.csv` | Formato: `feature;scenario;complexity;status` |
| `.xlsx` / `.xls` | Mesma estrutura do CSV, via SheetJS |

### 11.2 Comportamento
- Funcionalidades importadas são **adicionadas** às existentes na suite (não substituem).
- Casos de teste importados herdam `status: 'Pendente'` e `executionDay: ''`.

---

*Última atualização: Março 2026*
