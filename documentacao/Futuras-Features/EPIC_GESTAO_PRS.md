# ÉPICO: Gestão de PRs no Módulo Releases

**Objetivo:** Substituir a planilha manual de cadastro de PRs na etapa de corte por um fluxo integrado dentro do módulo Releases do ToStatos, dando visibilidade para Mobile Foundation, rastreabilidade de squads por release e vínculo com testes integrados.

**Personas impactadas:**
- **Dev** — cadastra PRs vinculados à release em corte
- **Mobile Foundation** — analisa e aprova/rejeita PRs cadastrados
- **SM / QA Lead** — cobra cadastro de testes integrados dos squads que subiram PRs

**Prazo estimado:** 3 sprints
**Status:** Planejado
**Módulo:** Releases (extensão)

---

## Contexto e Problema

Hoje o fluxo de corte de release funciona assim:

1. A release entra em etapa de corte com uma data limite definida.
2. Os devs cadastram seus PRs numa **planilha externa** (Excel/Google Sheets) até a data de corte.
3. A equipe de **Mobile Foundation** analisa a planilha para verificar se todos os PRs estão em conformidade.
4. A mesma planilha serve como base para **identificar quais squads participaram da release**.
5. Com base nos squads que subiram PRs, SM/QA **cobra o cadastro de testes integrados** (que é feito em outro fluxo, mas precisa ser vinculado ao PR).

**Problemas identificados:**

1. A planilha não tem controle de versão, auditoria ou histórico de alterações.
2. Não existe notificação automática — a cobrança de testes integrados é manual.
3. Mobile Foundation precisa abrir uma planilha externa para analisar, sem filtros avançados ou status por PR.
4. Não há rastreabilidade de quem cadastrou o quê e quando.
5. O vínculo entre PR e testes integrados é informal (cobrança verbal ou via mensagem).

---

## Histórias filhas

| ID | História | Pontos | Prioridade | Sprint | Status |
|----|----------|--------|------------|--------|--------|
| STORY-01 | Cadastro de PR na release em corte | 5 | 🔴 Alta | Sprint 1 | A fazer |
| STORY-02 | Listagem e filtros de PRs por release | 3 | 🔴 Alta | Sprint 1 | A fazer |
| STORY-03 | Análise e aprovação de PRs pela Foundation | 5 | 🔴 Alta | Sprint 1 | A fazer |
| STORY-04 | Visão de squads participantes por release | 3 | 🟡 Média | Sprint 2 | A fazer |
| STORY-05 | Vínculo de PR com testes integrados | 5 | 🔴 Alta | Sprint 2 | A fazer |
| STORY-06 | Alertas e cobrança automática de testes integrados | 5 | 🟡 Média | Sprint 2 | A fazer |
| STORY-07 | Dashboard de conformidade da release | 3 | 🟡 Média | Sprint 3 | A fazer |
| STORY-08 | Histórico e auditoria de PRs por release | 2 | 🔵 Baixa | Sprint 3 | A fazer |

**Total de pontos:** 31
**Velocity necessária:** ~11 pts/sprint
**Sprints necessários:** 3

---

## Histórias de Usuário

---

### [STORY-01] Cadastro de PR na release em corte

**Como** Dev
**Quero** cadastrar meu PR dentro da release que está em etapa de corte
**Para** que a equipe de Mobile Foundation saiba o que estou subindo e possa analisar antes do merge

**Contexto:**
> Hoje o dev preenche uma planilha externa com dados do PR. Não há validação, e o dev pode cadastrar fora do prazo sem nenhum bloqueio. A feature precisa estar disponível como uma nova aba ou seção dentro da tela de detalhes da release.

**Critérios de aceite:**

- [ ] **CA01** — Dado que a release está em etapa de corte, quando o dev acessa a tela da release, então ele vê um botão "Cadastrar PR" habilitado.
- [ ] **CA02** — Dado que o dev clica em "Cadastrar PR", quando preenche os campos obrigatórios (link do PR, repositório, squad, descrição breve, tipo de mudança), então o PR é salvo vinculado à release e ao squad do dev.
- [ ] **CA03** — Dado que a data de corte já passou, quando o dev tenta cadastrar um PR, então o sistema exibe mensagem "Prazo de cadastro encerrado para esta release" e bloqueia o cadastro.
- [ ] **CA04** — Dado que o dev já cadastrou um PR, quando ele acessa a lista, então pode editar ou remover o PR enquanto a release estiver em corte.
- [ ] **CA05** — Dado que nenhum PR foi cadastrado ainda, quando o dev acessa a seção de PRs da release, então vê um empty state com a mensagem "Nenhum PR cadastrado. Cadastre seus PRs até [data de corte]."

