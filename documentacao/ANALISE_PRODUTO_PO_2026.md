# ANÁLISE ESTRATÉGICA DE PRODUTO -- ToStatos | Hub de Qualidade (Plataforma de Inteligência de Qualidade de Software)

**Analista:** Marina Caldas, Product Manager Senior
**Data:** 04 de Abril de 2026
**Versao:** 1.0

---

## PARTE 1: DIAGNÓSTICO COMPLETO DO PRODUTO

### 1.1 Estado de cada modulo

| Modulo | Estado | Maturidade | Justificativa |
|--------|--------|------------|---------------|
| **Auth** | Implementado | Alta | Login, roles (admin/gerente/user), troca obrigatoria de senha, profile. Completo e funcional. |
| **Cobertura QA (Sprints)** | Maduro | Alta | 8 abas, KPIs complexos (Health Score, MTTR, Burndown), comparacao entre sprints, export JPG/JSON/CSV, import Gherkin/.csv. Modulo mais robusto do sistema. |
| **Status Report** | Implementado | Alta | Multi-report, secoes dinamicas, Gantt SVG com dependencias, preview 2 colunas, combinados do time (DOR/DOD/cerimonias), gestao de ausencias. Completo. |
| **Releases** | Implementado | Media-Alta | Pipeline 5 fases, cronograma com import CSV, checkpoints, regressivos, eventos. Funcional mas com dashboard individual mais simples que sprints. |
| **Cadastros (Squads)** | Implementado | Alta | CRUD completo, permissoes granulares por recurso, perfis reutilizaveis, arquivamento, gestao de usuarios. Solido. |
| **PO Assistant (IA)** | Planejado | Zero | Documento de feature completo (`FEATURE_PO_ASSISTANT_IA.md`) com arquitetura, templates, fases. Nenhum codigo implementado. |
| **Dashboard Home** | Implementado | Media | Hub com cards de navegacao e stats basicos (contadores). Funcional mas superficial -- nao mostra metricas agregadas reais. |
| **Documentacao (DocsPage)** | Implementado | Media | Pagina interna com guia do sistema, metricas explicadas. Util para onboarding. |

### 1.2 Personas identificadas

Baseado nos roles do sistema, nos fluxos de UI e no modelo de permissoes:

1. **QA Lead (persona primaria)** -- Cria e gerencia sprints, executa testes, registra bugs, gera reports. Usa o sistema diariamente. Precisa de metricas para defender qualidade em reunioes.

2. **Scrum Master / SM** -- Consome Status Reports, usa Gantt para acompanhar entregas, gerencia combinados do time (DOR/DOD). Foco em visibilidade e comunicacao.

3. **Admin / Gestor de QA** -- Gerencia squads, usuarios, permissoes. Ve metricas agregadas cross-squad. Toma decisoes sobre alocacao de recursos.

4. **Stakeholder (somente leitura)** -- Consome dashboards e reports prontos. Precisa de visao executiva sem entrar nos detalhes.

5. **PO (persona futura)** -- Planejada no modulo PO Assistant. Hoje nao tem fluxo dedicado no sistema.

### 1.3 Proposta de valor central

**"Eliminar planilhas manuais no acompanhamento de QA, oferecendo metricas estruturadas e em tempo real sobre a qualidade de cada entrega."**

O ToStatos resolve um problema real e especifico: times de QA que usam Excel/Google Sheets para rastrear sprints, bugs e cobertura de testes. Ele concentra isso em uma plataforma com calculos automaticos (Health Score, MTTR, Burndown), persistencia hibrida (local+cloud) e colaboracao multi-usuario.

### 1.4 Posicionamento competitivo

| Dimensao | ToStatos | Jira | Azure DevOps | TestRail | Zephyr |
|----------|----------|------|-------------|----------|--------|
| **Foco** | Metricas QA especificas | Gestao de projeto geral | Gestao de projeto geral | Gestao de testes | Plugin de teste para Jira |
| **Setup** | < 5 min (localhost) | Semanas | Semanas | Dias | Dias |
| **Custo** | Gratuito (self-hosted) | $7-14/user/mes | $6-52/user/mes | $36/user/mes | $10/user/mes |
| **Health Score** | Nativo, automatico | Nao tem | Nao tem | Nao tem | Nao tem |
| **MTTR nativo** | Sim | Requer config | Requer config | Nao | Nao |
| **Burndown QA** | Nativo (execucao de testes) | Burndown de stories | Sim | Nao | Nao |
| **Status Report** | Nativo com Gantt | Nao tem | Nao tem | Nao tem | Nao tem |
| **Release Pipeline** | Nativo (5 fases) | Requer plugins | Nativo (outro foco) | Nao | Nao |
| **Offline** | Sim (localStorage) | Nao | Nao | Nao | Nao |
| **Self-hosted** | Sim | Enterprise | Nao | Enterprise | Nao |

