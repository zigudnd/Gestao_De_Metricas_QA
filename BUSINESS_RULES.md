# Regras de Negocio — ToStatos QA Metrics Dashboard

> Documento vivo. Descreve todas as regras de negocio implementadas no sistema.
> Versao sincronizada com o estado atual do codigo-fonte.

---

## 1. Autenticacao e Usuarios

### 1.1 Login
- Autenticacao via Supabase Auth (email + senha).
- Sessao persistente com refresh automatico de token.
- Rota `/login` e publica; demais rotas exigem autenticacao via `ProtectedRoute`.

### 1.2 Criacao de Usuarios
- Novos usuarios sao criados exclusivamente pelo admin (via SquadsPage ou API `/api/admin/create-user`).
- Senha gerada automaticamente via `crypto.randomBytes` — nao ha mais senha hardcoded.
- Politica de senha: minimo 8 caracteres, pelo menos 1 maiuscula, 1 numero e 1 caractere especial.
- Flag `must_change_password` no metadata; troca obrigatoria no primeiro login via `/change-password`.

### 1.3 Roles Globais
| Role | Capacidades |
|------|------------|
| `admin` | Criar/editar/desativar usuarios, alterar roles, gerenciar todos os squads |
| `user` | Acesso normal, operacoes dentro dos squads vinculados |

### 1.4 Perfil
- Cada usuario tem um `Profile`: `id`, `email`, `display_name`, `global_role`, `active`.
- Perfil carregado automaticamente ao restaurar sessao (tabela `profiles`).
- Display name editavel via `/profile`.

### 1.5 Desativacao
- Admin pode desativar usuario via toggle `active`.
- Usuarios desativados nao sao removidos — apenas marcados como inativos.

---

## 2. Squads

### 2.1 Criacao
- Um squad requer **nome** obrigatorio.
- **Descricao** e **cor** sao opcionais (cor padrao: `#185FA5`).
- Criado via RPC `create_squad_with_lead` — o criador vira `qa_lead` automaticamente.

### 2.2 Roles dentro do Squad
| Role | Descricao |
|------|-----------|
| `qa_lead` | Lider do squad, gerencia membros e permissoes |
| `qa` | QA operacional, executa testes |
| `stakeholder` | Visualizacao e acompanhamento |

### 2.3 Permissoes Granulares
Cada membro tem permissoes individuais de exclusao:

| Permissao | Controla |
|-----------|---------|
| `delete_sprints` | Excluir sprints |
| `delete_bugs` | Excluir bugs |
| `delete_features` | Excluir funcionalidades |
| `delete_test_cases` | Excluir casos de teste |
| `delete_suites` | Excluir suites |
| `delete_blockers` | Excluir bloqueios |
| `delete_alignments` | Excluir alinhamentos |

**Padrao:** Todas as permissoes de exclusao sao `false` para novos membros.

### 2.4 Perfis de Permissao
- Templates reutilizaveis com nome, descricao e conjunto de permissoes.
- Perfis de sistema (`is_system: true`) nao podem ser excluidos.
- Admin pode criar/editar/excluir perfis customizados.
- Ao adicionar membro, pode-se aplicar um perfil existente.

### 2.5 Vinculacao com Sprints
- Sprints podem ser vinculadas a um squad via `squadId` no `SprintIndexEntry`.
- `squadId: null` indica sprint pessoal/legada (sem vinculo com squad).
- Home filtra sprints pelos squads do usuario logado (via `getMySquadIds()`).

---

## 3. Sprints

### 3.1 Criacao
- Uma sprint requer obrigatoriamente um **Titulo**.
- O campo **Squad** e opcional.
- O ID e gerado automaticamente: `sprint_<timestamp>`.
- Ao criar, a sprint e aberta imediatamente no dashboard.

### 3.2 Listagem e Ordenacao
- Sprints sao exibidas na ordem em que foram arrastadas (drag & drop manual).
- Sprints **favoritas** sao sempre exibidas antes das nao-favoritas na lista.
- O filtro de status "Favoritas" exibe apenas as marcadas como favoritas.

### 3.3 Favoritar
- Qualquer sprint pode ser marcada/desmarcada como favorita via botao no card.
- Favoritas recebem badge visual e aparecem no topo da lista.
- Flags de favorito sao locais — nao sincronizadas com Supabase.