**Critérios de não-aceite (out of scope):**
- Não inclui integração direta com GitHub/Azure DevOps para puxar PRs automaticamente (futuro)
- Não altera o fluxo de criação de releases existente

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo os CAs críticos (CA01, CA02, CA03)
- [ ] Teste de aceitação executado pelo QA
- [ ] Sem regressão no módulo Releases
- [ ] RLS policy configurada para que o dev só edite/remova seus próprios PRs

**Story Points:** 5
**Prioridade:** 🔴 Alta
**Dependências:** Nenhuma
**Time estimado:** 3 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `PRRegistrationForm` com campos: link do PR, repositório (select), squad (auto-preenchido pelo perfil), descrição, tipo de mudança (feature/fix/refactor/hotfix)
- [ ] `[Frontend]` Adicionar seção/aba "PRs" na página de detalhes da release
- [ ] `[Backend]` Criar tabela `release_prs` com FK para `releases` e `squads`
- [ ] `[Backend]` Criar endpoints: POST /releases/:id/prs, PUT /releases/:id/prs/:prId, DELETE /releases/:id/prs/:prId
- [ ] `[Backend]` Implementar validação de data de corte no endpoint POST
- [ ] `[Backend]` Criar RLS policy: dev só edita/remove seus próprios PRs
- [ ] `[QA]` Escrever cenários BDD para cadastro dentro e fora do prazo

---

### [STORY-02] Listagem e filtros de PRs por release

**Como** membro da equipe de Mobile Foundation
**Quero** visualizar todos os PRs cadastrados em uma release com filtros por squad, status e tipo
**Para** analisar rapidamente o que está entrando na release sem precisar abrir uma planilha externa

**Contexto:**
> A Foundation hoje abre uma planilha e filtra manualmente. Precisa de uma tabela com filtros rápidos e exportação para os casos em que ainda precisem compartilhar externamente.

**Critérios de aceite:**

- [ ] **CA01** — Dado que existem PRs cadastrados na release, quando o usuário acessa a aba de PRs, então vê uma tabela com colunas: Squad, Dev, Link do PR, Repositório, Tipo, Status (Pendente/Aprovado/Rejeitado), Data de cadastro.
- [ ] **CA02** — Dado que o usuário aplica filtro por squad, quando seleciona um squad específico, então a tabela mostra apenas os PRs daquele squad.
- [ ] **CA03** — Dado que o usuário aplica filtro por status, quando seleciona "Pendente", então vê apenas PRs ainda não analisados.
- [ ] **CA04** — Dado que o usuário quer exportar, quando clica em "Exportar", então baixa um CSV com os dados filtrados.
- [ ] **CA05** — Dado que nenhum PR foi cadastrado, quando o usuário acessa a aba, então vê empty state "Nenhum PR cadastrado nesta release."

**Critérios de não-aceite (out of scope):**
- Não inclui busca textual por conteúdo do PR (apenas filtros por coluna)

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo filtros e empty state
- [ ] Teste de aceitação executado pelo QA
- [ ] Sem regressão no módulo Releases

**Story Points:** 3
**Prioridade:** 🔴 Alta
**Dependências:** STORY-01
**Time estimado:** 2 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `PRListTable` com colunas configuráveis e filtros por Squad, Status, Tipo
- [ ] `[Frontend]` Implementar exportação CSV client-side
- [ ] `[Backend]` Criar endpoint GET /releases/:id/prs com query params de filtro
- [ ] `[QA]` Validar filtros combinados e exportação CSV

---

### [STORY-03] Análise e aprovação de PRs pela Foundation

**Como** membro da equipe de Mobile Foundation
**Quero** aprovar ou rejeitar cada PR cadastrado na release, com possibilidade de adicionar observação
**Para** que os devs saibam se o PR está em conformidade e o que precisa ser corrigido

**Contexto:**
> Hoje a análise é feita visualmente na planilha, sem registro formal de quem aprovou o quê. A Foundation precisa de um fluxo com status claro e rastreabilidade.

**Critérios de aceite:**