**Diferencial-chave:** O ToStatos e o unico que combina metricas de QA (Health Score, MTTR, Burndown de testes) + Status Report + Release Pipeline em uma ferramenta unica, leve, gratuita e self-hosted. Nenhuma ferramenta enterprise oferece Health Score automatico para QA.

### 1.5 Avaliacao de saude tecnica

**Pontos fortes:**
- Stack moderna e bem escolhida (React 19, Zustand, Supabase, Zod)
- Persistencia hibrida robusta (localStorage + Supabase + sendBeacon para crash recovery)
- 27 migrations sequenciais bem organizadas
- RLS implementado em todas as tabelas
- Lazy loading em 5 rotas pesadas
- Memoizacao em 16+ componentes
- Testes E2E com Playwright (8 specs)
- Swagger na API
- Audit trail via RPC

**Pontos de atencao:**
- Estilos inline extensivos (nao usa Tailwind classes em muitos componentes apesar de ter Tailwind v4 configurado)
- Duplicacao de constantes STATUS_LABELS/STATUS_COLORS entre ReleasesPage e ReleaseDashboard
- Tipagem forte mas sem testes unitarios (apenas E2E)
- server.js monolitico (660+ linhas) -- nao ha separacao em routers/controllers
- Sem CI/CD configurado no repositorio
- Documentacao tecnica legada (DOCUMENTACAO_TECNICA.md) referencia versao anterior em HTML/JS vanilla

---

## PARTE 2: GAPS E OPORTUNIDADES

### 2.1 O que esta faltando que usuarios esperariam

1. **Notificacoes e alertas** -- Nenhum sistema de notificacao. Quando um bug critico e aberto, quando a sprint atinge deadline, quando um blocker e criado -- ninguem e avisado. Para um produto colaborativo multi-usuario, isso e um gap critico.

2. **Busca global** -- Nao ha busca cross-modulo. Um QA Lead nao consegue buscar "bug X" e encontrar em qual sprint/release ele esta.

3. **Dashboard executivo agregado** -- O DashboardHome mostra apenas contadores. Um gestor nao consegue ver "qual o Health Score medio dos meus squads esta semana?" ou "quantos bugs criticos estao abertos cross-squad?".

4. **Export PDF nativo** -- Status Reports tem "Preview 2 colunas formato Word" e copiar clipboard, mas nao geram PDF direto. A DocsPage menciona jsPDF na versao legada que foi removida.

5. **Webhook/integracao com Slack/Teams** -- Descartado no backlog Q2, mas times reais precisam disso para adocao.

6. **API publica documentada para integracao** -- O Swagger existe mas a API e basicamente flush endpoints. Nao ha API REST para ler sprints/bugs/reports programaticamente.

7. **Dark mode** -- O chartColors.ts foi preparado para isso ("future dark mode"), design tokens existem no index.css, mas nao esta implementado.

8. **Mobile responsivo** -- Descartado no backlog Q2, mas e uma barreira de adocao para stakeholders que consomem reports no celular.

### 2.2 O que existe mas esta incompleto

1. **Audit trail** -- Tabela `audit_logs` existe no banco, RPC `audit_action()` existe, mas a UI para visualizar logs NAO existe. A STORY-02 do backlog Q2 pede isso mas nao foi implementada.

2. **Releases: dashboard individual limitado** -- O `ReleaseDashboard.tsx` mostra apenas dados basicos + formulario de edicao + pipeline de fases. Nao exibe as metricas calculadas em `releaseMetrics.ts` (coveragePct, passPct, squadStatuses). O motor de metricas existe mas a UI nao expoe.

3. **Comparacao de sprints** -- Implementada mas o backlog Q2 STORY-03 pede graficos de tendencia que ainda nao existem.

4. **Release: areas de teste por squad** -- Componentes existem (SquadTestArea, ReleaseSuiteCard, etc.) mas o ReleaseDashboard nao renderiza eles -- so mostra ReleasePhasesPanel + formulario. Ha um gap entre componentes construidos e componentes utilizados.

5. **Calendario de eventos** -- ReleasesPage tem aba "Eventos" com CalendarEvents, mas e baseada em localStorage local, nao sincronizada com Supabase.

6. **Permissoes de checkpoints** -- O modelo de permissoes inclui `create_checkpoints`, `edit_checkpoints`, `delete_checkpoints` mas nao esta claro se os checkpoints de release respeitam essas permissoes na UI.