### 3.4 Exclusao
- A exclusao de uma sprint requer confirmacao via modal.
- Ao excluir, os dados sao removidos do localStorage e do Supabase (operacao permanente).
- A entrada no Master Index local tambem e removida.
- Respeita permissao `delete_sprints` do membro no squad.

### 3.5 Tipos de Sprint
- Campo `sprintType` define o tipo: `'squad'` (padrao), `'regressivo'` ou `'integrado'`.
- Sprints do tipo `regressivo` ou `integrado` possuem campos adicionais `releaseId` e `releaseVersion` que vinculam a sprint a uma Release.
- O tipo determina o contexto de execucao: squads operam isolados, regressivos validam a release completa, integrados cobrem fluxos cross-squad.

### 3.6 Status Derivado
- **Em Andamento**: sprint com testes restantes ou sem testes cadastrados.
- **Concluida**: `totalExec >= totalTests` e `totalTests > 0`.

### 3.7 Conclusao e Reativacao
- `concludeSprint(id)` marca status como `concluida` no localStorage e Supabase.
- `reactivateSprint(id)` reverte para `ativa`.

---

## 4. Suites de Testes

### 4.1 Criacao e Gestao
- Uma suite deve ter um nome (renomeavel a qualquer momento).
- A suite pode ser excluida com confirmacao — **todas as funcionalidades vinculadas sao removidas junto**.
- Suites podem ser filtradas no topo do Dashboard de Resumo e na aba Testes.

### 4.2 Restricoes
- Nao ha limite de suites por sprint.
- Funcionalidades sao sempre vinculadas a uma unica suite (`suiteId`).

---

## 5. Funcionalidades

### 5.1 Status
| Status     | Regra de Transicao |
|------------|-------------------|
| Ativa      | Qualquer transicao sem modal |
| Bloqueada  | Exige modal obrigatorio com **Motivo do Bloqueio** (nao pode estar vazio) |
| Cancelada  | Exige modal com **Alinhamento Tecnico** (nao pode estar vazio). O texto e salvo como alinhamento na aba Alinhamentos com prefixo `[Cancelamento]` |

### 5.2 Cancelamento
- Ao cancelar uma funcionalidade, o sistema automaticamente cria um registro de Alinhamento no formato:
  `[Cancelamento] <nome da funcionalidade>: <texto informado>`
- O texto de justificativa e tambem salvo em `blockReason` da funcionalidade.

### 5.3 Reordenacao
- Funcionalidades dentro de uma suite podem ser reordenadas via drag & drop.
- A reordenacao e mantida dentro do escopo da suite (nao permite mover entre suites via drag).
- Store action: `reorderFeatures(suiteId, fromDomIdx, toDomIdx)`.

### 5.4 Calculo de Testes
- `tests = cases.length + manualTests`
- `exec` e calculado a partir de `gherkinExecs` (casos com executionDay preenchido) + `manualExecData`.

### 5.5 Importacao
- Funcionalidades podem ser importadas de arquivos `.feature` (Gherkin) ou `.csv`.
- Funcionalidades importadas sao **adicionadas** as existentes na suite (nao substituem).
- Casos de teste importados herdam `status: 'Pendente'` e `executionDay: ''`.
- Store action: `importFeatures(features)`.

---

## 6. Casos de Teste

### 6.1 Status e Transicoes
| Status     | Regra |
|------------|-------|
| Pendente   | Estado inicial padrao |
| Concluido  | Exige **data de execucao** via modal. A data e convertida em `D1`/`D2`/... |
| Falhou     | Aplica o status imediatamente e abre o **modal de cadastro de bug** pre-preenchido |
| Bloqueado  | Aplicado diretamente sem modal |

### 6.2 Pre-preenchimento no cadastro de bug via Falhou
- Campo **Descricao**: `"Falhou: <nome do caso de teste>"`
- Campo **Funcionalidade**: nome da funcionalidade pai

### 6.3 Data de Execucao
- A data de execucao deve estar entre a Data de Inicio e a Data de Fim da sprint.
- E convertida em `D1`/`D2`/... relativo ao `startDate`.
- Datas fora do intervalo da sprint sao rejeitadas silenciosamente (retornam `null` → `executionDay = ''`).

### 6.4 Gherkin
- Cada caso de teste possui campo `gherkin` para texto Gherkin completo.
- Preenchido automaticamente ao importar de `.feature`.

---

## 7. Bugs

### 7.1 Campos Obrigatorios para Criacao
- **Descricao** (nao pode estar vazio)
- **Data de Abertura**

