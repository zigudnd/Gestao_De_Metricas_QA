# EPIC: Módulo Ferramentas de Planejamento

> **Epic ID:** TOOLS
> **Produto:** ToStatos — Gestão de Métricas QA
> **Autor:** Marina Caldas (PO)
> **Data de criação:** 05/04/2026
> **Status:** Em Refinamento
> **Prioridade:** Alta

---

## Descrição do Épico

O time de QA usa hoje 3-5 ferramentas externas para atividades de planejamento: Planning Poker (Scrum Poker Online), quadro colaborativo (Miro/FigJam), retrospectiva (EasyRetro), e notas compartilhadas. Cada uma exige login separado, link compartilhado, e os dados se perdem após a sessão.

O módulo **Ferramentas** centraliza tudo no ToStatos — onde o time já está, com os squads já configurados, e os dados persistidos automaticamente.

### O que o módulo FAZ

- **Planning Poker** — sessões em tempo real onde o time vota complexidade/esforço simultaneamente, com revelação sincronizada
- **Quadro Colaborativo** — canvas estilo Miro/FigJam com sticky notes, formas, conexões, texto e imagens que múltiplos usuários editam ao mesmo tempo
- **Retrospectiva** — board com colunas (O que foi bem / O que melhorar / Ações) com votação e agrupamento

### O que o módulo NÃO FAZ

- Não substitui Jira/Azure DevOps para gestão de backlog
- Não substitui Figma para design de interfaces
- Não é ferramenta de desenho vetorial — é canvas colaborativo simples

---

## Regras de Negócio Fundamentais

> **REGRA 1 — Sessões são vinculadas a Squads**
> Cada sessão de poker, quadro ou retro pertence a um squad. Membros do squad veem automaticamente.

> **REGRA 2 — Tempo real via Supabase Realtime**
> Todas as interações são sincronizadas em tempo real via WebSocket (postgres_changes). A infraestrutura já existe no projeto.

> **REGRA 3 — Persistência automática**
> Sessões ficam salvas — não se perdem ao fechar o browser. Histórico consultável.

> **REGRA 4 — Acesso por link**
> Além do acesso via squad, cada sessão gera um link compartilhável para convidados externos.

---

## Fases de Entrega

| Fase | Nome | Valor |
|------|------|-------|
| **Fase 1** | Planning Poker (MVP) | "Quanto esse item custa?" — resposta em 30 segundos |
| **Fase 2** | Quadro Colaborativo | "Vamos organizar as ideias juntos" |
| **Fase 3** | Retrospectiva | "O que aprendemos nessa sprint?" |

---

# FASE 1 — Planning Poker

---

## STORY-01: Infraestrutura do Módulo Ferramentas

**Como** desenvolvedor
**Quero** a infraestrutura base do módulo
**Para que** as features tenham onde ser construídas

### Critérios de Aceite

- [ ] **CA01** — Estrutura de diretórios:
```
src/modules/tools/
├── components/
│   ├── poker/
│   ├── board/
│   └── retro/
├── pages/
│   ├── ToolsHomePage.tsx
│   ├── PokerSessionPage.tsx
│   ├── BoardPage.tsx
│   └── RetroPage.tsx
├── services/
│   └── toolsPersistence.ts
├── store/
│   └── pokerStore.ts
└── types/
    └── tools.types.ts
```
- [ ] **CA02** — Rotas: `/tools`, `/tools/poker/:sessionId`, `/tools/board/:boardId`, `/tools/retro/:retroId`
- [ ] **CA03** — "Ferramentas" na Sidebar entre "Releases" e "Documentação"
- [ ] **CA04** — Migration Supabase: tabela `tool_sessions` com `id`, `type` (poker/board/retro), `squad_id`, `data JSONB`, `status`, `created_by`, `updated_at`
- [ ] **CA05** — Realtime habilitado na tabela
- [ ] **CA06** — Build passa sem erros

**Story Points:** 3

---

## STORY-02: Planning Poker — Criar Sessão