### 2.3 Divida tecnica que bloqueia evolucao

1. **server.js monolitico** -- Adicionar mais endpoints (AI, webhooks, API publica) vai tornar o arquivo ingerenciavel. Precisa ser refatorado em routers Express separados.

2. **Estilos inline vs Tailwind** -- O projeto tem Tailwind v4 configurado mas a maioria dos componentes usa `style={{...}}` inline. Isso impede dark mode, responsividade consistente e temas. Migrar para classes Tailwind desbloquearia dark mode e responsive de forma natural.

3. **Ausencia de testes unitarios** -- Apenas E2E. Calculos criticos como Health Score, MTTR, releaseMetrics nao tem testes unitarios. O backlog Q2 STORY-01 reconhece isso.

4. **localStorage como indice primario** -- O masterIndex vive no localStorage e sincroniza com Supabase. Se o localStorage for limpo, o indice se perde ate o proximo sync. Para escalar, o Supabase deveria ser a fonte de verdade com localStorage como cache.

### 2.4 O que o modelo de dados suporta mas a UI nao expoe

1. **`SprintState.reports`** -- Campo `Record<string, string>` para daily reports por data. A aba ReportTab existe mas nao esta claro se alimenta esse campo de forma persistente.

2. **`Release.rolloutPct`** -- Campo de rollout percentage com steps predefinidos (0-100). Existe no tipo mas o dashboard nao tem UI de rollout tracking.

3. **`Release.nonBlockingFeatures`** -- Lista de features que nao bloqueiam release. Existe no tipo mas nao tem UI de gestao.

4. **`Release.buildDate` e `Release.betaDate`** -- Campos para "Gerar Versao" e "Beta/Pre-Prod". Existem no tipo e no CronogramaTab mas nao no formulario basico de criacao/edicao.

5. **`Bug.openedAt` / `Bug.resolvedAt`** -- Campos opcionais para calculo de MTTR. Existem no tipo mas dependem de preenchimento manual.

6. **`Bug.category`** -- Campo opcional no tipo que nao aparece em nenhuma UI de filtro ou agrupamento.

7. **`SnapshotTotals` completo nos Checkpoints** -- O sistema calcula totals detalhados por snapshot mas o CheckpointTab provavelmente nao exibe tudo.

8. **`StatusReportItem.dependsOn`** -- Array de dependencias. Usado no Gantt, mas nao ha validacao de precedencia no formulario.

---

## PARTE 3: ROADMAP DE EVOLUÇÃO (6-12 MESES)

### H1 -- HORIZONTE 1 (1-3 meses): Quick wins + completar o que esta comecado

| # | Feature | Problema | Persona | Esforco |
|---|---------|----------|---------|---------|
| H1.1 | **Dashboard executivo agregado** | Gestor nao ve metricas cross-squad | Admin/Gestor | 2 semanas |
| H1.2 | **UI de Audit Trail** | Tabela existe, UI nao | Admin | 1 semana |
| H1.3 | **Release Dashboard completo** | Componentes existem mas nao sao renderizados | QA Lead | 1 semana |
| H1.4 | **Dark mode** | Tokens preparados, falta implementar | Todos | 1 semana |
| H1.5 | **Testes unitarios para metricas** | Calculos criticos sem cobertura | Dev/QA | 1 semana |
| H1.6 | **Export PDF de Status Report** | SM precisa enviar por email | SM | 1 semana |
| H1.7 | **Rollout tracking na UI de Release** | Campo existe, UI nao | QA Lead | 3 dias |
| H1.8 | **Busca global** | Nao encontra nada cross-modulo | Todos | 1 semana |

### H2 -- HORIZONTE 2 (3-6 meses): Features estrategicas que diferenciam

| # | Feature | Problema | Persona | Esforco |
|---|---------|----------|---------|---------|
| H2.1 | **PO Assistant com IA local** | PO nao tem ferramentas no sistema | PO | 3 semanas |
| H2.2 | **Notificacoes in-app + email** | Ninguem e avisado de eventos criticos | Todos | 3 semanas |
| H2.3 | **API REST publica** | Nao ha como integrar com CI/CD ou ferramentas externas | Dev/DevOps | 2 semanas |
| H2.4 | **Graficos de tendencia cross-sprint** | SM nao ve evolucao ao longo do tempo | SM/PO | 2 semanas |
| H2.5 | **Importacao de bugs do Jira/Azure** | Entrada manual de bugs e repetitiva | QA Lead | 2 semanas |
| H2.6 | **Templates de sprint** | Recriacao manual a cada sprint | QA Lead | 1 semana |
| H2.7 | **Responsivo basico (tablet)** | Stakeholders consultam no tablet | Stakeholder | 2 semanas |