- [ ] **CA01** — Dado que um PR está com status "Pendente", quando o membro da Foundation clica em "Analisar", então vê os detalhes do PR e botões "Aprovar" e "Rejeitar".
- [ ] **CA02** — Dado que o Foundation clica em "Aprovar", quando confirma, então o status muda para "Aprovado", registrando quem aprovou e quando.
- [ ] **CA03** — Dado que o Foundation clica em "Rejeitar", quando preenche o campo obrigatório de observação e confirma, então o status muda para "Rejeitado" com a observação visível para o dev.
- [ ] **CA04** — Dado que um PR foi rejeitado, quando o dev corrige e edita o PR, então o status volta para "Pendente" automaticamente para nova análise.
- [ ] **CA05** — Dado que um usuário sem perfil de Foundation tenta aprovar/rejeitar, então os botões de ação não aparecem (controle por role).

**Critérios de não-aceite (out of scope):**
- Não inclui notificação push ou por e-mail ao dev quando o PR é rejeitado (coberto na STORY-06)
- Não inclui fluxo de aprovação em lote (um PR por vez)

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo transições de status
- [ ] Teste de aceitação executado pelo QA
- [ ] RLS policy: apenas role Foundation pode alterar status de análise
- [ ] Sem regressão no módulo Releases

**Story Points:** 5
**Prioridade:** 🔴 Alta
**Dependências:** STORY-01, STORY-02
**Time estimado:** 3 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `PRAnalysisPanel` com detalhes do PR + ações Aprovar/Rejeitar
- [ ] `[Frontend]` Implementar campo de observação obrigatório no rejeitar
- [ ] `[Frontend]` Controlar visibilidade dos botões por role do usuário
- [ ] `[Backend]` Criar endpoint PATCH /releases/:id/prs/:prId/review com body { status, observation }
- [ ] `[Backend]` Implementar lógica de reset de status quando o dev edita PR rejeitado
- [ ] `[Backend]` Criar RLS policy: apenas role "foundation" pode executar review
- [ ] `[QA]` Escrever cenários BDD para fluxo Pendente → Aprovado, Pendente → Rejeitado → Pendente

---

### [STORY-04] Visão de squads participantes por release

**Como** SM / QA Lead
**Quero** ver quais squads cadastraram PRs em uma release específica, com contagem de PRs e status de conformidade
**Para** saber rapidamente quem participou e quem ainda precisa agir

**Contexto:**
> Hoje a identificação de squads participantes é feita manualmente filtrando a planilha por coluna de squad. Essa visão é a base para a cobrança de testes integrados.

**Critérios de aceite:**

- [ ] **CA01** — Dado que existem PRs na release, quando o SM acessa a visão de squads, então vê uma lista de squads com: nome do squad, quantidade de PRs, PRs aprovados, PRs pendentes, PRs rejeitados.
- [ ] **CA02** — Dado que um squad tem todos os PRs aprovados E testes integrados vinculados, quando o SM visualiza, então o squad aparece com indicador verde "Conforme".
- [ ] **CA03** — Dado que um squad tem PRs mas não tem testes integrados vinculados, quando o SM visualiza, então o squad aparece com indicador amarelo "Pendente testes".
- [ ] **CA04** — Dado que nenhum squad cadastrou PR, quando o SM acessa a visão, então vê empty state "Nenhum squad cadastrou PRs nesta release."
- [ ] **CA05** — Dado que o SM clica em um squad, quando expande, então vê a lista de PRs daquele squad com seus respectivos status.

**Critérios de não-aceite (out of scope):**
- Não inclui comparativo entre releases (ex: "squad X participou nas últimas 5 releases")

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo cálculo de conformidade
- [ ] Teste de aceitação executado pelo QA
- [ ] Sem regressão no módulo Releases

**Story Points:** 3
**Prioridade:** 🟡 Média
**Dependências:** STORY-01, STORY-05
**Time estimado:** 2 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `SquadParticipationView` com cards ou tabela de squads
- [ ] `[Frontend]` Implementar indicadores de conformidade (verde/amarelo/vermelho)
- [ ] `[Frontend]` Implementar expand/collapse para ver PRs do squad
- [ ] `[Backend]` Criar endpoint GET /releases/:id/squads-summary com agregações
- [ ] `[QA]` Validar cálculo de conformidade em cenários com e sem testes vinculados

---

### [STORY-05] Vínculo de PR com testes integrados