**Como** QA Lead ou Scrum Master
**Quero** criar uma sessão de Planning Poker
**Para que** o time possa estimar itens juntos

### Critérios de Aceite

- [ ] **CA01** — Botão "+ Nova Sessão" na ToolsHomePage, aba "Planning Poker"
- [ ] **CA02** — Modal de criação com campos: Título, Squad (select dos squads do usuário), Escala (Fibonacci: 1,2,3,5,8,13,21 | T-Shirt: P,M,G,GG | Customizado)
- [ ] **CA03** — Ao criar, navega para `/tools/poker/:sessionId`
- [ ] **CA04** — Sessão criada com status `aguardando` e lista de participantes vazia
- [ ] **CA05** — Link compartilhável gerado: `{base_url}/#/tools/poker/{sessionId}`
- [ ] **CA06** — Sessão salva no Supabase + localStorage

**Story Points:** 3

---

## STORY-03: Planning Poker — Sala de Votação

**Como** membro do squad
**Quero** participar de uma sessão de votação em tempo real
**Para que** eu possa dar minha estimativa

### Critérios de Aceite

- [ ] **CA01** — Tela dividida em 3 áreas: **Item em votação** (topo), **Cartas de voto** (centro), **Participantes** (lateral)
- [ ] **CA02** — O moderador (criador) digita o nome do item a ser votado
- [ ] **CA03** — Cada participante vê as cartas da escala escolhida (ex: 1, 2, 3, 5, 8, 13, 21, ?, ☕)
- [ ] **CA04** — Ao clicar em uma carta, o voto é registrado. A carta fica destacada (selecionada)
- [ ] **CA05** — O participante pode mudar o voto antes da revelação
- [ ] **CA06** — Na lateral, cada participante aparece com avatar + nome. Antes da revelação: ícone de "votou" (✓) ou "aguardando" (⏳). Sem mostrar o valor
- [ ] **CA07** — Todos os votos são sincronizados em tempo real via Supabase Realtime
- [ ] **CA08** — Ao entrar na sala, o usuário é adicionado automaticamente à lista de participantes

### Fora do escopo

- Não inclui timer de votação nesta story
- Não inclui votação anônima

**Story Points:** 8

---

## STORY-04: Planning Poker — Revelação e Resultado

**Como** moderador
**Quero** revelar os votos e ver o consenso
**Para que** o time chegue a uma estimativa

### Critérios de Aceite

- [ ] **CA01** — Botão "Revelar Votos" visível apenas para o moderador
- [ ] **CA02** — Ao revelar: todas as cartas viram simultaneamente com animação (flip card)
- [ ] **CA03** — Exibe o voto de cada participante ao lado do nome
- [ ] **CA04** — Painel de resultado mostra: Média, Mediana, Moda, Consenso (todos iguais? ✓/✗)
- [ ] **CA05** — Se não há consenso: highlight visual nos votos mais distantes (outliers)
- [ ] **CA06** — Botão "Nova Rodada" — reseta votos mas mantém o item
- [ ] **CA07** — Botão "Próximo Item" — salva resultado no histórico e limpa para novo item
- [ ] **CA08** — Revelação sincronizada — todos veem ao mesmo tempo via Realtime
- [ ] **CA09** — Participantes que não votaram aparecem como "Não votou"

**Story Points:** 5

---

## STORY-05: Planning Poker — Histórico da Sessão

**Como** QA Lead
**Quero** ver o histórico de itens votados na sessão
**Para que** eu tenha registro das estimativas

### Critérios de Aceite

- [ ] **CA01** — Painel lateral ou aba "Histórico" com lista de itens já votados
- [ ] **CA02** — Cada item mostra: nome, resultado final (média/consenso), votos individuais, número de rodadas
- [ ] **CA03** — Botão "Exportar" — gera texto formatado para colar no Jira/Azure (nome | estimativa | participantes)
- [ ] **CA04** — Sessão pode ser encerrada pelo moderador — status muda para `concluída`
- [ ] **CA05** — Sessões concluídas ficam acessíveis em modo somente leitura