### 7.2 Status e Transicoes
| Status | Regra |
|--------|-------|
| Aberto | Status inicial ao criar o bug |
| Em Andamento | Aplicado diretamente |
| Falhou | Aplicado diretamente **e incrementa automaticamente o contador de retestes** |
| Resolvido | Exige **data de resolucao** via modal |

### 7.3 ID do Bug
- Gerado automaticamente: `BUG-<6 ultimos digitos do timestamp>`.
- Editavel inline na tabela. A edicao e commitada ao pressionar `Enter` ou ao sair do campo (`blur`).
- Edicoes sao descartadas ao pressionar `Escape`.

### 7.4 Retestes
- Incrementado automaticamente ao setar status **Falhou** (evita trabalho manual do QA).
- Tambem editavel manualmente via campo numerico na tabela.
- Retestes excessivos penalizam o QA Health Score e aumentam o Indice de Retrabalho.

### 7.5 MTTR (Mean Time to Repair)
- Calculado apenas para bugs com status **Resolvido** e com `openedAt` e `resolvedAt` preenchidos.
- Formula: `(resolvedAt - openedAt)` em horas.
- MTTR Global = media de todos os MTTRs individuais da sprint.
- Calculado em `compareService.ts` (funcao `computeSprintKPIs`).

### 7.6 Responsavel (Assignee)
- Nome salvo em historico automatico (datalist HTML).
- Nomes de responsaveis usados anteriormente ficam disponiveis como sugestao em novos bugs.

### 7.7 Stack do Bug
- Stacks padrao: `Front`, `BFF`, `Back`, `Mobile`, `Infra`.
- O modal de cadastro de bug (`NewBugModal`) permite criar stacks customizadas inline via opcao "Nova stack..." no select.
- Stacks customizadas ficam disponiveis apenas durante a sessao do modal e sao re-derivadas a partir dos bugs existentes na sprint.

### 7.8 Categoria
- Campo opcional `category` para classificacao adicional do bug.

### 7.9 Ordenacao de Colunas
- A tabela de bugs suporta ordenacao clicavel em todas as colunas: ID, Descricao, Funcionalidade, Stack, Severidade, Status e Retestes.
- Indicadores visuais: (sem selecao), crescente, decrescente.
- Clicar na mesma coluna inverte a direcao; clicar em coluna diferente inicia ordem crescente.
- Sem ordenacao ativa, o comportamento padrao e: **Falhou** primeiro, **Resolvido** por ultimo.
- Severidade e ordenada por criticidade: Critica → Alta → Media → Baixa.
- Status e ordenado por urgencia: Falhou → Aberto → Em Andamento → Resolvido.

---

## 8. Blockers / Impedimentos

### 8.1 Campos
- **Data**: data do impedimento (qualquer data, nao restrita ao intervalo da sprint)
- **Motivo**: texto livre com sugestoes pre-definidas via datalist
- **Horas**: numero de horas produtivas perdidas (minimo 0)

### 8.2 Totalizador
- **Total bloqueado** = soma de todas as horas de todos os blockers da sprint.
- Exibido no KPI "Horas Bloqueadas" e no rodape da tabela.

---

## 9. Notas

### 9.1 Notas Operacionais
- Campo de texto livre disponivel na aba **Notas**, acima das demais secoes.
- Ocupa a largura total da tela — ideal para digitacao continua.
- Uso recomendado: massas de dados, cenarios manuais, anotacoes diarias, links uteis, comandos de teste.
- Fonte monoespadaca para facilitar leitura de dados estruturados.
- Altura minima de 10 linhas; expansivel verticalmente pelo usuario (`resize: vertical`).
- Persistido em `state.notes.operationalNotes`.

### 9.2 Premissas do Ciclo de Testes
- Texto livre para registrar premissas acordadas para o ciclo de testes.
- Exibido em leitura na aba Overview (secao Premissas e Plano de Acao).
- Persistido em `state.notes.premises`.

### 9.3 Plano de Acao
- Texto livre para descrever riscos, gatilhos e acoes corretivas.
- Exibido em leitura na aba Overview ao lado das Premissas.
- Persistido em `state.notes.actionPlan`.

### 9.4 Layout da Aba Notas
- Notas Operacionais: largura total, acima.
- Premissas e Plano de Acao: grid de 2 colunas iguais, abaixo.

---

## 10. Alinhamentos Tecnicos

### 10.1 Criacao
- Manual: botao "+ Adicionar Alinhamento" na aba Alinhamentos
- Automatica: ao cancelar uma funcionalidade (prefixo `[Cancelamento]`)

