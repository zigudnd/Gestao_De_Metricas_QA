# ToStatos — QA Metrics Dashboard

Plataforma de gestão de métricas QA para acompanhamento de sprints. Centraliza KPIs, progresso de testes, bugs, impedimentos e alinhamentos em um único painel. Suporta uso individual (offline) e colaborativo em tempo real (via Supabase).

**Stack:** React 19 + TypeScript · Vite 6 · Zustand · Chart.js · Supabase (PostgreSQL + Realtime)

---

## Índice

1. [Pré-requisitos](#1-pré-requisitos)
2. [Instalação](#2-instalação)
3. [Modo Individual — somente localStorage](#3-modo-individual--somente-localstorage)
4. [Modo Colaborativo — Supabase local com Docker](#4-modo-colaborativo--supabase-local-com-docker)
5. [Modo Colaborativo — Supabase Cloud (produção)](#5-modo-colaborativo--supabase-cloud-produção)
6. [Variáveis de ambiente](#6-variáveis-de-ambiente)
7. [Estrutura do projeto](#7-estrutura-do-projeto)
8. [Como funciona a persistência](#8-como-funciona-a-persistência)
9. [Principais funcionalidades](#9-principais-funcionalidades)
10. [Deploy](#10-deploy)

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Como verificar |
|---|---|---|
| **Node.js** | 18 LTS | `node --version` |
| **npm** | 9 | `npm --version` |
| **Docker Desktop** | qualquer | `docker --version` |
| **Supabase CLI** | qualquer | `supabase --version` |
| **Navegador** | Chrome / Edge / Firefox atual | — |

> **Instalar Docker Desktop:** https://www.docker.com/products/docker-desktop/
> **Instalar Supabase CLI (macOS):** `brew install supabase/tap/supabase`

---

## 2. Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/zigudnd/Gestao_De_Metricas_QA.git
cd Gestao_De_Metricas_QA

# 2. Instale as dependências
npm install
```

---

## 3. Modo Individual — somente localStorage

Use este modo se quiser rodar o projeto sozinho, sem banco de dados, sem Docker.

```bash
# Suba o frontend
npm run dev:client
```

Acesse: **http://localhost:5173**

Os dados ficam salvos no `localStorage` do navegador. Nenhuma configuração adicional necessária.

---

## 4. Modo Colaborativo — Supabase local com Docker

Use este modo para trabalhar em equipe na mesma rede local, sem precisar de internet.

### Passo 1 — Suba o banco de dados local

```bash
# Na raiz do projeto, inicie o Supabase (Docker)
supabase start
```

Na primeira execução, o Docker baixa as imagens (pode demorar alguns minutos). Nas execuções seguintes, sobe em segundos.

Ao terminar, o terminal exibe as credenciais:

```
╭──────────────────────────────────────────────────────╮
│  Project URL  │  http://127.0.0.1:54321              │
│  Publishable  │  sb_publishable_XXXX                 │
╰──────────────────────────────────────────────────────╯
```

### Passo 2 — Configure o `.env`

Crie o arquivo `.env` na raiz do projeto com os valores exibidos pelo `supabase start`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_XXXX
```

> O arquivo `.env` já vem preenchido com as credenciais padrão do Supabase local. Se as suas forem diferentes, atualize.

### Passo 3 — Aplique a migration (cria a tabela `sprints`)

```bash
supabase db push --local
```

Confirme com `Y` quando solicitado. Isso cria a tabela `sprints` no PostgreSQL local.

### Passo 4 — Suba o frontend

```bash
npm run dev:client
```

Acesse: **http://localhost:5173**

### Passo 5 — Acesso de outros usuários na rede

Para que outros computadores na mesma rede acessem o dashboard:

```bash
# Suba o Vite expondo na rede local
npm run dev:client -- --host
```

O terminal exibirá o IP da máquina (ex: `http://192.168.1.10:5173`). Compartilhe esse endereço com a equipe.

> **Importante:** todos devem apontar o `.env` para o IP da máquina que está rodando o Supabase.
> Ex: `VITE_SUPABASE_URL=http://192.168.1.10:54321`

### Parar e retomar

```bash
# Parar o Supabase (dados ficam salvos no disco)
supabase stop

# Retomar depois
supabase start
```

**Os dados persistem** entre reinicializações. O Docker usa volumes no disco local — os dados só são perdidos se você deletar o volume manualmente.

---

## 5. Modo Colaborativo — Supabase Cloud (produção)

Use este modo quando tiver um servidor dedicado (pod, VM, Kubernetes) ou quiser usar o Supabase hospedado na nuvem.

### Opção A: Supabase Cloud (supabase.com)

1. Crie uma conta em https://supabase.com e um novo projeto
2. No painel do projeto, vá em **Settings → API** e copie:
   - `Project URL`
   - `anon public key`
3. Aplique a migration:
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```
4. Atualize o `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Opção B: Self-hosted (Docker em servidor)

Execute o `supabase start` no servidor e aponte o `.env` para o IP público ou domínio do servidor:

```env
VITE_SUPABASE_URL=http://SEU_SERVIDOR_IP:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_XXXX
```

---

## 6. Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Para modo colaborativo | URL da API do Supabase |
| `VITE_SUPABASE_ANON_KEY` | Para modo colaborativo | Chave pública (anon/publishable) |

> Se as variáveis não estiverem definidas, o app roda normalmente em modo offline (somente `localStorage`).

---

## 7. Estrutura do projeto

```
src/
├── lib/
│   └── supabase.ts                  # Cliente Supabase (singleton)
├── app/
│   ├── components/                  # Modais compartilhados
│   ├── layout/                      # AppShell, Sidebar, Topbar, SaveToast
│   └── pages/                       # DocsPage
├── modules/sprints/
│   ├── components/dashboard/        # Tabs: Overview, Features, Bugs, Config, Notes...
│   ├── pages/
│   │   ├── HomePage.tsx             # Lista de sprints
│   │   ├── SprintDashboard.tsx      # Dashboard principal
│   │   └── ComparePage.tsx          # Comparação entre sprints
│   ├── services/
│   │   ├── persistence.ts           # Toda a lógica de dados (localStorage + Supabase)
│   │   ├── compareService.ts        # KPIs para comparação
│   │   └── exportService.ts         # Export PNG e JSON
│   ├── store/sprintStore.ts         # Zustand store central
│   └── types/sprint.types.ts        # Tipos TypeScript
supabase/
├── config.toml                      # Configuração do Supabase local
└── migrations/
    └── 20260326000000_create_sprints.sql  # Tabela sprints + Realtime
```

---

## 8. Como funciona a persistência

O app usa uma arquitetura em camadas:

```
Usuário edita → _commit (Zustand)
                    ├── saveToStorage()          → localStorage (imediato, sync)
                    ├── upsertSprintInMasterIndex() → localStorage (imediato, sync)
                    └── queueRemotePersist()     → Supabase (debounce 700ms, async)

Outro usuário salva → Supabase Realtime (WebSocket)
                          └── atualiza localStorage + Zustand store
                              → tela do colega atualiza em ~200ms
```

**Na inicialização do app** (`AppShell`), `syncAllFromSupabase()` é chamado:
- Busca todas as sprints do Supabase
- Popula o `localStorage` com os dados remotos
- Garante que sprints criadas por outros usuários apareçam na lista

**Ao abrir uma sprint** (`SprintDashboard`):
1. Tenta carregar do Supabase (`loadFromServer`)
2. Fallback para `localStorage` se Supabase não responder
3. Registra subscription Realtime para aquela sprint

**Ao fechar uma sprint** (`resetSprint`): a subscription Realtime é cancelada.

---

## 9. Principais funcionalidades

- **QA Health Score** — score ponderado com penalidades configuráveis (bugs críticos, retestes, bloqueios, atraso)
- **Burndown Chart** — acompanhamento diário de execução vs meta
- **KPIs em tempo real** — Testes Executáveis, Capacidade Real, Bugs Abertos, MTTR, Índice de Retrabalho
- **Gestão de Casos de Teste** — Suites, Funcionalidades, Cenários Gherkin com status por dia
- **Gestão de Bugs** — severidade, stack, responsável, MTTR, retestes
- **Bloqueios de Execução** — registro de impedimentos com horas bloqueadas
- **Comparativo entre Sprints** — 9 gráficos de evolução histórica
- **Exportação** — relatório em imagem (PNG) e backup em JSON
- **Colaboração em tempo real** — múltiplos usuários na mesma sprint simultaneamente
- **Modo offline** — funciona sem Supabase, dados locais no navegador

---

## 10. Deploy

### Build de produção

```bash
npm run build
# Arquivos gerados em /dist — sirva com qualquer servidor estático (nginx, Caddy, etc.)
```

### Railway / Render / Fly.io

1. Conecte o repositório
2. Configure as variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) apontando para o Supabase Cloud
3. Comando de build: `npm run build`
4. Pasta de saída: `dist`

### Docker (containerizar o frontend)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

```bash
docker build -t tostatos .
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=https://xxxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=eyJ... \
  tostatos
```

---

## Autor

Desenvolvido por **[Jhonny Robert](https://www.linkedin.com/in/jhonny-robert/)**
