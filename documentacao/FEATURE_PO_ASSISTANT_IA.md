# Feature: Modulo PO Assistant com IA Local

> **Status:** Planejado
> **Prioridade:** Alta
> **Estimativa total:** 7-9 dias de desenvolvimento
> **Ultima atualizacao:** Março 2026

---

## 1. Visao Geral

Modulo de assistencia ao Product Owner integrado ao ToStatos, utilizando IA local (Ollama + modelos open-source) para gerar historias de usuario, criterios de aceite, release notes e refinamento de backlog. A IA roda na maquina do usuario — sem custos de API, sem envio de dados para servidores externos.

### Problema que resolve

O PO e quem mais escreve texto estruturado no dia-a-dia (historias, criterios de aceite, DoR/DoD, release notes) e e quem menos tem ferramentas especificas no ToStatos hoje. O processo manual de escrita e repetitivo, consume tempo e varia em qualidade dependendo da experiencia do PO.

### Proposta de valor

- Gerar rascunhos de historias de usuario a partir de descricoes curtas
- Sugerir criterios de aceite baseados no contexto do squad e da sprint
- Refinar historias existentes (clareza, testabilidade, edge cases)
- Gerar release notes a partir dos itens concluidos do Status Report
- Decompor epicas em historias menores
- Tudo local, gratuito e sem dependencia de internet

---

## 2. Stack Tecnica

### Runtime de IA: Ollama

| Item | Detalhe |
|------|---------|
| **O que e** | Servidor local de IA que roda modelos open-source. API REST compativel com padrao OpenAI |
| **Custo** | Gratuito, open-source (MIT) |
| **Site** | https://ollama.ai |
| **API** | `http://localhost:11434/api/generate` (REST, streaming) |
| **Instalacao** | `brew install ollama` (macOS), script (Linux), installer (Windows) |

### Modelos recomendados

| Modelo | Tamanho | RAM minima | Qualidade PT-BR | Velocidade | Caso de uso |
|--------|---------|-----------|----------------|-----------|-------------|
| **Llama 3.2 3B** | 2.0 GB | 4 GB | Boa | ~20 tok/s | Padrao — roda em qualquer maquina |
| **Mistral 7B** | 4.1 GB | 8 GB | Muito boa | ~12 tok/s | Qualidade superior quando ha RAM |
| **Phi-3 Mini 3.8B** | 2.3 GB | 4 GB | Boa | ~18 tok/s | Alternativa leve, bom para instrucoes |
| **Llama 3.1 8B** | 4.7 GB | 8 GB | Excelente | ~10 tok/s | Melhor qualidade, maquinas potentes |

**Recomendacao padrao:** Llama 3.2 3B — equilibrio entre qualidade, velocidade e requisitos de hardware.

---

## 3. Arquitetura

### Fluxo de dados

```
┌─────────────────────────────────────────────────────┐
│ Browser (React)                                     │
│                                                     │
│  Modulo PO Assistant                                │
│  ├── StoryGenerator → input do usuario              │
│  ├── CriteriaAssistant → contexto da sprint         │
│  └── AiChat → prompt livre                          │
│       │                                             │
│       ▼                                             │
│  aiService.ts → POST /api/ai/generate               │
│       │                                             │
└───────│─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│ server.js (Express)                                 │
│                                                     │
│  POST /api/ai/generate → proxy com streaming        │
│  GET  /api/ai/status   → verifica Ollama + modelos  │
│  GET  /api/ai/models   → lista modelos disponiveis  │
│       │                                             │
│       ▼                                             │
│  Ollama (localhost:11434)                           │
│  └── Modelo local (ex: llama3.2:3b)                │
└─────────────────────────────────────────────────────┘
```

### Principio: IA e opcional

O modulo PO funciona 100% sem IA. Todas as funcionalidades de escrita manual (historias, DoR, DoD, release notes) funcionam normalmente. A IA e um "boost" — aparece como botao "Gerar com IA" quando o Ollama esta disponivel. Se nao estiver, o botao nao aparece.

---

## 4. Estrutura de Arquivos