### H3 -- HORIZONTE 3 (6-12 meses): Visao transformadora

| # | Feature | Problema | Persona | Esforco |
|---|---------|----------|---------|---------|
| H3.1 | **Automacao de status via CI/CD** | Status de build/deploy atualizado manualmente | DevOps | 4 semanas |
| H3.2 | **Predicao de qualidade (ML local)** | Ninguem antecipa problemas, so reage | Gestor | 6 semanas |
| H3.3 | **Multi-tenant (organizacoes)** | Escalar alem de uma empresa | Admin | 4 semanas |
| H3.4 | **Plugin Jira/Azure bidirecional** | Sync manual e barreira de adocao | QA Lead | 6 semanas |
| H3.5 | **Mobile PWA** | Acesso em campo, daily standups | Todos | 4 semanas |
| H3.6 | **Gamificacao de qualidade** | Engajamento do time em metricas | QA/Dev | 3 semanas |

---

## PARTE 4: TOP 10 FEATURES DETALHADAS

### Feature 1: Dashboard Executivo Agregado

**Categoria:** Nova funcionalidade
**Modulo alvo:** `app/pages/DashboardHome.tsx`
**Impacto estimado:** Alto

**Problema identificado:**
O DashboardHome atual e apenas um hub de navegacao com contadores rasos (sprints ativas: X, reports: Y). Um gestor de QA com 5 squads nao tem visibilidade sobre Health Score medio, bugs criticos abertos, sprints em risco ou tendencia de qualidade. Ele precisa abrir cada sprint individualmente para entender o estado do seu departamento.

**Solucao proposta:**
Dashboard com cards de KPIs agregados (Health Score medio, bugs criticos abertos, sprints em risco, cobertura media de testes), graficos de tendencia por squad, e alertas de itens que requerem atencao (sprints com Health Score < 60, releases proximas do deadline com cobertura < 80%).

**Valor de negocio:**
Gestor de QA toma decisoes de alocacao de recursos em 30 segundos em vez de 15 minutos navegando entre sprints.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 8 | Todo admin e gerente usa diariamente |
| Impact | 3 | Transforma a experiencia de gestao |
| Confidence | 90% | Dados ja existem nos stores, so falta agregar |
| Effort | 2 semanas | |
| **RICE Score** | **10.8** | |

**Historias necessarias:**
- STORY: Agregar Health Score e cobertura media por squad no dashboard
- STORY: Cards de alertas (sprints em risco, bugs criticos, releases proximas)
- STORY: Grafico de tendencia de Health Score ultimas 10 sprints
- STORY: Filtro por squad no dashboard executivo

**Riscos:**
- Performance ao agregar dados de muitas sprints (mitigacao: cache com TTL)

---

### Feature 2: PO Assistant com IA Local

**Categoria:** Nova funcionalidade
**Modulo alvo:** `src/modules/po-assistant/` (novo)
**Impacto estimado:** Alto

**Problema identificado:**
O PO e a persona menos atendida pelo ToStatos. Ele escreve historias de usuario, criterios de aceite, release notes e refinamento de backlog manualmente, sem assistencia. O documento `FEATURE_PO_ASSISTANT_IA.md` ja detalha a solucao completa com Ollama.

**Solucao proposta:**
Modulo com gerador de historias, sugestor de criterios de aceite, refinador de historias, gerador de release notes e chat contextual. Tudo via IA local (Ollama), gratuito e sem envio de dados externos.

**Valor de negocio:**
Reducao de 50% no tempo de escrita de historias. Padronizacao de qualidade entre POs. Diferencial competitivo unico (nenhum concorrente oferece IA local gratuita integrada a metricas de QA).

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 6 | POs e SMs (nao todos os usuarios) |
| Impact | 3 | Transforma produtividade do PO |
| Confidence | 70% | Qualidade da IA local em PT-BR precisa validacao |
| Effort | 3 semanas | |
| **RICE Score** | **4.2** | |

**Historias necessarias:**
- STORY: Endpoints de proxy para Ollama no server.js
- STORY: aiService.ts com streaming fetch
- STORY: StoryGenerator com templates de prompt
- STORY: CriteriaAssistant integrado ao contexto do squad
- STORY: ReleaseNotesGenerator a partir de itens do Status Report
- STORY: AiChat com historico persistente

**Riscos:**
- Hardware do usuario pode nao suportar (mitigacao: deteccao automatica, modo manual sem IA)
- Qualidade de respostas em PT-BR varia por modelo (mitigacao: templates otimizados)