### 10.2 Edicao
- Texto editavel diretamente no card do alinhamento.

---

## 11. QA Health Score

### 11.1 Formula Base
```
healthScore = max(0, 100 - penalidades)
```

### 11.2 Penalidades (configuraveis)
| Fator | Penalidade |
|-------|-----------|
| Bugs Criticos (nao resolvidos) | `count x peso_critico` |
| Bugs Alta (nao resolvidos) | `count x peso_alta` |
| Bugs Media (nao resolvidos) | `count x peso_media` |
| Bugs Baixa (nao resolvidos) | `count x peso_baixa` |
| Total Retestes (todos os bugs) | `count x peso_reteste` |
| Funcionalidades Bloqueadas | `count x peso_blocked` |
| Atraso (casos) | `atrasoCasos x peso_delayed` |

**Nota:** Penalidade de bugs por severidade aplica-se apenas a bugs **nao resolvidos**. Retestes penalizam independente do status.

### 11.3 Interpretacao
| Range | Status |
|-------|--------|
| >= 90% | Excelente |
| 70-89% | Atencao |
| < 70% | Critico |

---

## 12. Defeitos Prevenidos e Impacto Prevenido

### 12.1 Defeitos Prevenidos
- Contagem total de todos os bugs registrados na sprint, independentemente do status.
- Representa o volume bruto de defeitos interceptados pelo QA antes de chegarem a producao.
- Exibido em verde no dashboard de resumo.

### 12.2 Impacto Prevenido
- Score ponderado que pondera cada bug pelo seu nivel de criticidade.
- **Formula:** `soma(peso_severidade x qtd_bugs_daquela_severidade)`
- Pesos padrao: Critica = 10, Alta = 5, Media = 3, Baixa = 1.
- Pesos configuraveis individualmente na aba Configuracoes, secao "Impacto Prevenido — Pesos por Severidade".
- Campos de configuracao: `psCritical`, `psHigh`, `psMedium`, `psLow`.

### 12.3 Indice de Retrabalho
- Mede a proporcao de esforco de revalidacao em relacao ao esforco total de bugs.
- **Formula:** `totalRetests / (totalBugs + totalRetests) x 100`
- O denominador inclui retestes para evitar inflacao artificial quando nao ha bugs.
- Faixas de interpretacao:
  | Faixa | Classificacao | Cor |
  |-------|--------------|-----|
  | 0-10% | Excelente | Verde |
  | 10-20% | Normal | Amarelo |
  | 20-35% | Atencao | Laranja |
  | 35%+ | Critico | Vermelho |

### 12.4 Capacidade Real
Trio de KPIs que expoe o impacto real dos bloqueios sobre o escopo executavel.

#### Testes Comprometidos
- Soma de `feature.tests` de features com `status === 'Bloqueada'` **mais** casos individuais com `status === 'Bloqueado'` em features ativas.
- Exibido em vermelho quando > 0, neutro quando = 0.

#### Testes Executaveis
- **Formula:** `totalTests - testesComprometidos`
- Representa o universo de testes que podem ser executados agora.

#### Capacidade Real
- **Formula:** `Math.round((testesExecutaveis / totalTests) x 100)`. Se `totalTests === 0`, exibe 0%.
- Interpretacao por cor:
  | Faixa | Cor |
  |-------|-----|
  | >= 90% | Verde |
  | 70-89% | Amarelo |
  | < 70% | Vermelho |

---

## 13. Configuracao de Dias da Sprint

### 13.1 Fins de Semana
- Por padrao, fins de semana sao **excluidos** do calculo de dias uteis da sprint (`excludeWeekends: true`).
- O usuario pode incluir fins de semana marcando a opcao "Incluir fins de semana na duracao" na aba Configuracoes.
- Impacta: calculo de dias totais, labels do Burndown Chart, conversao de datas em `D1`/`D2`/... nos casos de teste.
- Helpers exportados de `persistence.ts`: `countSprintDays`, `sprintDayToDate`, `dateToSprintDayKey`.

### 13.2 Campos de Configuracao da Sprint
- **Titulo**: nome da sprint
- **Squad**: nome do squad (texto livre)
- **QA Name**: nome do QA responsavel
- **Target Version**: versao alvo da sprint
- **Start Date / End Date**: periodo da sprint
- **Exclude Weekends**: toggle para fins de semana

---

## 14. Burndown Chart