```
CRIAR:
src/modules/po-assistant/
├── types/
│   └── poAssistant.types.ts        # Tipos: AiPrompt, AiResponse, Template
├── services/
│   ├── aiService.ts                # Client: streaming fetch para /api/ai/*
│   └── promptTemplates.ts          # Templates de prompt otimizados para PO
├── store/
│   └── poAssistantStore.ts         # Zustand: historico, config, modelo selecionado
├── components/
│   ├── AiStatusBadge.tsx           # Badge "IA disponivel" / "IA offline"
│   ├── AiChat.tsx                  # Chat panel com input + respostas streaming
│   ├── StoryGenerator.tsx          # Form: descricao curta → historia completa
│   ├── CriteriaAssistant.tsx       # Sugere criterios de aceite
│   ├── ReleaseNotesGenerator.tsx   # Gera release notes dos itens concluidos
│   ├── StoryRefiner.tsx            # Refina historia existente
│   └── PromptTemplateSelector.tsx  # Seletor de templates pre-definidos
└── pages/
    └── PoAssistantPage.tsx         # Pagina principal do modulo

MODIFICAR:
server.js                           # Novos endpoints /api/ai/*
src/app/routes.tsx                  # Nova rota /po-assistant
src/app/layout/Sidebar.tsx          # Novo item de navegacao
```

---

## 5. Endpoints da API

### POST /api/ai/generate

Proxy para Ollama com streaming de resposta.

**Request:**
```json
{
  "prompt": "Gere uma historia de usuario para login com biometria",
  "model": "llama3.2:3b",
  "context": {
    "squad": "WL - Consignado",
    "sprint": "Sprint 42",
    "dor": ["Historia tem criterios de aceite definidos..."],
    "dod": ["Codigo revisado por 1 dev..."]
  },
  "template": "userStory"
}
```

**Response:** Server-Sent Events (streaming)
```
data: {"token": "COMO"}
data: {"token": " um"}
data: {"token": " usuario"}
...
data: {"done": true, "totalTokens": 245}
```

### GET /api/ai/status

Verifica se Ollama esta rodando e quais modelos estao disponiveis.

**Response:**
```json
{
  "available": true,
  "models": [
    { "name": "llama3.2:3b", "size": "2.0 GB", "modified": "2026-03-15" }
  ]
}
```

### GET /api/ai/models

Lista todos os modelos instalados no Ollama.

**Response:**
```json
{
  "models": [
    { "name": "llama3.2:3b", "size": 2000000000, "digest": "abc123" },
    { "name": "mistral:7b", "size": 4100000000, "digest": "def456" }
  ]
}
```

---

## 6. Implementacao do server.js

```javascript
// ── IA: Proxy para Ollama ────────────────────────────────────────────────────

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

app.get('/api/ai/status', async (req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!r.ok) throw new Error('Ollama nao respondeu');
    const data = await r.json();
    return res.json({
      available: true,
      models: (data.models || []).map(m => ({
        name: m.name,
        size: m.size,
        modified: m.modified_at,
      })),
    });
  } catch {
    return res.json({ available: false, models: [] });
  }
});

app.post('/api/ai/generate', async (req, res) => {
  const { prompt, model, context, template } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt e obrigatorio' });

  // Montar system prompt com contexto do squad
  const systemPrompt = buildSystemPrompt(context, template);

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model || 'llama3.2:3b',
        prompt,
        system: systemPrompt,
        stream: true,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 1024,
        },
      }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'Ollama nao respondeu' });
    }

    // Stream a resposta
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      res.write(`data: ${chunk}\n\n`);
    }

    res.end();
  } catch (err) {
    return res.status(502).json({ error: 'Erro ao conectar com Ollama' });
  }
});

function buildSystemPrompt(context, template) {
  const base = `Voce e um assistente de Product Owner para times ageis de desenvolvimento de software.
Responda sempre em portugues brasileiro.
Seja direto, estruturado e orientado a valor de negocio.
Use formato Markdown quando apropriado.`;

  if (!context) return base;

  let extra = '';
  if (context.squad) extra += `\nSquad: ${context.squad}`;
  if (context.sprint) extra += `\nSprint atual: ${context.sprint}`;
  if (context.dor?.length) extra += `\nDefinition of Ready:\n${context.dor.map(d => '- ' + d).join('\n')}`;
  if (context.dod?.length) extra += `\nDefinition of Done:\n${context.dod.map(d => '- ' + d).join('\n')}`;

  return base + extra;
}
```