---

### Feature 3: Sistema de Notificacoes

**Categoria:** Nova funcionalidade
**Modulo alvo:** Cross-modulo (novo servico)
**Impacto estimado:** Alto

**Problema identificado:**
Em um ambiente multi-usuario com squads, ninguem e notificado quando eventos criticos acontecem: bug critico aberto, sprint atingiu 80% do prazo com < 50% de execucao, release com blocker, novo membro adicionado ao squad. O usuario precisa entrar no sistema e navegar para descobrir problemas.

**Solucao proposta:**
Centro de notificacoes in-app (sino no topbar) com lista de notificacoes nao-lidas. Opcao futura de webhook para Slack/Teams.

**Valor de negocio:**
Tempo de reacao a problemas cai de horas para minutos. Aumenta engajamento diario com a plataforma.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 10 | Todo usuario se beneficia |
| Impact | 2 | Significativo mas nao transformador |
| Confidence | 85% | Pattern bem conhecido, Supabase Realtime ja suporta |
| Effort | 3 semanas | |
| **RICE Score** | **5.7** | |

**Historias necessarias:**
- STORY: Tabela notifications no Supabase com RLS
- STORY: Servico de geracao de notificacoes (triggers no banco)
- STORY: Centro de notificacoes in-app no Topbar
- STORY: Marcar como lida/nao lida
- STORY: Configuracoes de notificacao por usuario

**Riscos:**
- Excesso de notificacoes pode causar fadiga (mitigacao: configuracao granular)

---

### Feature 4: Release Dashboard Completo

**Categoria:** Melhoria (completar funcionalidade existente)
**Modulo alvo:** `src/modules/releases/pages/ReleaseDashboard.tsx`
**Impacto estimado:** Alto

**Problema identificado:**
O `ReleaseDashboard.tsx` renderiza apenas `ReleasePhasesPanel` + formulario de edicao. Existem componentes prontos (`SquadTestArea`, `ReleaseSuiteCard`, `ReleaseFeatureRow`, `ReleaseTestCaseRow`, `ReleaseBugsList`, `ReleaseSquadCard`, `ReleaseTimeline`) e um motor de metricas (`releaseMetrics.ts`) que calcula coveragePct, passPct, squadStatuses, openBugs, etc. -- mas nada disso e renderizado no dashboard. E como ter a cozinha equipada mas servir comida crua.

**Solucao proposta:**
Integrar todos os componentes de teste e metricas no ReleaseDashboard com abas: Visao Geral (metricas agregadas + cards por squad), Squads (area de teste por squad), Timeline (visual do pipeline), Bugs (consolidado).

**Valor de negocio:**
Release manager finalmente tem visibilidade real sobre o estado da homologacao. Hoje precisa abrir cada sprint individualmente.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 7 | Todo usuario que gerencia releases |
| Impact | 3 | Transforma a utilidade do modulo de releases |
| Confidence | 95% | Componentes ja existem, so falta compor |
| Effort | 1 semana | |
| **RICE Score** | **19.95** | |

**Historias necessarias:**
- STORY: Renderizar SquadTestArea/ReleaseSquadCard no ReleaseDashboard
- STORY: Painel de metricas usando computeReleaseMetrics
- STORY: Rollout percentage slider com steps predefinidos
- STORY: Timeline visual integrada

**Riscos:**
- Minimos. Componentes ja existem e estao testados isoladamente.

---

### Feature 5: Dark Mode

**Categoria:** Melhoria
**Modulo alvo:** `src/index.css` + todos componentes com inline styles
**Impacto estimado:** Medio

**Problema identificado:**
QA Leads trabalham frequentemente em horarios estendidos. O tema claro unico causa desconforto visual. O sistema ja tem design tokens preparados em `index.css` e `chartColors.ts` menciona explicitamente "future dark mode", mas estilos inline nos componentes impossibilitam a troca de tema.

**Solucao proposta:**
Migrar estilos inline para CSS variables/Tailwind classes. Implementar toggle de tema com persistencia em localStorage. Dark palette mapeada nas mesmas variaveis CSS.

**Valor de negocio:**
Reducao de fadiga visual, aumento de tempo de uso da plataforma. Feature esperada por qualquer produto SaaS moderno.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 10 | Todo usuario |
| Impact | 1 | Conforto, nao funcionalidade |
| Confidence | 80% | Tokens existem, migrar inline styles e trabalhoso |
| Effort | 2 semanas | Inclui migrar inline styles para CSS vars |
| **RICE Score** | **4.0** | |