**Story Points:** 3

---

## STORY-06: Planning Poker — Timer e Configurações

**Como** moderador
**Quero** controlar o tempo de votação
**Para que** a cerimônia não se estenda

### Critérios de Aceite

- [ ] **CA01** — Timer configurável: 30s, 1min, 2min, 5min, sem limite
- [ ] **CA02** — Timer visível para todos os participantes (countdown sincronizado)
- [ ] **CA03** — Ao expirar: revela automaticamente os votos
- [ ] **CA04** — Moderador pode pausar/reiniciar o timer
- [ ] **CA05** — Som/vibração opcional ao expirar (toggle nas configurações)

**Story Points:** 3

---

# FASE 2 — Quadro Colaborativo

---

## STORY-07: Quadro — Canvas Infinito

**Como** membro do squad
**Quero** um canvas infinito onde posso adicionar e mover elementos
**Para que** o time organize ideias visualmente

### Critérios de Aceite

- [ ] **CA01** — Canvas com pan (arrastar fundo) e zoom (scroll/pinch)
- [ ] **CA02** — Toolbar lateral com ferramentas: Sticky Note, Texto, Forma (retângulo, círculo), Linha/Seta, Imagem (upload)
- [ ] **CA03** — Sticky notes: 6 cores (amarelo, rosa, azul, verde, laranja, roxo), texto editável inline, redimensionável
- [ ] **CA04** — Drag & drop para mover qualquer elemento
- [ ] **CA05** — Seleção múltipla (Shift+click ou lasso) para mover grupo
- [ ] **CA06** — Undo/Redo (Cmd+Z / Cmd+Shift+Z)
- [ ] **CA07** — Grid snap opcional (alinhar elementos)
- [ ] **CA08** — Zoom fit: botão que enquadra todos os elementos na tela

### Notas técnicas

- Considerar usar **@tldraw/tldraw** (MIT) ou **Excalidraw** (MIT) como engine de canvas em vez de implementar do zero — ambos são React, suportam colaboração, e são open-source
- Se usar lib externa: encapsular num componente `<CollaborativeCanvas>` que recebe dados do Supabase store

**Story Points:** 13

---

## STORY-08: Quadro — Colaboração em Tempo Real

**Como** membro do squad
**Quero** ver as edições dos outros em tempo real
**Para que** trabalhemos juntos no mesmo quadro

### Critérios de Aceite

- [ ] **CA01** — Cursores dos outros participantes visíveis no canvas (nome + cor)
- [ ] **CA02** — Criação/movimentação/edição de elementos sincronizada em < 200ms
- [ ] **CA03** — Indicador de quem está editando cada elemento (borda colorida com nome)
- [ ] **CA04** — Conflito de edição simultânea: último-ganha com merge visual (sem perda de dados)
- [ ] **CA05** — Lista de participantes online visível no header
- [ ] **CA06** — Notificação quando alguém entra/sai do quadro

**Story Points:** 8

---

## STORY-09: Quadro — Templates e Export

**Como** QA Lead
**Quero** templates prontos e exportação
**Para que** eu não comece do zero toda vez

### Critérios de Aceite

- [ ] **CA01** — Templates: "Sprint Planning", "Mapa de Dependências", "Fluxo de Teste", "Brainstorm", "Em Branco"
- [ ] **CA02** — Exportar como PNG/JPG (html2canvas já existe no projeto)
- [ ] **CA03** — Duplicar quadro existente
- [ ] **CA04** — Quadros listados na ToolsHomePage com preview thumbnail

**Story Points:** 5

---

# FASE 3 — Retrospectiva

---

## STORY-10: Retro — Board com Colunas

**Como** Scrum Master
**Quero** um board de retrospectiva com colunas configuráveis
**Para que** o time reflita sobre a sprint

### Critérios de Aceite