### 14.1 Linha Ideal
- Parte do total de testes executaveis no `D0` (inicio) e chega a 0 no ultimo dia da sprint.
- Calculada linearmente: `testesExecutaveis - (testesExecutaveis / sprintDays x dia)`.

### 14.2 Linha Real
- Mostra os testes restantes ao final de cada dia.
- Calculada acumulando as execucoes por dia (`execution[D1]`, `execution[D2]`, ...).
- Pontos em **vermelho** indicam dias dentro do prazo sem nenhuma execucao registrada.
- Dias futuros nao sao plotados (aparecem como `null` → linha interrompida).

### 14.3 Exibicao de Dias
- Todos os dias da sprint sao exibidos (sem autoSkip/maxTicksLimit).

---

## 15. Persistencia de Dados

### 15.1 Armazenamento Local
- Estado completo de cada sprint: `localStorage["qaDashboardData_<sprintId>"]`
- Indice mestre de sprints: `localStorage["qaDashboardMasterIndex"]`
- Campos calculados (`tests`, `exec`, `gherkinExecs`) sao recalculados via `computeFields` a cada `_commit`.

### 15.2 Sincronizacao Remota (Supabase)
- Ativada quando variaveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estao definidas.
- Tabela `sprints`: `id (text PK)`, `data (jsonb)`, `status (text)`, `updated_at (timestamptz)`.
- Realtime via WebSocket para co-edicao.
- Nao impede o funcionamento local em caso de falha do Supabase.

### 15.3 Ciclo de Save
```
updateField → _commit → computeFields → saveToStorage → upsertMasterIndex → queueRemotePersist → set({ state, lastSaved })
```
- `lastSaved` atualizado a cada `_commit`, triggering o `SaveToast` por 2 segundos.

---

## 16. Importacao de Casos de Teste

### 16.1 Formatos Suportados
| Formato | Regra |
|---------|-------|
| `.feature` | Parser de Gherkin — extrai Features e Scenarios/Scenario Outline |
| `.csv` | Formato: `Funcionalidade,Cenario,Complexidade,Gherkin` |
| `.json` | Importa backup completo como nova sprint |

### 16.2 Comportamento
- Funcionalidades importadas sao **adicionadas** as existentes na suite (nao substituem).
- Casos de teste importados herdam `status: 'Pendente'` e `executionDay: ''`.

---

## 17. Layout da Aba Overview

### 17.1 Secao Superior — Hierarquia Visual
A aba Overview exibe os indicadores em camadas de prioridade decrescente:

| Camada | Componente | Conteudo |
|--------|-----------|----------|
| 1 | **Status Bar** | Badge "EM ATRASO" (quando aplicavel) . nome da sprint . atraso % e casos . pills de suites |
| 2 | **Faixas Qualitativas** | MTTR Global . Indice de Retrabalho (com dot colorido e classificacao) |
| 3 | **Hero Cards** (4 colunas) | QA Health Score . Testes Executaveis . Bugs Abertos . Capacidade Real |
| 4 | **Alert Strips** (2 colunas) | Defeitos Prevenidos (verde) . Testes Bloqueados (vermelho) |
| 5 | **KPI Cards** (4 colunas) | Total de Testes . Executados . Meta por Dia . Horas Bloqueadas |