---

## 7. Templates de Prompt

### 7.1 Gerar Historia de Usuario

```
Gere uma historia de usuario completa a partir desta descricao:
"{input}"

Formato obrigatorio:
## [Titulo da Historia]

**COMO** [persona especifica]
**QUERO** [acao concreta e mensuravel]
**PARA** [valor de negocio claro]

**Contexto:**
> [1-2 frases explicando a situacao que motivou a historia]

**Criterios de aceite:**
- [ ] Dado [contexto], quando [acao], entao [resultado]
- [ ] Dado [contexto], quando [acao], entao [resultado]
- [ ] [cenario de erro]
- [ ] [cenario de empty state]

**Story Points sugeridos:** [1-13 Fibonacci]
**Prioridade sugerida:** [Alta/Media/Baixa]
```

### 7.2 Sugerir Criterios de Aceite

```
Dado o titulo da historia de usuario: "{title}"
E a descricao: "{description}"

Sugira 5 a 8 criterios de aceite claros e testaveis.
Use o formato Dado/Quando/Entao (Given/When/Then).
Inclua obrigatoriamente:
- 2 cenarios de happy path
- 2 cenarios de erro ou validacao
- 1 cenario de empty state ou first-time use
- 1 cenario de edge case
```

### 7.3 Refinar Historia

```
Refine esta historia de usuario existente:

{story}

Melhore os seguintes aspectos:
1. Clareza — a persona e especifica? A acao e mensuravel?
2. Testabilidade — os criterios de aceite sao automatizaveis?
3. Completude — faltam cenarios de erro? Edge cases?
4. Escopo — a historia e pequena o suficiente para 1 sprint?

Se a historia for muito grande (>8 story points), sugira como decompo-la.
Mantenha o formato COMO/QUERO/PARA.
```

### 7.4 Gerar Release Notes

```
Gere release notes a partir destes itens concluidos:

{items}

Formato:
## Release Notes — {version}

### Novas funcionalidades
- **[Nome]** — descricao curta do impacto para o usuario

### Melhorias
- **[Nome]** — o que melhorou

### Correcoes
- **[Nome]** — o que foi corrigido

Use linguagem voltada para o usuario final, nao para desenvolvedores.
```

### 7.5 Decompor Epica

```
Decomponha esta epica em historias de usuario menores:

Epica: "{epic}"

Regras:
- Cada historia deve ser entregavel em 1 sprint (max 8 story points)
- Cada historia deve ter valor independente para o usuario
- Ordene por dependencia (historias que desbloqueiam outras primeiro)
- Para cada historia, inclua: titulo, persona, acao, valor, story points estimados
```

### 7.6 Gerar DoR/DoD

```
Sugira criterios de Definition of Ready e Definition of Done
para um squad de {team_type} que trabalha com {stack}.

Contexto do squad:
- Time: {team_size} pessoas
- Stack: {stacks}
- Metodologia: Scrum com sprints de {sprint_days} dias

Formato:
## Definition of Ready (DoR)
1. ...

## Definition of Done (DoD)
1. ...

Inclua 5-7 criterios para cada, do mais importante para o menos.
```

---

## 8. Componentes do Frontend

### 8.1 AiStatusBadge

Badge pequeno que mostra se a IA esta disponivel. Aparece no header do modulo PO.

```
[● IA disponivel — llama3.2:3b]   (verde)
[○ IA offline]                     (cinza, com tooltip explicando como instalar)
```

### 8.2 StoryGenerator

```
┌─────────────────────────────────────────────────┐
│ Gerador de Historias                    [● IA]  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Descreva o que voce precisa:                    │
│ ┌─────────────────────────────────────────────┐ │
│ │ Login com biometria no app mobile           │ │
│ │ para usuarios que ja tem conta cadastrada   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Modelo: [llama3.2:3b ▾]  [Gerar historia]      │
│                                                 │
│ ── Resultado ──────────────────────────────────│
│ ## Login Biometrico                             │
│                                                 │
│ **COMO** usuario com conta existente            │
│ **QUERO** fazer login usando minha biometria    │
│ **PARA** acessar o app sem digitar senha...     │
│ ...                                             │
│                                                 │
│ [Copiar] [Inserir no Report] [Refinar]          │
└─────────────────────────────────────────────────┘
```