**Historias necessarias:**
- STORY: Definir dark palette nas CSS variables
- STORY: Migrar estilos inline dos 10 componentes mais pesados para CSS vars
- STORY: Toggle de tema no UserMenu com persistencia
- STORY: Adaptar chartColors.ts para tema ativo

**Riscos:**
- Migrar estilos inline e trabalhoso e pode introduzir regressoes visuais

---

### Feature 6: API REST Publica

**Categoria:** Nova funcionalidade
**Modulo alvo:** `server.js` (refatorado em routers)
**Impacto estimado:** Alto

**Problema identificado:**
Nao ha como integrar o ToStatos com pipelines de CI/CD, bots de Slack, ou qualquer ferramenta externa. O unico consumo externo possivel e via Supabase direto (requer knowledge do schema). Para adocao em empresas com DevOps maduro, integracoes sao obrigatorias.

**Solucao proposta:**
API REST autenticada (Bearer token) com endpoints para: listar sprints, ler metricas de sprint, listar bugs, criar bug via CI, atualizar status de release, ler metricas de release. Swagger ja existe, bastaria expandir.

**Valor de negocio:**
Pipeline de CI/CD atualiza automaticamente status de testes no ToStatos. Bot de Slack posta Health Score diario. Dashboards de BI consultam metricas. Abre o caminho para ecossistema de integracoes.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 5 | DevOps e times com automacao |
| Impact | 3 | Habilita ecossistema inteiro de integracao |
| Confidence | 85% | Swagger ja existe, Express permite facil |
| Effort | 2 semanas | |
| **RICE Score** | **6.4** | |

**Historias necessarias:**
- STORY: Refatorar server.js em routers Express separados
- STORY: Endpoints GET para sprints, bugs, metricas
- STORY: Endpoint POST para criar bug via API (CI/CD)
- STORY: Endpoint PATCH para atualizar status de release
- STORY: Documentacao Swagger completa dos novos endpoints

**Riscos:**
- Seguranca: expor dados requer autenticacao robusta e rate limiting por token

---

### Feature 7: Export PDF Nativo de Status Report

**Categoria:** Melhoria
**Modulo alvo:** `src/modules/status-report/services/statusReportExport.ts`
**Impacto estimado:** Medio-Alto

**Problema identificado:**
SMs precisam enviar Status Reports por email a stakeholders que nao acessam o sistema. Hoje o export e JPG (html2canvas) ou copiar texto para clipboard. A versao legada tinha jsPDF que foi removida na migracao para React. SM precisa copiar para Word, formatar e salvar PDF manualmente.

**Solucao proposta:**
Gerar PDF formatado (2 colunas, com logotipo, cores por secao, Gantt inline) diretamente do sistema. Usar biblioteca como `@react-pdf/renderer` ou server-side com `puppeteer`.

**Valor de negocio:**
SM economiza 15-20 minutos por report semanal. Qualidade visual padronizada em todos os reports.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 7 | Todo SM que envia reports |
| Impact | 2 | Significativo para o workflow semanal |
| Confidence | 90% | Tecnicamente simples |
| Effort | 1 semana | |
| **RICE Score** | **12.6** | |

**Historias necessarias:**
- STORY: Implementar geracao de PDF com secoes, cores e Gantt
- STORY: Botao "Exportar PDF" na pagina de preview do Status Report
- STORY: Configuracao de logo/marca no PDF

**Riscos:**
- Renderizacao de Gantt SVG em PDF pode ser complexa

---

### Feature 8: UI de Audit Trail

**Categoria:** Melhoria (completar funcionalidade existente)
**Modulo alvo:** Novo componente em `app/` ou `squads/`
**Impacto estimado:** Medio

**Problema identificado:**
A tabela `audit_logs` existe no banco com RPC `audit_action()` (SECURITY DEFINER). Bugs create/delete ja logam. Mas nao existe UI para visualizar esses logs. Um admin nao consegue responder "quem deletou aquele bug ontem?" sem consultar o banco diretamente.

**Solucao proposta:**
Painel de logs acessivel ao admin com filtros por recurso (sprint, report, release), acao (create, update, delete), usuario e periodo. Timeline visual com diff das alteracoes.

**Valor de negocio:**
Accountability e compliance (LGPD). Debug de problemas. Confianca do time de que alteracoes sao rastreaveis.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 4 | Apenas admins e gerentes |
| Impact | 2 | Significativo para governanca |
| Confidence | 90% | Dados ja existem no banco |
| Effort | 1 semana | |
| **RICE Score** | **7.2** | |

**Historias necessarias:**
- STORY: Endpoint para listar audit_logs com filtros
- STORY: Pagina ou aba de Audit Trail acessivel ao admin
- STORY: Filtros por recurso, acao, usuario e periodo
- STORY: Expandir audit para todas as acoes criticas (nao so bugs)