### 17.2 Hero Cards
- Fonte de valor: 32px (padrao) ou 40px (Bugs Abertos quando > 0).
- Barra de cor (3px) na base indica status: verde (#639922), amarelo (#BA7517), vermelho (#E24B4A).
- Bugs Abertos com fundo vermelho suave e borda 1.5px quando ha bugs abertos.

### 17.3 Alert Strips
- **Defeitos Prevenidos** (esquerda, #EAF3DE): total de bugs registrados + impacto prevenido em pts.
- **Testes Bloqueados** (direita, #FCEBEB): testes comprometidos por funcionalidades bloqueadas.

### 17.4 Faixas Qualitativas
- Dot colorido + valor + descricao interpretativa.
- MTTR: dot roxo (#8b5cf6).
- Indice de Retrabalho: dot na cor da faixa (verde/amarelo/laranja/vermelho).

---

## 18. Releases

### 18.1 Ciclo de Vida
Uma release segue o ciclo de status:
`planejada → em_desenvolvimento → corte → em_homologacao → em_regressivo → aprovada → em_producao → concluida`

Cada transicao de status registra timestamp e motivo (reason) para rastreabilidade.

### 18.2 Pipeline de 5 Fases
| Fase | Descricao |
|------|-----------|
| **Corte** | Congelamento de escopo; define quais features entram na release |
| **Geracao** | Build e empacotamento da versao candidata |
| **Homologacao** | Testes de aceitacao e validacao funcional |
| **Beta** | Rollout parcial para grupo restrito |
| **Producao** | Rollout gradual ate 100% dos usuarios |

### 18.3 Rollout Tracking
- Percentual de rollout acompanhado em steps pre-definidos: `0, 1, 2, 3, 5, 10, 20, 40, 60, 80, 100`.
- Cada step e registrado com timestamp para historico de progressao.

### 18.4 Checkpoint Dashboard
- Painel centralizado para monitoramento de releases ativas.
- Exibe status atual, fase do pipeline, percentual de rollout e metricas agregadas.

### 18.5 Areas de Teste por Squad
- Dentro de uma release, cada squad possui suas proprias areas de teste.
- Permite acompanhamento granular de cobertura e progresso por squad.

### 18.6 Metricas da Release
| Metrica | Descricao |
|---------|-----------|
| `totalTests` | Total de testes planejados na release |
| `executedTests` | Testes executados ate o momento |
| `passedTests` | Testes aprovados |
| `failedTests` | Testes reprovados |
| `coveragePct` | Percentual de cobertura (`executedTests / totalTests x 100`) |
| `passPct` | Percentual de aprovacao (`passedTests / executedTests x 100`) |

### 18.7 Calendario de Releases
- Slots de calendario para agendamento de releases.
- Permite visualizar conflitos e planejar janelas de deploy.

---

## 19. Status Report (enhancements)

### 19.1 Multi-Report
- Suporte a multiplos reports por squad/periodo.
- Operacoes: criar, listar, duplicar, migrar, concluir e favoritar reports.
- Reports favoritos aparecem em destaque na listagem.

### 19.2 Secoes Dinamicas
- Secoes sao customizaveis — nao limitadas aos 6 tipos padrao.
- O usuario pode criar, renomear e reordenar secoes livremente.

### 19.3 Periodo como Date Range
- Campo de periodo substituido por `periodStart` e `periodEnd` (datas concretas).
- Substitui o campo de texto livre anterior por intervalo de datas preciso.

### 19.4 Combinados do Time
- Secao dedicada para registrar cerimonias, acordos do time, DOR (Definition of Ready) e DOD (Definition of Done).
- Persistido como parte da configuracao do report.

### 19.5 Time e Calendario
- Lista de membros do time vinculados ao report.
- Tracking de ausencias e folgas (time off) por membro.
- Permite visualizar disponibilidade do time durante o periodo do report.

### 19.6 Configuracao de Squad
- Configuracao de squad persistida no report.
- Inclui membros, roles e preferencias que sobrevivem entre sessoes.

---

## 20. Audit Trail

### 20.1 Tabela `audit_logs`
- Registra acoes de usuarios no sistema para rastreabilidade completa.
- Campos: `id`, `user_id`, `action`, `entity_type`, `entity_id`, `metadata`, `created_at`.

### 20.2 Registro via RPC
- Acoes sao logadas via funcao RPC `audit_action()` com `SECURITY DEFINER`.
- Garante que o log e gravado independente das politicas RLS do usuario.

### 20.3 Acoes Rastreadas
| Entidade | Acoes |
|----------|-------|
| `sprints` | create, update, delete |
| `status_reports` | create, update, delete |

---

## 21. Seguranca

### 21.1 Rate Limiting
| Escopo | Limite |
|--------|--------|
| Geral | 100 requisicoes/minuto |
| Endpoints admin | 10 requisicoes/minuto |
| Flush (sendBeacon) | 30 requisicoes/minuto |

### 21.2 CORS
- Origens permitidas configuradas via variavel de ambiente `CORS_ORIGINS`.
- Em desenvolvimento, aceita `localhost` por padrao.

### 21.3 Politica de Senhas
- Minimo 8 caracteres.
- Pelo menos 1 letra maiuscula.
- Pelo menos 1 numero.
- Pelo menos 1 caractere especial.
- Senhas geradas automaticamente via `crypto.randomBytes` — sem valores hardcoded.

### 21.4 Crash Recovery
- Evento `beforeunload` dispara `navigator.sendBeacon` para flush de dados pendentes.
- Garante que alteracoes nao salvas sejam persistidas mesmo em caso de fechamento inesperado do browser.

---

*Ultima atualizacao: Marco 2026*