**Como** Dev / QA
**Quero** vincular testes integrados a um PR cadastrado na release
**Para** que fique registrado que o squad cumpriu a obrigação de cadastrar testes para as mudanças que subiu

**Contexto:**
> O cadastro de testes integrados é feito em um fluxo separado (módulo Regressivos Integrados / Checkpoint). Esta história cria o vínculo entre o PR e os testes, sem duplicar o cadastro. O dev referencia os testes existentes ou registra a intenção de que os testes serão cadastrados.

**Critérios de aceite:**

- [ ] **CA01** — Dado que um PR está cadastrado, quando o dev acessa o PR, então vê uma seção "Testes Integrados" com opção de vincular.
- [ ] **CA02** — Dado que o dev clica em "Vincular teste", quando busca e seleciona um teste existente no módulo de testes, então o vínculo é salvo e o teste aparece listado no PR.
- [ ] **CA03** — Dado que não existem testes cadastrados para vincular, quando o dev acessa a seção, então pode marcar o checkbox "Testes ainda não cadastrados — compromisso de cadastro até [data]" com campo de data.
- [ ] **CA04** — Dado que o dev vinculou testes ao PR, quando o SM/QA visualiza a visão de squads (STORY-04), então o indicador reflete que os testes estão vinculados.
- [ ] **CA05** — Dado que o dev tenta finalizar sem vincular testes nem marcar compromisso, quando tenta salvar, então vê alerta "É obrigatório vincular testes ou registrar compromisso de cadastro."

**Critérios de não-aceite (out of scope):**
- Não inclui o cadastro do teste integrado em si (feito no módulo de testes)
- Não inclui validação automática de que o teste cobre o PR (manual)

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo vínculo e compromisso
- [ ] Teste de aceitação executado pelo QA
- [ ] Sem regressão nos módulos Releases e Testes Integrados

**Story Points:** 5
**Prioridade:** 🔴 Alta
**Dependências:** STORY-01
**Time estimado:** 3 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `TestLinkSection` dentro do detalhe do PR
- [ ] `[Frontend]` Implementar busca/autocomplete de testes existentes
- [ ] `[Frontend]` Implementar checkbox de compromisso com date picker
- [ ] `[Backend]` Criar tabela `pr_test_links` com FK para `release_prs` e tabela de testes
- [ ] `[Backend]` Criar endpoints: POST/DELETE /releases/:id/prs/:prId/tests
- [ ] `[Backend]` Implementar validação de obrigatoriedade (vínculo ou compromisso)
- [ ] `[QA]` Escrever cenários BDD para vínculo, compromisso e tentativa sem nenhum dos dois

---

### [STORY-06] Alertas e cobrança automática de testes integrados

**Como** SM / QA Lead
**Quero** que o sistema envie alertas automáticos para squads que cadastraram PRs mas não vincularam testes integrados
**Para** não depender de cobrança manual e garantir que nenhum squad passe sem testes

**Contexto:**
> Hoje a cobrança é feita via mensagem manual (Slack/Teams). O sistema deve alertar automaticamente dentro do ToStatos e, se possível, gerar uma lista de pendências que o SM possa compartilhar.

**Critérios de aceite:**

- [ ] **CA01** — Dado que um squad cadastrou PR há mais de 48h sem vincular testes, quando o sistema executa a verificação periódica, então gera um alerta visível no painel de notificações do ToStatos para o squad e para o SM.
- [ ] **CA02** — Dado que a data de compromisso de testes (STORY-05, CA03) expirou sem vínculo real, quando o sistema verifica, então muda o status do squad para "Testes atrasados" (indicador vermelho).
- [ ] **CA03** — Dado que o SM acessa o painel de alertas, quando filtra por release, então vê a lista de squads com pendências de testes.
- [ ] **CA04** — Dado que o SM quer compartilhar a lista de pendências, quando clica em "Copiar resumo", então copia um texto formatado pronto para colar no Slack/Teams.
- [ ] **CA05** — Dado que todos os squads vincularam testes, quando o SM acessa o painel, então vê a mensagem "Todos os squads estão em conformidade para a release [nome]."

**Critérios de não-aceite (out of scope):**
- Não inclui integração direta com Slack/Teams para envio automático de mensagem (apenas gera o texto para copiar)
- Não inclui envio de e-mail

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo regras de alerta (48h, data expirada)
- [ ] Teste de aceitação executado pelo QA
- [ ] Sem regressão no módulo Releases