**Riscos:**
- Volume de logs pode crescer rapido (mitigacao: paginacao + retencao)

---

### Feature 9: Templates de Sprint

**Categoria:** Melhoria
**Modulo alvo:** `src/modules/sprints/`
**Impacto estimado:** Medio

**Problema identificado:**
A cada nova sprint, o QA Lead recria suites, features e configuracoes do zero ou duplica uma sprint anterior e limpa os dados. O fluxo de duplicacao ja existe (handleDuplicate reseta execucoes), mas nao ha conceito formal de template com suites e features pre-configuradas sem dados de execucao.

**Solucao proposta:**
Salvar sprint como template (suites + features + configuracao, sem bugs/execucoes). Criar sprint a partir de template. Gerenciar templates salvos.

**Valor de negocio:**
QA Lead economiza 10-15 minutos por sprint em setup. Padronizacao de estrutura de testes entre sprints.

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 8 | Todo QA Lead que cria sprints recorrentes |
| Impact | 1 | Melhoria de eficiencia, nao transformador |
| Confidence | 90% | Logica de duplicacao ja existe |
| Effort | 1 semana | |
| **RICE Score** | **7.2** | |

**Historias necessarias:**
- STORY: Salvar sprint como template (extrair estrutura sem dados)
- STORY: Listar templates no modal de criacao de sprint
- STORY: Criar sprint a partir de template selecionado
- STORY: Gerenciar (editar nome, excluir) templates salvos

**Riscos:**
- Minimos. Reutiliza logica de duplicacao existente.

---

### Feature 10: Busca Global

**Categoria:** Nova funcionalidade
**Modulo alvo:** `app/layout/Topbar.tsx`
**Impacto estimado:** Medio

**Problema identificado:**
Com dezenas de sprints, reports e releases, um usuario nao consegue encontrar um item especifico sem navegar manualmente. "Em qual sprint estava aquele bug do checkout?" requer abrir sprint por sprint.

**Solucao proposta:**
Campo de busca no Topbar (atalho Cmd+K) que pesquisa em titulos de sprints, reports, releases, nomes de bugs e features. Resultados agrupados por tipo com link direto.

**Valor de negocio:**
Navegacao 10x mais rapida. Padrao esperado de qualquer SaaS moderno (Linear, Notion, Jira todos tem Cmd+K).

**Analise RICE:**

| Dimensao | Valor | Justificativa |
|----------|-------|---------------|
| Reach | 10 | Todo usuario |
| Impact | 1 | Conveniencia, nao funcionalidade critica |
| Confidence | 80% | Dados estao no localStorage, indexacao rapida |
| Effort | 1.5 semanas | |
| **RICE Score** | **5.3** | |

**Historias necessarias:**
- STORY: Componente SearchModal com Cmd+K shortcut
- STORY: Indexar titulos de sprints, reports, releases no localStorage
- STORY: Buscar em bugs e features dentro de cada sprint
- STORY: Resultados agrupados por tipo com navegacao direta

**Riscos:**
- Performance com muitas sprints (mitigacao: indice pre-computado, debounce)

---

### Ranking por RICE Score

| # | Feature | RICE Score | Horizonte |
|---|---------|-----------|-----------|
| 1 | Release Dashboard completo | **19.95** | H1 |
| 2 | Export PDF de Status Report | **12.6** | H1 |
| 3 | Dashboard executivo agregado | **10.8** | H1 |
| 4 | UI de Audit Trail | **7.2** | H1 |
| 5 | Templates de sprint | **7.2** | H1 |
| 6 | API REST publica | **6.4** | H2 |
| 7 | Sistema de notificacoes | **5.7** | H2 |
| 8 | Busca global | **5.3** | H1 |
| 9 | PO Assistant com IA | **4.2** | H2 |
| 10 | Dark mode | **4.0** | H1 |

---

## PARTE 5: VISÃO DE PRODUTO

### Onde o ToStatos deveria estar em 1 ano

**De "ferramenta de acompanhamento de QA" para "plataforma de inteligencia de qualidade de software".**

Em abril de 2027, o ToStatos deveria ser o centro nervoso de qualidade de qualquer time agil de medio porte. Nao apenas registrando o que aconteceu (reativo), mas prevendo o que vai acontecer (proativo).

**Pilares da visao:**

1. **Visibilidade instantanea** -- Dashboard executivo com Health Score cross-squad, alertas proativos, busca global. O gestor abre o sistema e em 10 segundos sabe onde estao os problemas.

