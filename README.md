# ToStatos — Hub de Qualidade | Plataforma de Inteligência de Qualidade de Software

Hub de Qualidade completo para times de QA e engenharia de software. Centraliza KPIs de sprints, gestao de bugs, impedimentos, alinhamentos, status reports semanais com Gantt, pipeline de releases multi-fase, gestao de PRs, API publica REST, audit trail e cadastro de squads com permissoes granulares. Suporta uso individual (offline), colaborativo local (Docker) e cloud (Supabase Cloud) com sincronizacao em tempo real. Tambem referenciado como QA Metrics Dashboard.

**Stack:** React 19 + TypeScript 5.9 + Vite 6 + Tailwind CSS v4 + Zustand 5 + Chart.js 4 + Supabase (PostgreSQL + Auth + Realtime) + Express 4 + Playwright 1.58

---

## Indice

1. [Acesso rapido](#1-acesso-rapido)
2. [Pre-requisitos](#2-pre-requisitos)
3. [Instalacao](#3-instalacao)
4. [Modos de operacao](#4-modos-de-operacao)
5. [Variaveis de ambiente](#5-variaveis-de-ambiente)
6. [Autenticacao e Permissoes](#6-autenticacao-e-permissoes)
7. [Estrutura do projeto](#7-estrutura-do-projeto)
8. [Funcionalidades](#8-funcionalidades)
9. [Deploy](#9-deploy)

---

## 1. Acesso rapido

### Credenciais padrao

| Usuario | Email | Senha |
|---------|-------|-------|
| **Admin** | `admin@tostatos.com` | `Admin@123!Ts` |
| **Novos usuarios** | definido pelo admin | `Mudar@123!Ts` (troca obrigatoria no primeiro login) |

> O usuario admin e criado pelo script `bash setup-admin.sh` ou via API (veja a secao 4).
> Novos usuarios sao criados pelo admin na aba **Cadastros > Usuarios**.

### Comandos essenciais

```bash
npm install          # instalar dependencias
npm run dev:client   # iniciar frontend (porta 5173)
npm run dev          # iniciar backend Express (porta 3000)
npm run build        # build de producao
npm run typecheck    # verificar tipos TypeScript
```

---

## 2. Pre-requisitos

| Ferramenta | Versao minima | Como verificar |
|---|---|---|
| **Node.js** | 18 LTS | `node --version` |
| **npm** | 9 | `npm --version` |
| **Docker Desktop** | qualquer | `docker --version` |
| **Supabase CLI** | qualquer | `supabase --version` |
| **Navegador** | Chrome / Edge / Firefox atual | — |

> Docker e Supabase CLI sao necessarios apenas para o **modo colaborativo**. O modo offline funciona sem eles.

### Instalando Docker Desktop

#### macOS

1. Acesse https://www.docker.com/products/docker-desktop/
2. Baixe o instalador para Mac (Apple Silicon ou Intel — verifique seu chip em  → Sobre este Mac)
3. Abra o `.dmg` e arraste o **Docker** para a pasta **Aplicativos**
4. Abra o Docker Desktop pela primeira vez — ele pedira permissao de sistema
5. Aguarde o Docker inicializar (icone na barra de menu para de animar)
6. Verifique:
   ```bash
   docker --version
   # Docker version 27.x.x ou superior
   ```

#### Windows

1. Acesse https://www.docker.com/products/docker-desktop/
2. Baixe o instalador para Windows
3. Execute o instalador. Aceite a opcao **"Use WSL 2 instead of Hyper-V"** (recomendado)
4. Reinicie o computador quando solicitado
5. Abra o Docker Desktop — na primeira execucao ele pode pedir para instalar/atualizar o WSL 2:
   ```powershell
   # Se solicitado, execute no PowerShell como administrador:
   wsl --install
   # Reinicie novamente
   ```
6. Verifique:
   ```powershell
   docker --version
   ```

> **Erro comum no Windows:** "WSL 2 installation is incomplete" — execute `wsl --update` no PowerShell como administrador e reinicie o Docker Desktop.

#### Linux (Ubuntu/Debian)

```bash
# 1. Remova versoes antigas
sudo apt remove docker docker-engine docker.io containerd runc 2>/dev/null

# 2. Adicione o repositorio oficial
sudo apt update
sudo apt install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 3. Instale o Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Adicione seu usuario ao grupo docker (para rodar sem sudo)
sudo usermod -aG docker $USER
newgrp docker

# 5. Verifique
docker --version
docker run hello-world
```

### Instalando o Supabase CLI

#### macOS (Homebrew)

```bash
brew install supabase/tap/supabase
supabase --version
```

#### Windows (Scoop)

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
supabase --version
```

#### Linux (Homebrew ou binario)

```bash
# Via Homebrew (se instalado)
brew install supabase/tap/supabase

# Ou via download direto
curl -sSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar xz
sudo mv supabase /usr/local/bin/
supabase --version
```

### Verificacao final

```bash
node --version        # v18+ ou v20+
npm --version         # 9+
docker --version      # 27+
supabase --version    # 1.x+
```

> **Dica:** o Docker Desktop precisa estar **rodando** (nao apenas instalado) antes de executar `supabase start`. Verifique o icone na barra de sistema.

---

## 3. Instalacao

```bash
# 1. Clone o repositorio
git clone https://github.com/zigudnd/Gestao_De_Metricas_QA.git
cd Gestao_De_Metricas_QA

# 2. Instale as dependencias
npm install
```

---

## 4. Modos de operacao

O ToStatos suporta tres modos de operacao, escolhidos pela presenca (ou ausencia) das variaveis de ambiente.

### Modo Offline — somente localStorage

Use este modo para rodar sozinho em qualquer computador, sem banco de dados, sem Docker, sem Supabase.

```bash
# 1. Clone o repositorio
git clone https://github.com/zigudnd/Gestao_De_Metricas_QA.git
cd Gestao_De_Metricas_QA

# 2. Instale as dependencias
npm install

# 3. Suba o frontend
npm run dev:client
```

Acesse: **http://localhost:5173**

Dados ficam salvos no `localStorage` do navegador. O sistema de autenticacao nao e ativado — todas as funcionalidades estao disponiveis sem login.

**Opcional — backend Express (persistencia em arquivos JSON locais):**

```bash
# Em outro terminal
npm run dev
```

Isso sobe o server na porta 3000 com storage local na pasta `data/`. Nao precisa de `.env` — o backend detecta automaticamente que Supabase nao esta configurado e usa arquivos locais.

> **Requisitos minimos:** Node.js 18+ e npm 9+. Nenhuma outra ferramenta e necessaria.

---

### Modo Colaborativo Local — Supabase com Docker

Use este modo para trabalhar em equipe na mesma rede, sem precisar de internet.

**Passo 1 — Suba o banco de dados local**

```bash
supabase start
```

Na primeira execucao, o Docker baixa as imagens (pode demorar alguns minutos). Para consultar as credenciais: `supabase status`.

**Passo 2 — Configure o `.env`**

Crie o arquivo `.env` na raiz com os valores exibidos pelo `supabase start`:

```env
# Frontend (Vite)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key do supabase status>

# Backend (server.js)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key do supabase status>

# Opcional
CORS_ORIGINS=http://localhost:5173
STORAGE_TYPE=supabase
PORT=3000
```

**Passo 3 — Aplique as migrations (22 no total)**

```bash
supabase db push --local
```

Confirme com `Y` quando solicitado. Isso cria todas as tabelas, triggers, RLS policies, RPCs e seed data.

**Passo 4 — Crie o usuario admin**

```bash
# Opcao 1: Script automatizado
bash setup-admin.sh

# Opcao 2: Manual via API
node server.js &
curl -X POST http://localhost:3000/api/admin/create-user \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@tostatos.com","display_name":"Admin"}'
```

**Passo 5 — Suba frontend e backend**

```bash
npm run dev:client   # frontend na porta 5173
npm run dev          # backend na porta 3000 (em outro terminal)
```

Acesse: **http://localhost:5173**

**Passo 6 — Acesso de outros na rede**

```bash
npm run dev:client -- --host
```

O terminal exibira o IP da maquina (ex: `http://192.168.1.10:5173`). Outros computadores devem apontar `VITE_SUPABASE_URL` para o IP da maquina que roda o Supabase.

**Parar e retomar**

```bash
supabase stop    # dados ficam salvos no disco
supabase start   # retomar depois
```

---

### Modo Cloud — Supabase Cloud (producao)

**Opcao A: Supabase Cloud (supabase.com)**

1. Crie uma conta em https://supabase.com e um novo projeto
2. No painel do projeto, va em **Settings > API** e copie: `Project URL`, `anon public key`, `service_role key`
3. Aplique as migrations:
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```
4. Atualize o `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   CORS_ORIGINS=https://seu-dominio.com
   ```

**Opcao B: Self-hosted (Docker em servidor)**

Execute `supabase start` no servidor e aponte o `.env` para o IP publico ou dominio do servidor.

---

## 5. Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `VITE_SUPABASE_URL` | Modo colaborativo | URL da API do Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Modo colaborativo | Chave publica anon (frontend) |
| `SUPABASE_URL` | Backend | URL do Supabase (server.js) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Chave service_role para admin API |
| `CORS_ORIGINS` | Nao | Origens permitidas para CORS (default: `*`) |
| `STORAGE_TYPE` | Nao | `'local'` ou `'supabase'` (default: `'local'`) |
| `PORT` | Nao | Porta do Express (default: 3000) |

> Se as variaveis `VITE_*` nao estiverem definidas, o app roda em modo offline (somente `localStorage`).

---

## 6. Autenticacao e Permissoes

### Autenticacao

O sistema usa **Supabase Auth (GoTrue)** para gerenciar usuarios:
- Login com email e senha
- Sessoes persistentes (refresh automatico de token)
- Novos usuarios criados pelo admin via interface ou API
- Troca de senha obrigatoria no primeiro login (`must_change_password`)
- Tela de perfil com edicao de nome e avatar

### Roles Globais

| Role | Permissoes |
|------|-----------|
| `admin` | Criar usuarios, gerenciar squads, alterar roles, ativar/desativar usuarios, acesso total |
| `user` | Acesso ao dashboard, operacoes dentro dos squads vinculados |

### Squads e Membros

- Cada squad tem **nome**, **descricao**, **cor** e pode ser **arquivado**
- Membros possuem roles de squad: `qa_lead`, `qa`, `stakeholder`
- Visibilidade: admin ve tudo; demais veem apenas dados dos seus squads

### Permissoes Granulares

Cada membro tem permissoes individuais controladas por recurso (sprints, bugs, funcionalidades, casos de teste, suites, bloqueios, alinhamentos, releases). Permissoes podem ser atribuidas individualmente ou via **Perfis de Permissao** (templates reutilizaveis).

---

## 7. Estrutura do projeto

```
src/
├── lib/
│   └── supabase.ts                     # Cliente Supabase (singleton)
├── app/
│   ├── components/                     # Modais compartilhados + ProtectedRoute
│   ├── layout/                         # AppShell, Sidebar, Topbar, SaveToast
│   ├── pages/                          # DocsPage
│   └── routes.tsx                      # Definicao das 14 rotas
├── shared/
│   ├── components/                     # Componentes reutilizaveis
│   └── hooks/                          # Hooks compartilhados
├── modules/
│   ├── auth/                           # Login, perfil, troca de senha, authStore
│   ├── sprints/
│   │   ├── components/dashboard/       # 8 tabs: Overview, Report, Bugs, Features,
│   │   │                               #   Blockers, Alignments, Notes, Config
│   │   ├── pages/                      # HomePage, SprintDashboard, ComparePage
│   │   ├── services/                   # persistence, compareService, exportService,
│   │   │                               #   importService
│   │   ├── store/                      # sprintStore (Zustand)
│   │   └── types/                      # sprint.types.ts
│   ├── status-report/
│   │   ├── components/                 # SectionManager, SectionCard, ItemRow,
│   │   │                               #   ItemFormModal, ItemDetailPanel, GanttView,
│   │   │                               #   ReportPreview, ReportDashboard,
│   │   │                               #   combinados/, time/
│   │   ├── pages/                      # StatusReportHomePage, StatusReportPage
│   │   ├── services/                   # persistence, export, dateEngine
│   │   ├── store/                      # statusReportStore + seedData
│   │   └── types/                      # statusReport.types.ts
│   ├── releases/
│   │   ├── components/
│   │   │   ├── dashboard/              # Checkpoint, Regressivos, Historico,
│   │   │   │                           #   Cronograma, Eventos, Timeline,
│   │   │   │                           #   ReleasePhasesPanel, ReleaseSquadCard
│   │   │   ├── prs/                    # PRsTab, PRsTabHome, PRListTable,
│   │   │   │                           #   PRRegistrationForm, PRAnalysisPanel,
│   │   │   │                           #   SquadParticipationView
│   │   │   ├── shared/                 # ActionBtn
│   │   │   └── tests/                  # Areas de teste por squad
│   │   ├── constants/                  # platforms, pr-constants, status
│   │   ├── pages/                      # ReleasesPage, ReleaseDashboard, PRsPage
│   │   ├── services/                   # persistence, export, prService, metrics
│   │   ├── store/                      # releaseStore
│   │   ├── types/                      # release.types.ts, pr.types.ts
│   │   └── utils/                      # dateFormat, prExport
│   └── squads/
│       ├── components/                 # AuditTrailPanel
│       ├── pages/                      # SquadsPage (Squads, Perfis, Usuarios,
│       │                               #   API Keys, Audit Trail)
│       └── services/                   # squadsService, apiKeysService
├── hooks/
│   └── useFocusTrap.ts                  # Focus trap reutilizavel para modais
routes/
├── admin.routes.js                      # create-user, reset-password
├── dashboard.routes.js                  # GET/PUT dashboard por projectKey
├── flush.routes.js                      # sendBeacon flush (status-report, release, sprint)
└── v1/                                  # API publica v1
    ├── apikeys.routes.js                # CRUD de API Keys (admin)
    ├── audit.routes.js                  # Consulta de audit logs
    ├── prs.routes.js                    # CRUD de PRs por release
    ├── releases.routes.js               # Leitura de releases
    ├── releases.write.routes.js         # Escrita (fase, rollout)
    ├── sprints.routes.js                # Leitura de sprints
    ├── sprints.write.routes.js          # Criacao de sprints
    ├── squads.routes.js                 # Leitura de squads/membros
    └── __tests__/                       # Testes unitarios dos endpoints
supabase/
├── config.toml                         # Configuracao do Supabase local
└── migrations/                         # 22 migrations SQL sequenciais
server.js                               # Express: SPA + API admin + flush + API v1 + Swagger
setup-admin.sh                          # Script de criacao do admin
```

### Rotas (14)

| Rota | Descricao |
|------|-----------|
| `/login` | Tela de login (publica) |
| `/change-password` | Troca de senha obrigatoria |
| `/` | Dashboard Home |
| `/sprints` | Lista de sprints |
| `/sprints/compare` | Comparacao entre sprints |
| `/sprints/:sprintId` | Dashboard da sprint |
| `/status-report` | Lista de status reports |
| `/status-report/:reportId` | Editor de status report |
| `/releases` | Lista de releases |
| `/releases/:releaseId` | Dashboard da release |
| `/prs` | Gestao de PRs (agrupados por release) |
| `/squads` | Cadastro de squads, perfis, usuarios, API keys e audit trail |
| `/profile` | Perfil do usuario |
| `/docs` | Documentacao |

### API Endpoints — Internos (10)

| Metodo | Rota | Auth | Rate Limit | Descricao |
|---|---|---|---|---|
| GET | `/config.js` | Nao | — | Configuracao dinamica do frontend |
| GET | `/api/health` | Nao | — | Health check |
| GET | `/api/docs` | Nao | — | Swagger UI (apenas dev/staging) |
| GET | `/api/dashboard/:projectKey` | Bearer + admin | — | Dados do dashboard |
| PUT | `/api/dashboard/:projectKey` | Bearer + admin | — | Atualizar dashboard |
| POST | `/api/admin/create-user` | Bearer + admin | 10/min | Criar usuario |
| POST | `/api/admin/reset-password` | Bearer + admin | 10/min | Resetar senha de usuario |
| POST | `/api/status-report-flush` | Nao | 30/min | Flush de status report (sendBeacon) |
| POST | `/api/release-flush` | Nao | 30/min | Flush de release (sendBeacon) |
| POST | `/api/sprint-flush` | Nao | 30/min | Flush de sprint (sendBeacon) |

### API Endpoints — Publica v1 (14+)

Autenticacao via header `X-API-Key`. Chaves gerenciadas em Cadastros > API Keys.

| Metodo | Rota | Scope | Descricao |
|---|---|---|---|
| GET | `/api/v1/sprints` | sprints:read | Listar sprints (paginacao, filtros) |
| GET | `/api/v1/sprints/:id` | sprints:read | Detalhes de uma sprint |
| GET | `/api/v1/sprints/:id/metrics` | sprints:read | Metricas calculadas da sprint |
| GET | `/api/v1/sprints/:id/bugs` | sprints:read | Bugs da sprint |
| POST | `/api/v1/sprints` | sprints:write | Criar sprint |
| GET | `/api/v1/releases` | releases:read | Listar releases |
| GET | `/api/v1/releases/:id` | releases:read | Detalhes de uma release |
| GET | `/api/v1/releases/:id/metrics` | releases:read | Metricas da release |
| PATCH | `/api/v1/releases/:id/phase` | releases:write | Atualizar fase da release |
| PATCH | `/api/v1/releases/:id/rollout` | releases:write | Atualizar rollout % |
| POST | `/api/v1/releases/:id/prs` | releases:write | Criar PR vinculado a release |
| GET | `/api/v1/releases/:id/prs` | releases:read | Listar PRs da release |
| PUT | `/api/v1/releases/:id/prs/:prId` | releases:write | Atualizar PR |
| DELETE | `/api/v1/releases/:id/prs/:prId` | releases:write | Remover PR |
| PATCH | `/api/v1/releases/:id/prs/:prId/review` | releases:write | Aprovar/rejeitar PR |
| GET | `/api/v1/releases/:id/prs/summary` | releases:read | Resumo de PRs por release |
| GET | `/api/v1/squads` | squads:read | Listar squads |
| GET | `/api/v1/squads/:id/members` | squads:read | Membros de um squad |
| POST | `/api/v1/api-keys` | admin | Criar API Key |
| GET | `/api/v1/api-keys` | admin | Listar API Keys |
| DELETE | `/api/v1/api-keys/:id` | admin | Revogar API Key |
| GET | `/api/v1/audit-logs` | admin/audit | Consultar logs de auditoria |

### Seguranca

- **Helmet** — Headers de seguranca HTTP
- **CORS** — Origens configuradas via env (`CORS_ORIGINS`)
- **Rate limiting** — Endpoints admin e flush com limites por minuto
- **RLS** — Row Level Security em todas as tabelas do Supabase
- **API Key auth** — Autenticacao via `X-API-Key` com scopes granulares para API v1
- **Audit logging** — logAudit em todas as operacoes CRUD, timeline com diff viewer
- **Validacao de entrada** — Zod schemas em todos os endpoints da API v1
- **Senhas** — Geradas com `crypto.randomBytes` para novos usuarios

---

## 8. Funcionalidades

### Modulo 1 — Auth

- Login com email e senha (Supabase Auth/GoTrue)
- Troca de senha obrigatoria no primeiro login
- Tela de perfil (nome, avatar)
- Sessoes persistentes com refresh automatico

### Modulo 2 — Cobertura QA (Sprints)

- **Dashboard com 8 abas:** Overview, Report, Bugs, Features, Blockers, Alignments, Notes, Config
- **KPIs:** Health Score (ponderado com penalidades configuraveis), MTTR, Capacidade Real, Indice de Reteste, Burndown
- **Gestao de Casos de Teste:** Suites, funcionalidades, cenarios Gherkin com status por dia
- **Gestao de Bugs:** Severidade, stack, responsavel, MTTR, retestes, categoria
- **Bloqueios de Execucao:** Registro de impedimentos com horas bloqueadas
- **Comparacao entre Sprints:** Graficos de evolucao historica com KPIs lado a lado
- **Exportacao:** JPG (relatorio visual), JSON (backup), CSV (cobertura e suites)
- **Importacao:** Arquivos `.feature` (Gherkin), `.csv` (cenarios), JSON (backup)

### Modulo 3 — Visao Geral (Status Report)

- **Multi-report para Scrum Masters:** Varios reports por semana/periodo
- **Secoes dinamicas** com itens contendo dependencias e status
- **Gantt SVG** — Visualizacao temporal dos itens
- **Preview 2 colunas** — Formato Word para copiar (clipboard)
- **Favoritos, concluir, migrar/duplicar** reports
- **Combinados do time** — Acordos e combinados registrados
- **Time & Calendario** — Abas para gestao de equipe e datas

### Modulo 4 — Releases

- **Pipeline multi-fase com confirmacao de transicao:** Corte → Geracao → Homologacao → Beta → Aprovacao → Producao
- **Maquina de estados** com VALID_TRANSITIONS — transicoes validadas entre fases
- **6 abas:** Checkpoint, Regressivos, Historico, Cronograma, Eventos, PRs
- **Cronograma de releases** com tabela, importacao CSV e formulario de criacao
- **Checkpoint** para acompanhamento de releases vinculadas
- **Timeline visual** com collision avoidance de labels
- **Eventos e feriados** com badges de proximidade
- **Regressivos** com KPIs por squad, tabela responsiva
- **Rollout %** — Acompanhamento percentual de implantacao
- **Areas de teste por squad** — Divisao de responsabilidades por squad
- **Indicador de sync** (Salvando/Salvo/Erro) em tempo real
- **Flush via sendBeacon** — Persistencia garantida ao fechar aba

### Modulo 5 — Gestao de PRs

- **Pagina dedicada** (`/prs`) com icone na sidebar
- **PRs agrupados por versao alvo** (release) com KPIs por grupo
- **Cadastro de PR** com formulario validado (link, repositorio, squad, tipo, descricao)
- **Revisao de PRs:** aprovar/rejeitar com observacao obrigatoria
- **Painel de detalhes** com slide-in lateral (PRAnalysisPanel)
- **Busca textual** e ordenacao por colunas
- **Exportacao CSV** dos PRs cadastrados
- **Tabela semantica HTML** com acessibilidade (role, aria-*)
- **Botao Link** com tonalidade diferenciada (com/sem URL)

### Modulo 6 — API Publica (v1)

- **14+ endpoints REST** com autenticacao via API Key
- **Swagger UI** em `/api/docs` (disponivel apenas em dev/staging)
- **Endpoints organizados por recurso:**
  - `/api/v1/sprints` — listagem, detalhes, metricas, bugs, criacao
  - `/api/v1/releases` — listagem, detalhes, metricas, atualizacao de fase/rollout
  - `/api/v1/releases/:id/prs` — CRUD completo de PRs por release
  - `/api/v1/squads` — listagem de squads e membros
  - `/api/v1/api-keys` — gerenciamento de chaves (admin)
  - `/api/v1/audit-logs` — consulta de logs de auditoria
- **Validacao de entrada** com Zod em todos os endpoints
- **Paginacao, filtros e ordenacao** padronizados

### Modulo 7 — Audit Trail

- **Timeline de acoes** com filtros por resource type e action
- **Diff viewer expandivel** por entrada de log
- **logAudit** em todas as operacoes CRUD
- **Painel integrado** na pagina de Cadastros (SquadsPage)

### Acessibilidade

- **Focus ring global** via `:focus-visible`
- **Focus trap em modais** (hook reutilizavel `useFocusTrap`)
- **role="dialog" + aria-modal** em todos os modais
- **Clickable divs** com `role="button"` + navegacao por teclado
- **Labels htmlFor/id** em formularios
- **Validacao inline** por campo com `aria-invalid`

### Modulo 8 — Cadastros (Squads)

- **Squads:** Nome, descricao, cor, arquivamento
- **Membros:** Roles de squad (qa_lead, qa, stakeholder)
- **Permissoes granulares:** Por recurso, por membro, com perfis reutilizaveis
- **Gestao de usuarios (admin):** Criar, ativar/desativar, resetar senha
- **Perfis de permissao:** Templates aplicaveis a varios membros
- **API Keys:** Gerenciamento de chaves para acesso a API publica
- **Audit Trail:** Painel de auditoria integrado

### Colaboracao em tempo real

- Multiplos usuarios na mesma sprint/report/release simultaneamente
- Sincronizacao via Supabase Realtime (WebSocket)
- Debounce de 700ms para persistencia remota
- Fallback para localStorage se Supabase nao responder

### Modo offline

- Funciona 100% sem Supabase — dados locais no navegador
- Sem necessidade de login ou configuracao

---

## 9. Deploy

### Build de producao

```bash
npm run build
# Arquivos gerados em /dist
```

O `server.js` serve tanto a SPA (arquivos estaticos do `/dist`) quanto os endpoints de API. Em producao, basta rodar:

```bash
node server.js
```

### Railway / Render / Fly.io

1. Conecte o repositorio
2. Configure as variaveis de ambiente (veja secao 5)
3. Comando de build: `npm run build`
4. Comando de start: `node server.js`

### Docker (containerizar tudo)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.js ./
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t tostatos .
docker run -p 3000:3000 \
  -e VITE_SUPABASE_URL=https://xxxx.supabase.co \
  -e VITE_SUPABASE_ANON_KEY=eyJ... \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  -e CORS_ORIGINS=https://seu-dominio.com \
  tostatos
```

---

## Autor

Desenvolvido por **[Jhonny Robert](https://www.linkedin.com/in/jhonny-robert/)**