**Story Points:** 5
**Prioridade:** 🟡 Média
**Dependências:** STORY-05
**Time estimado:** 3 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `TestComplianceAlerts` com lista de pendências
- [ ] `[Frontend]` Implementar botão "Copiar resumo" com texto formatado para Slack/Teams
- [ ] `[Backend]` Criar job/cron ou RPC para verificação periódica de conformidade
- [ ] `[Backend]` Criar endpoint GET /releases/:id/compliance-alerts
- [ ] `[Backend]` Implementar lógica de regras: 48h sem vínculo, compromisso expirado
- [ ] `[QA]` Testar cenários de timing (dentro de 48h, fora de 48h, compromisso expirado)

---

### [STORY-07] Dashboard de conformidade da release

**Como** SM / QA Lead / Gestor
**Quero** ver um dashboard consolidado da release com métricas de PRs e conformidade de testes
**Para** ter uma visão executiva do andamento da release sem precisar abrir cada seção

**Contexto:**
> Essa visão complementa a aba de PRs e a visão de squads. Deve ser um resumo visual rápido que mostre se a release está saudável ou se precisa de atenção.

**Critérios de aceite:**

- [ ] **CA01** — Dado que a release tem PRs cadastrados, quando o usuário acessa o dashboard, então vê os indicadores: total de PRs, PRs aprovados (%), PRs pendentes (%), PRs rejeitados (%), squads participantes, squads com testes vinculados (%), squads com pendência.
- [ ] **CA02** — Dado que todos os PRs estão aprovados e todos os squads têm testes vinculados, quando o usuário visualiza, então o dashboard mostra indicador geral "Release conforme" em verde.
- [ ] **CA03** — Dado que existem pendências, quando o usuário visualiza, então o dashboard mostra indicador geral "Release com pendências" em amarelo/vermelho conforme severidade.
- [ ] **CA04** — Dado que o usuário clica em qualquer métrica, quando interage, então navega para a seção detalhada correspondente (lista de PRs ou visão de squads).

**Critérios de não-aceite (out of scope):**
- Não inclui comparativo entre releases (ex: "essa release tem 30% mais PRs que a anterior")
- Não inclui exportação do dashboard em PDF

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo cálculo de indicadores
- [ ] Teste de aceitação executado pelo QA
- [ ] Sem regressão no módulo Releases

**Story Points:** 3
**Prioridade:** 🟡 Média
**Dependências:** STORY-02, STORY-04, STORY-05
**Time estimado:** 2 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `ReleaseComplianceDashboard` com cards de métricas
- [ ] `[Frontend]` Implementar indicador geral (semáforo verde/amarelo/vermelho)
- [ ] `[Frontend]` Implementar navegação clicável para seções detalhadas
- [ ] `[Backend]` Criar endpoint GET /releases/:id/compliance-dashboard com métricas agregadas
- [ ] `[QA]` Validar cálculos de percentual e lógica de semáforo

---

### [STORY-08] Histórico e auditoria de PRs por release

**Como** SM / Mobile Foundation
**Quero** ver o histórico completo de ações sobre cada PR (cadastro, edição, aprovação, rejeição, vínculo de testes)
**Para** ter rastreabilidade total e saber quem fez o quê e quando

**Contexto:**
> Na planilha não existe auditoria. Qualquer pessoa pode alterar dados sem registro. O ToStatos deve registrar cada ação com timestamp e autor.

**Critérios de aceite:**

- [ ] **CA01** — Dado que um PR foi cadastrado, editado, aprovado ou rejeitado, quando qualquer ação é executada, então o sistema registra: ação, autor, timestamp, dados anteriores e novos.
- [ ] **CA02** — Dado que o usuário acessa o detalhe do PR, quando clica em "Histórico", então vê a timeline de ações em ordem cronológica reversa.
- [ ] **CA03** — Dado que o SM quer auditar a release, quando acessa o histórico da release, então vê todas as ações de todos os PRs consolidadas em uma timeline única.
- [ ] **CA04** — Dado que nenhuma ação foi registrada além do cadastro, quando o usuário vê o histórico, então aparece apenas "PR cadastrado por [dev] em [data]."

**Critérios de não-aceite (out of scope):**
- Não inclui rollback de ações (apenas visualização)
- Não inclui exportação do histórico