- [ ] **CA01** — Templates: "Clássico" (O que foi bem / O que melhorar / Ações), "4L" (Liked / Learned / Lacked / Longed for), "Start-Stop-Continue", "Customizado"
- [ ] **CA02** — Cada coluna aceita cards com texto anônimo ou identificado (toggle do moderador)
- [ ] **CA03** — Cards criados em tempo real — todos veem aparecer instantaneamente
- [ ] **CA04** — Drag & drop entre colunas
- [ ] **CA05** — Timer por fase: Escrita (5min) → Discussão (10min) → Votação (3min) → Ações (5min)
- [ ] **CA06** — Moderador controla a fase atual

**Story Points:** 8

---

## STORY-11: Retro — Votação e Agrupamento

**Como** participante
**Quero** votar nos cards mais importantes e agrupar similares
**Para que** o time priorize o que discutir

### Critérios de Aceite

- [ ] **CA01** — Cada participante tem N votos (configurável, default: 3)
- [ ] **CA02** — Clicar num card consome 1 voto. Clicar de novo remove
- [ ] **CA03** — Contagem de votos visível em cada card
- [ ] **CA04** — Ordenação automática por votos (mais votados no topo)
- [ ] **CA05** — Arrastar um card sobre outro agrupa (merge visual com contagem combinada)
- [ ] **CA06** — Ao encerrar: exportar ações como lista (texto ou Jira-ready)

**Story Points:** 5

---

# RESUMO DE ESTIMATIVAS

## Fase 1 — Planning Poker (MVP)

| # | Título | Pts |
|---|--------|-----|
| 01 | Infraestrutura | 3 |
| 02 | Criar Sessão | 3 |
| 03 | Sala de Votação (tempo real) | 8 |
| 04 | Revelação e Resultado | 5 |
| 05 | Histórico da Sessão | 3 |
| 06 | Timer e Configurações | 3 |
| | **Subtotal** | **25** |

## Fase 2 — Quadro Colaborativo

| # | Título | Pts |
|---|--------|-----|
| 07 | Canvas Infinito | 13 |
| 08 | Colaboração Tempo Real | 8 |
| 09 | Templates e Export | 5 |
| | **Subtotal** | **26** |

## Fase 3 — Retrospectiva

| # | Título | Pts |
|---|--------|-----|
| 10 | Board com Colunas | 8 |
| 11 | Votação e Agrupamento | 5 |
| | **Subtotal** | **13** |

| | **TOTAL** | **64 pontos** |

---

# MAPA DE DEPENDÊNCIAS

```
STORY-01 (Infra)
    │
    ├──▶ STORY-02 (Criar Sessão)
    │        │
    │        ▼
    │    STORY-03 (Sala de Votação) ──▶ STORY-04 (Revelação)
    │        │                              │
    │        ▼                              ▼
    │    STORY-06 (Timer)              STORY-05 (Histórico)
    │
    ├──▶ STORY-07 (Canvas) ──▶ STORY-08 (Collab Realtime) ──▶ STORY-09 (Templates)
    │
    └──▶ STORY-10 (Retro Board) ──▶ STORY-11 (Votação)
```

---

# RISCOS

| Risco | Prob. | Impacto | Mitigação |
|-------|-------|---------|-----------|
| Canvas do zero é complexo demais | Alta | Atraso na Fase 2 | Usar tldraw/Excalidraw como engine |
| Supabase Realtime com muitos cursores causa lag | Média | UX degradada | Throttle de posição (50ms), enviar apenas delta |
| Conflitos de edição simultânea no quadro | Média | Perda de dados | CRDT ou last-write-wins com merge visual |
| Sessões de poker com 20+ pessoas | Baixa | Performance | Paginação de participantes, lazy render |

---

# RECOMENDAÇÃO

Começar pela **Fase 1 (Planning Poker)** — é a feature mais usada, mais simples de implementar, e demonstra o valor do tempo real sem a complexidade do canvas. Entrega em 2-3 sprints com velocity de ~13pts/sprint.

A Fase 2 (Quadro) depende fortemente da decisão sobre usar lib externa (tldraw/Excalidraw) vs implementar do zero. Recomendo avaliar tldraw antes de começar — se viável, reduz a STORY-07 de 13 para 5 pontos.