### 8.3 AiChat

Chat livre com contexto do squad. O PO pode perguntar qualquer coisa relacionada ao produto.

```
┌─────────────────────────────────────────────────┐
│ Assistente PO                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ > Como posso melhorar essa historia?            │
│                                                 │
│ IA: Sua historia tem 3 pontos de melhoria...    │
│                                                 │
│ > Sugira edge cases para o fluxo de pagamento   │
│                                                 │
│ IA: Considere os seguintes cenarios:            │
│ 1. Timeout da operadora de cartao               │
│ 2. Saldo insuficiente...                        │
│                                                 │
│ ┌─────────────────────────────────────┐ [Enviar]│
│ │ Digite sua pergunta...              │         │
│ └─────────────────────────────────────┘         │
└─────────────────────────────────────────────────┘
```

### 8.4 PromptTemplateSelector

Seletor visual de templates pre-definidos com descricao de cada um.

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📝 Historia  │  │ ✅ Criterios │  │ 🔄 Refinar   │
│ de Usuario   │  │ de Aceite    │  │ Historia     │
│              │  │              │  │              │
│ Gerar a      │  │ Sugerir CAs  │  │ Melhorar     │
│ partir de    │  │ para uma     │  │ clareza e    │
│ descricao    │  │ historia     │  │ completude   │
└──────────────┘  └──────────────┘  └──────────────┘

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📋 Release   │  │ 🧩 Decompor  │  │ 📐 DoR/DoD   │
│ Notes        │  │ Epica        │  │ Sugeridos    │
│              │  │              │  │              │
│ Gerar a      │  │ Quebrar em   │  │ Criterios    │
│ partir dos   │  │ historias    │  │ para o       │
│ itens        │  │ menores      │  │ squad        │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 9. Integracao com Dados Existentes

O modulo PO se alimenta dos dados ja existentes no ToStatos:

| Dado | Fonte | Uso na IA |
|------|-------|-----------|
| Nome do squad | `activeSquadStore` | Contexto no system prompt |
| Sprint atual | `sprintStore` | Contexto temporal |
| DoR / DoD | `squadConfigStore` | Referencia para criterios de aceite |
| Itens do Status Report | `statusReportStore` | Gerar release notes |
| Membros do time | `squadConfigStore` | Contexto de capacidade |
| Cerimonias | `squadConfigStore` | Contexto de processo |
| Bugs resolvidos | `sprintStore` | Contexto de correcoes para release notes |
| Features concluidas | `sprintStore` | Contexto de entregas |

---

## 10. Setup e Instalacao

### Pre-requisitos

- Ollama instalado na maquina
- Pelo menos 4 GB de RAM livre (para modelo 3B)
- 2 GB de espaco em disco (para o modelo)

### Passo a passo

```bash
# 1. Instalar Ollama
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Baixar de https://ollama.ai/download

# 2. Baixar o modelo recomendado (~2 GB, uma vez)
ollama pull llama3.2:3b

# 3. Verificar instalacao
ollama list
# NAME            SIZE
# llama3.2:3b     2.0 GB

# 4. Iniciar o Ollama (roda como servico em background)
ollama serve

# 5. Testar
curl http://localhost:11434/api/tags
# {"models":[{"name":"llama3.2:3b",...}]}
```

### Comandos no package.json

```json
{
  "scripts": {
    "ai:setup": "echo 'Instale o Ollama: https://ollama.ai' && ollama pull llama3.2:3b",
    "ai:start": "ollama serve",
    "ai:status": "curl -s http://localhost:11434/api/tags | node -e \"const d=require('fs').readFileSync('/dev/stdin','utf8');const j=JSON.parse(d);console.log(j.models?.length+' modelos disponiveis')\""
  }
}
```

### Variaveis de ambiente