2. **Inteligencia embarcada** -- PO Assistant com IA local para gerar artefatos. Predicao de qualidade baseada em historico (sprints com perfil X tendem a ter Y bugs criticos). Sugestoes automaticas de alocacao de esforco de QA.

3. **Ecossistema aberto** -- API REST publica que permite CI/CD atualizar status automaticamente, bots de Slack postar Health Score, dashboards de BI consumir metricas. O ToStatos se torna o "hub de qualidade" que alimenta outras ferramentas.

4. **Zero friccao** -- Dark mode, responsivo, templates de sprint, import de Jira. Tudo que reduz o custo de usar a ferramenta e aumenta adocao.

### Diferenciadores-chave a construir

1. **Health Score como metrica padrao da industria** -- Nenhuma ferramenta calcula Health Score de QA automaticamente. Se o ToStatos popularizar isso, vira referencia.

2. **IA local gratuita** -- Enquanto concorrentes cobram por IA cloud, o ToStatos oferece IA local sem custo e sem envio de dados. Para empresas com requisitos de privacidade, isso e decisivo.

3. **Self-hosted first** -- O modelo de deploy (Docker + Supabase local) permite que empresas com restricoes de seguranca usem sem SaaS externo. Poucas ferramentas de QA oferecem isso.

4. **Metricas end-to-end** -- Sprint (execucao) -> Status Report (comunicacao) -> Release (entrega). Nenhum concorrente cobre os tres em uma unica ferramenta.

### Ecossistema de integracoes (priorizado)

| Integracao | Tipo | Valor | Esforco |
|-----------|------|-------|---------|
| **Jira** (leitura de bugs) | Prioritaria | Reduz entrada manual | Medio |
| **Slack/Teams** (webhooks) | Prioritaria | Notificacoes onde o time ja esta | Baixo |
| **GitHub/GitLab** (CI status) | Estrategica | Atualiza builds automaticamente | Medio |
| **Azure DevOps** (work items) | Estrategica | Market share enterprise | Alto |
| **Grafana/Metabase** (metricas) | Diferencial | BI customizado | Baixo (via API) |

### Modelo de monetizacao sugerido

O ToStatos esta posicionado como "ToStatos Free" no path do repositorio, o que sugere intencao de ter versoes. Modelo recomendado:

| Tier | Preco | Inclui |
|------|-------|--------|
| **Community (Free)** | R$ 0 | Self-hosted, ate 3 squads, ate 10 usuarios, todas as features core |
| **Pro** | R$ 29/user/mes | Cloud hosted, squads ilimitados, API publica, integracao Jira/Slack, notificacoes, export PDF, dark mode |
| **Enterprise** | Sob consulta | SSO (SAML/OIDC), audit trail avancado, SLA, suporte dedicado, deploy on-premise assistido |

A IA local (PO Assistant) ficaria gratuita em todos os tiers -- e o diferencial competitivo, nao a fonte de receita.

---

**Assinatura:**
Marina Caldas
Product Manager Senior -- ToStatos
Abril 2026

---

Este documento cobre o diagnostico completo do produto, gaps identificados no codigo e modelo de dados, roadmap priorizado por RICE, 10 features detalhadas e visao estrategica de 12 meses. Os arquivos-chave consultados para esta analise foram:

- `/Users/jhonnyrobert/Documents/PROJETOS_IA/To-Statos-Free/Gestao_De_Metricas_QA/CLAUDE.md`
- `/Users/jhonnyrobert/Documents/PROJETOS_IA/To-Statos-Free/Gestao_De_Metricas_QA/documentacao/CONTEXTO_PROJETO.md`
- `/Users/jhonnyrobert/Documents/PROJETOS_IA/To-Statos-Free/Gestao_De_Metricas_QA/documentacao/BACKLOG_Q2.md`
- `/Users/jhonnyrobert/Documents/PROJETOS_IA/To-Statos-Free/Gestao_De_Metricas_QA/documentacao/Futuras-Features/FEATURE_PO_ASSISTANT_IA.md`
- `/Users/jhonnyrobert/Documents/PROJETOS_IA/To-Statos-Free/Gestao_De_Metricas_QA/src/modules/releases/services/releaseMetrics.ts` (motor de metricas nao exposto na UI)
- `/Users/jhonnyrobert/Documents/PROJETOS_IA/To-Statos-Free/Gestao_De_Metricas_QA/src/modules/releases/pages/ReleaseDashboard.tsx` (componentes nao renderizados)
- `/Users/jhonnyrobert/Documents/PROJETOS_IA/To-Statos-Free/Gestao_De_Metricas_QA/src/modules/squads/services/squadsService.ts` (modelo de permissoes completo)