**Definition of Done:**
- [ ] Código revisado por pelo menos 1 dev
- [ ] Testes unitários cobrindo registro de ações
- [ ] Teste de aceitação executado pelo QA
- [ ] Sem regressão no módulo Releases

**Story Points:** 2
**Prioridade:** 🔵 Baixa
**Dependências:** STORY-01, STORY-03, STORY-05
**Time estimado:** 2 dias

**Tasks técnicas:**
- [ ] `[Frontend]` Criar componente `PRAuditTimeline` para detalhe do PR
- [ ] `[Frontend]` Criar componente `ReleaseAuditTimeline` para visão consolidada
- [ ] `[Backend]` Criar tabela `pr_audit_log` com campos: action, actor, timestamp, previous_data, new_data
- [ ] `[Backend]` Implementar trigger ou middleware que registra ações automaticamente
- [ ] `[Backend]` Criar endpoint GET /releases/:id/prs/:prId/audit e GET /releases/:id/audit
- [ ] `[QA]` Validar que todas as ações geram registro de auditoria

---

## Modelo de dados proposto

```
releases (existente)
  └── release_prs (nova)
        ├── id (uuid, PK)
        ├── release_id (FK → releases)
        ├── squad_id (FK → squads)
        ├── user_id (FK → users, dev que cadastrou)
        ├── pr_link (text, URL do PR)
        ├── repository (text)
        ├── description (text)
        ├── change_type (enum: feature | fix | refactor | hotfix)
        ├── review_status (enum: pending | approved | rejected, default: pending)
        ├── reviewed_by (FK → users, nullable)
        ├── reviewed_at (timestamp, nullable)
        ├── review_observation (text, nullable)
        ├── test_commitment_date (date, nullable)
        ├── created_at (timestamp)
        └── updated_at (timestamp)

  └── pr_test_links (nova)
        ├── id (uuid, PK)
        ├── release_pr_id (FK → release_prs)
        ├── test_id (FK → tabela de testes integrados)
        ├── linked_by (FK → users)
        └── linked_at (timestamp)

  └── pr_audit_log (nova)
        ├── id (uuid, PK)
        ├── release_pr_id (FK → release_prs)
        ├── action (enum: created | updated | approved | rejected | test_linked | test_unlinked)
        ├── actor_id (FK → users)
        ├── previous_data (jsonb, nullable)
        ├── new_data (jsonb, nullable)
        └── created_at (timestamp)
```

---

## Mapa de riscos

| # | Risco | Probabilidade | Impacto | Score | Mitigação |
|---|-------|--------------|---------|-------|-----------|
| 1 | Modelo de testes integrados não estar pronto para vínculo (STORY-05 depende do módulo de testes existir) | Média | Alto | 6 | Implementar STORY-05 com fallback de compromisso (checkbox) caso o módulo de testes não esteja pronto |
| 2 | Resistência dos devs em migrar da planilha para o ToStatos | Média | Médio | 4 | Garantir que o cadastro de PR no ToStatos seja mais rápido que na planilha; SM reforça na daily |
| 3 | RLS policies complexas (dev edita só o seu, Foundation analisa todos, SM vê tudo) | Baixa | Alto | 3 | Definir roles claros no Supabase e testar RLS exaustivamente antes de liberar |
| 4 | Performance da query de dashboard com muitos PRs por release | Baixa | Médio | 2 | Usar views materializadas ou RPCs com agregação no banco |

### Dependências críticas
- Módulo de Releases existente precisa estar estável (é a base)
- Tabela de squads precisa estar populada com os squads ativos
- Módulo de testes integrados (mesmo que parcial) para STORY-05 funcionar com vínculo real

### Plano de contingência
- Se o módulo de testes integrados não estiver pronto: STORY-05 funciona apenas com "compromisso de cadastro" e o vínculo real é implementado quando o módulo estiver disponível
- Se houver resistência à migração: manter planilha em paralelo por 1 release e comparar resultados

---

## Critério de conclusão do épico

- [ ] Todas as 8 histórias concluídas e aceitas
- [ ] Testes de regressão do módulo Releases passando
- [ ] RLS policies validadas para todos os perfis (Dev, Foundation, SM/QA)
- [ ] Aprovação do PO em demonstração
- [ ] Planilha externa descontinuada após 1 release de validação paralela
- [ ] Documentação de produto atualizada no README/CLAUDE.md