| Variavel | Default | Descricao |
|----------|---------|-----------|
| `OLLAMA_URL` | `http://localhost:11434` | URL do servidor Ollama |
| `AI_DEFAULT_MODEL` | `llama3.2:3b` | Modelo padrao |
| `AI_MAX_TOKENS` | `1024` | Limite de tokens por resposta |
| `AI_TEMPERATURE` | `0.7` | Criatividade (0=deterministico, 1=criativo) |

---

## 11. Fases de Implementacao

### Fase 1 — Infraestrutura (2-3 dias)

**Objetivo:** Backend funcional + deteccao de Ollama

| Item | Tipo | Esforco |
|------|------|---------|
| Endpoints `/api/ai/generate`, `/api/ai/status`, `/api/ai/models` | Backend | 3h |
| `aiService.ts` — client com streaming fetch | Frontend | 2h |
| `poAssistantStore.ts` — estado do modulo | Frontend | 1h |
| `AiStatusBadge.tsx` — deteccao visual de Ollama | Frontend | 1h |
| Documentacao de instalacao no README | Docs | 1h |
| Testes manuais de integracao | QA | 2h |

**Criterios de aceite:**
- [ ] `GET /api/ai/status` retorna `available: true/false` corretamente
- [ ] `POST /api/ai/generate` faz streaming da resposta
- [ ] Badge verde/cinza no frontend reflete estado do Ollama
- [ ] Funciona sem Ollama (fallback graceful)

### Fase 2 — Gerador de Historias (2-3 dias)

**Objetivo:** PO consegue gerar historias de usuario com IA

| Item | Tipo | Esforco |
|------|------|---------|
| `promptTemplates.ts` — 6 templates otimizados | Frontend | 2h |
| `StoryGenerator.tsx` — form + resultado streaming | Frontend | 4h |
| `CriteriaAssistant.tsx` — sugere CAs | Frontend | 2h |
| `PromptTemplateSelector.tsx` — seletor visual | Frontend | 2h |
| `PoAssistantPage.tsx` — pagina principal | Frontend | 2h |
| Rota `/po-assistant` + nav na Sidebar | Frontend | 30min |
| Integracao com contexto do squad | Frontend | 2h |

**Criterios de aceite:**
- [ ] PO digita descricao curta e recebe historia formatada
- [ ] Resposta aparece em streaming (efeito "digitando")
- [ ] Botao "Copiar" copia para clipboard
- [ ] Contexto do squad (DoR/DoD) e usado no prompt
- [ ] Funciona com diferentes modelos instalados

### Fase 3 — Assistente Contextual (2-3 dias)

**Objetivo:** IA integrada com dados do sistema

| Item | Tipo | Esforco |
|------|------|---------|
| `AiChat.tsx` — chat livre com historico | Frontend | 4h |
| `ReleaseNotesGenerator.tsx` — gera a partir dos itens | Frontend | 3h |
| `StoryRefiner.tsx` — melhora historia existente | Frontend | 2h |
| Integracao com itens do Status Report | Frontend | 2h |
| Integracao com bugs/features da Sprint | Frontend | 2h |
| Selecao de modelo no frontend | Frontend | 1h |

**Criterios de aceite:**
- [ ] Chat com historico de conversas
- [ ] Release notes geradas a partir de itens "Implantados"
- [ ] PO pode refinar historia existente
- [ ] Seletor de modelo funciona

---

## 12. Riscos e Mitigacoes

| # | Risco | Probabilidade | Impacto | Mitigacao |
|---|-------|:---:|:---:|-----------|
| 1 | Maquina do usuario nao suporta (pouca RAM) | Media | Medio | Detectar em `/api/ai/status`. Badge "IA offline" com link para requisitos. Modulo funciona sem IA. |
| 2 | Qualidade das respostas em PT-BR | Baixa | Medio | Llama 3.2 e treinado em PT-BR. Prompt engineering com system prompt fixo. Templates otimizados. |
| 3 | Ollama nao instalado pelo usuario | Alta | Baixo | Modulo PO funciona 100% sem IA (modo manual). IA e um "boost". Setup em 2 comandos. |
| 4 | Tempo de resposta lento em maquinas fracas | Media | Baixo | Streaming — mostra resposta conforme gera. Modelo 3B e rapido (~15-20 tok/s em hardware moderno). |
| 5 | Modelo desatualizado ou removido | Baixa | Baixo | `/api/ai/status` verifica modelos disponiveis. Frontend adapta opcoes. |
| 6 | Respostas imprecisas para dominio especifico | Media | Medio | Templates bem construidos + contexto do squad minimizam. PO sempre revisa antes de usar. |

---

## 13. Metricas de Sucesso

| Metrica | Alvo | Como medir |
|---------|------|-----------|
| Adocao | 60% dos POs usam em 30 dias | Contador de chamadas `/api/ai/generate` |
| Qualidade | 70% das historias geradas sao usadas sem reescrita total | Survey com POs |
| Velocidade | Reducao de 50% no tempo de escrita de historias | Comparacao antes/depois |
| Satisfacao | NPS > 8 do modulo | Survey |

---

## 14. Benchmarks de Referencia

### Linear AI

- Assistente de escrita integrado a issues
- Sugere titulos, descricoes e labels automaticamente
- Usa modelo cloud (nao local) — diferencial do ToStatos e ser local

### Notion AI

- Assistente contextual dentro de documentos
- Gera, resume e traduz texto
- Modelo cloud com custo mensal — ToStatos sera gratuito

### GitHub Copilot for Docs

- Gera documentacao a partir de codigo
- Contexto do repositorio alimenta as sugestoes
- Referencia para integracao contextual (usar dados do sistema como contexto)

---

## 15. Decisoes em Aberto

1. **O modulo PO deve ser uma aba dentro de Status Report ou uma pagina separada na sidebar?**
   - Recomendacao: pagina separada (`/po-assistant`) — escopo independente de reports

2. **Historico de conversas persiste entre sessoes?**
   - Recomendacao: sim, via localStorage (mesmo padrao do sistema)

3. **Limite de tokens por request?**
   - Recomendacao: 1024 tokens (~500 palavras) como padrao, configuravel

4. **O PO pode compartilhar uma historia gerada com o time?**
   - Futuro: botao "Inserir no Status Report" que cria um item com o texto gerado

---

## 16. Navegacao no Sistema

```
Sidebar:
  🎯 Cobertura QA
  📄 Status Report
  🤖 PO Assistant        ← NOVO
  📋 Cadastros
  📖 Docs
```

### Rotas

```
/po-assistant                    → Pagina principal com templates
/po-assistant/chat               → Chat livre com IA
/po-assistant/generate           → Gerador de historias
```

---

## 17. Exemplo de Uso Completo

### Cenario: PO precisa escrever historia de login biometrico

1. PO abre **PO Assistant** na sidebar
2. Seleciona template **"Historia de Usuario"**
3. Digita: "Login com biometria no app mobile para usuarios existentes"
4. IA gera:

```markdown
## Login Biometrico Mobile

**COMO** usuario com conta existente no app
**QUERO** fazer login usando biometria (Face ID / Touch ID)
**PARA** acessar minha conta de forma rapida e segura sem digitar senha

**Contexto:**
> Usuarios frequentes do app precisam abrir o app varias vezes ao dia.
> Digitar email e senha toda vez gera friccao e aumenta o abandono.

**Criterios de aceite:**
- [ ] Dado usuario com biometria cadastrada no device, quando abrir o app, entao exibe opcao "Entrar com biometria"
- [ ] Dado usuario autenticou com biometria, quando a validacao for positiva, entao redireciona para a home
- [ ] Dado usuario falhou na biometria 3 vezes, quando tentar novamente, entao exibe formulario de email/senha
- [ ] Dado device sem biometria disponivel, quando abrir o app, entao nao exibe opcao biometrica
- [ ] Dado usuario nunca fez login antes, quando abrir o app, entao exibe apenas formulario padrao

**Story Points sugeridos:** 5
**Prioridade sugerida:** Alta
```

5. PO clica **"Copiar"** e cola no Jira/Azure
6. Ou clica **"Inserir no Report"** para adicionar ao Status Report como item

---

*Documento gerado por Marina Caldas (PM Senior) com consulta tecnica ao time de desenvolvimento.*
*Ultima revisao: Marco 2026*
