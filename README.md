# ToStatos — QA Metrics Dashboard

Plataforma de gestao de metricas QA para acompanhamento de sprints. Centraliza KPIs, progresso de testes, bugs, impedimentos e alinhamentos em um unico painel. Suporta uso individual (offline) e colaborativo em tempo real (via Supabase) com sistema multi-usuario, squads e permissoes granulares.

**Stack:** React 19 + TypeScript . Vite 6 . Tailwind CSS v4 . Zustand . Chart.js . Supabase (PostgreSQL + Auth + Realtime)

---

## Indice

1. [Acesso rapido](#1-acesso-rapido)
2. [Pre-requisitos](#2-pre-requisitos)
3. [Instalacao](#3-instalacao)
4. [Modo Individual — somente localStorage](#4-modo-individual--somente-localstorage)
5. [Modo Colaborativo — Supabase local com Docker](#5-modo-colaborativo--supabase-local-com-docker)
6. [Modo Colaborativo — Supabase Cloud (producao)](#6-modo-colaborativo--supabase-cloud-producao)
7. [Variaveis de ambiente](#7-variaveis-de-ambiente)
8. [Sistema de Autenticacao e Permissoes](#8-sistema-de-autenticacao-e-permissoes)
9. [Estrutura do projeto](#9-estrutura-do-projeto)
10. [Como funciona a persistencia](#10-como-funciona-a-persistencia)
11. [Principais funcionalidades](#11-principais-funcionalidades)
12. [Deploy](#12-deploy)

---

## 1. Acesso rapido

### Credenciais padrao

| Usuario | Email | Senha |
|---------|-------|-------|
| **Admin** | `admin@tostatos.com` | `Admin@123` |
| **Novos usuarios** | definido pelo admin | `Mudar@123` (troca obrigatoria no primeiro login) |

> O usuario admin e criado pelo script `bash setup-admin.sh` ou via API (veja a secao 5, Passo 4).
> Novos usuarios sao criados pelo admin na aba **Cadastros > Usuarios**.

### Comandos essenciais

```bash
npm install          # instalar dependencias
npm run dev:client   # iniciar frontend (porta 5173)
npm run dev          # iniciar backend (porta 3000)
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

### Instalando Docker Desktop

O Docker e necessario apenas para o **modo colaborativo** (Supabase local). Se voce so quer usar o modo individual (localStorage), pode pular esta etapa.

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

Antes de prosseguir, confirme que tudo esta instalado:

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

## 4. Modo Individual — somente localStorage

Use este modo se quiser rodar o projeto sozinho, sem banco de dados, sem Docker.

```bash
# Suba o frontend
npm run dev:client
```

Acesse: **http://localhost:5173**

Os dados ficam salvos no `localStorage` do navegador. Nenhuma configuracao adicional necessaria.

> **Nota:** No modo individual, o sistema de autenticacao nao e ativado. Todas as funcionalidades estao disponiveis sem login.

---

## 5. Modo Colaborativo — Supabase local com Docker

Use este modo para trabalhar em equipe na mesma rede local, sem precisar de internet.

### Passo 1 — Suba o banco de dados local

```bash
# Na raiz do projeto, inicie o Supabase (Docker)
supabase start
```

Na primeira execucao, o Docker baixa as imagens (pode demorar alguns minutos). Nas execucoes seguintes, sobe em segundos.

Ao terminar, o terminal exibe as credenciais. Para consulta-las novamente: `supabase status`.

### Passo 2 — Configure o `.env`

Crie o arquivo `.env` na raiz do projeto com os valores exibidos pelo `supabase start`:

```env
# Frontend (Vite)
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key do supabase status>

# Backend (server.js) — necessario para criar usuarios
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<service_role key do supabase status>
```

> O arquivo `.env.example` contem um template. As keys sao geradas pelo `supabase start`.

### Passo 3 — Aplique as migrations

```bash
supabase db push --local
```

Confirme com `Y` quando solicitado. Isso cria todas as tabelas: `sprints`, `profiles`, `squads`, `squad_members`, `permission_profiles`, triggers e RLS policies.

### Passo 4 — Crie o usuario admin

```bash
# Opcao 1: Script automatizado
bash setup-admin.sh

# Opcao 2: Manual via API
node server.js &
curl -X POST http://localhost:3000/api/admin/create-user \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@tostatos.com","display_name":"Admin"}'
```

**Credenciais padrao:**
| | |
|---|---|
| **Admin** | `admin@tostatos.com` / `Admin@123` |
| **Novos usuarios** | senha padrao `Mudar@123` (troca obrigatoria no primeiro login) |

### Passo 5 — Suba o frontend

```bash
npm run dev:client
```

Acesse: **http://localhost:5173**

### Passo 6 — Acesso de outros usuarios na rede

Para que outros computadores na mesma rede acessem o dashboard:

```bash
# Suba o Vite expondo na rede local
npm run dev:client -- --host
```

O terminal exibira o IP da maquina (ex: `http://192.168.1.10:5173`). Compartilhe esse endereco com a equipe.

> **Importante:** todos devem apontar o `.env` para o IP da maquina que esta rodando o Supabase.
> Ex: `VITE_SUPABASE_URL=http://192.168.1.10:54321`

### Parar e retomar

```bash
# Parar o Supabase (dados ficam salvos no disco)
supabase stop

# Retomar depois
supabase start
```

**Os dados persistem** entre reinicializacoes. O Docker usa volumes no disco local — os dados so sao perdidos se voce deletar o volume manualmente.

---

## 6. Modo Colaborativo — Supabase Cloud (producao)

Use este modo quando tiver um servidor dedicado (pod, VM, Kubernetes) ou quiser usar o Supabase hospedado na nuvem.

### Opcao A: Supabase Cloud (supabase.com)

1. Crie uma conta em https://supabase.com e um novo projeto
2. No painel do projeto, va em **Settings → API** e copie:
   - `Project URL`
   - `anon public key`
   - `service_role key` (para o backend)
3. Aplique as migrations:
   ```bash
   supabase link --project-ref SEU_PROJECT_REF
   supabase db push
   ```
4. Atualize o `.env`:
   ```env
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```

### Opcao B: Self-hosted (Docker em servidor)

Execute o `supabase start` no servidor e aponte o `.env` para o IP publico ou dominio do servidor:

```env
VITE_SUPABASE_URL=http://SEU_SERVIDOR_IP:54321
VITE_SUPABASE_ANON_KEY=sb_publishable_XXXX
SUPABASE_URL=http://SEU_SERVIDOR_IP:54321
SUPABASE_SERVICE_ROLE_KEY=sb_secret_XXXX
```

---

## 7. Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
|---|---|---|
| `VITE_SUPABASE_URL` | Modo colaborativo | URL da API do Supabase (frontend) |
| `VITE_SUPABASE_ANON_KEY` | Modo colaborativo | Chave publica anon (frontend) |
| `SUPABASE_URL` | Backend | URL do Supabase (server.js) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Chave service_role para admin API |
| `STORAGE_TYPE` | Nao | `'local'` ou `'supabase'` (default: `'local'`) |
| `PORT` | Nao | Porta do Express (default: 3000) |

> Se as variaveis `VITE_*` nao estiverem definidas, o app roda normalmente em modo offline (somente `localStorage`).

---

## 8. Sistema de Autenticacao e Permissoes

### Autenticacao

O sistema usa **Supabase Auth (GoTrue)** para gerenciar usuarios:
- Login com email e senha
- Sessoes persistentes (refresh automatico de token)
- Novos usuarios sao criados pelo admin via interface ou API

### Roles Globais

| Role | Permissoes |
|------|-----------|
| `admin` | Criar usuarios, gerenciar squads, alterar roles, ativar/desativar usuarios |
| `user` | Acesso normal ao dashboard, operacoes dentro dos squads vinculados |

### Squads

Squads sao equipes que agrupam membros e sprints:
- Cada squad tem **nome**, **descricao** e **cor**
- Membros possuem roles: `qa_lead`, `qa`, `stakeholder`
- Sprints podem ser vinculadas a um squad (`squadId`)

### Permissoes Granulares

Cada membro de um squad tem permissoes individuais de exclusao:
- Excluir Sprints, Bugs, Funcionalidades, Casos de Teste, Suites, Bloqueios, Alinhamentos

Permissoes podem ser atribuidas individualmente ou via **Perfis de Permissao** (templates reutilizaveis).

---

## 9. Estrutura do projeto

```
src/
├── lib/
│   └── supabase.ts                  # Cliente Supabase (singleton)
├── app/
│   ├── components/                  # Modais compartilhados + ProtectedRoute
│   ├── layout/                      # AppShell, Sidebar, Topbar, SaveToast
│   └── pages/                       # DocsPage
├── modules/
│   ├── auth/                        # Login, perfil, troca de senha, authStore
│   ├── sprints/
│   │   ├── components/dashboard/    # Tabs: Overview, Report, Bugs, Features, Blockers,
│   │   │                            #        Alignments, Notes, Config + useSprintMetrics
│   │   ├── pages/
│   │   │   ├── HomePage.tsx         # Lista de sprints
│   │   │   ├── SprintDashboard.tsx  # Dashboard principal
│   │   │   └── ComparePage.tsx      # Comparacao entre sprints
│   │   ├── services/
│   │   │   ├── persistence.ts       # Toda a logica de dados (localStorage + Supabase)
│   │   │   ├── compareService.ts    # KPIs para comparacao
│   │   │   ├── exportService.ts     # Export JPG, JSON, CSV
│   │   │   └── importService.ts     # Import .feature e .csv
│   │   ├── store/sprintStore.ts     # Zustand store central
│   │   └── types/sprint.types.ts    # Tipos TypeScript
│   └── squads/                      # Gestao de squads, membros, permissoes, usuarios
│       ├── pages/SquadsPage.tsx
│       └── services/squadsService.ts
supabase/
├── config.toml                      # Configuracao do Supabase local
└── migrations/                      # 11 migrations SQL sequenciais
server.js                            # Express: SPA + API admin + health
```

---

## 10. Como funciona a persistencia

O app usa uma arquitetura em camadas:

```
Usuario edita → _commit (Zustand)
                    ├── saveToStorage()          → localStorage (imediato, sync)
                    ├── upsertSprintInMasterIndex() → localStorage (imediato, sync)
                    └── queueRemotePersist()     → Supabase (debounce 700ms, async)

Outro usuario salva → Supabase Realtime (WebSocket)
                          └── atualiza localStorage + Zustand store
                              → tela do colega atualiza em ~200ms
```

**Na inicializacao do app** (`AppShell`), `syncAllFromSupabase()` e chamado:
- Busca todas as sprints do Supabase
- Popula o `localStorage` com os dados remotos
- Garante que sprints criadas por outros usuarios aparecam na lista

**Ao abrir uma sprint** (`SprintDashboard`):
1. Tenta carregar do Supabase (`loadFromServer`)
2. Fallback para `localStorage` se Supabase nao responder
3. Registra subscription Realtime para aquela sprint

**Ao fechar uma sprint** (`resetSprint`): a subscription Realtime e cancelada.

---

## 11. Principais funcionalidades

- **Sistema Multi-usuario** — Login com Supabase Auth, roles (admin/user), squads
- **Permissoes Granulares** — Controle de exclusao por recurso, por membro, com perfis reutilizaveis
- **QA Health Score** — Score ponderado com penalidades configuraveis (bugs, retestes, bloqueios, atraso)
- **Burndown Chart** — Acompanhamento diario de execucao vs meta
- **KPIs em tempo real** — Testes Executaveis, Capacidade Real, Bugs Abertos, Indice de Retrabalho
- **Gestao de Casos de Teste** — Suites, Funcionalidades, Cenarios Gherkin com status por dia
- **Gestao de Bugs** — Severidade, stack, responsavel, MTTR, retestes, categoria
- **Bloqueios de Execucao** — Registro de impedimentos com horas bloqueadas
- **Comparativo entre Sprints** — Graficos de evolucao historica
- **Exportacao** — Relatorio em imagem (JPG), backup JSON, CSV de cobertura, CSV de suite
- **Importacao** — Arquivos .feature (Gherkin), .csv (cenarios) e JSON (backup)
- **Colaboracao em tempo real** — Multiplos usuarios na mesma sprint simultaneamente
- **Modo offline** — Funciona sem Supabase, dados locais no navegador

---

## 12. Deploy

### Build de producao

```bash
npm run build
# Arquivos gerados em /dist — sirva com qualquer servidor estatico (nginx, Caddy, etc.)
```

### Railway / Render / Fly.io

1. Conecte o repositorio
2. Configure as variaveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) apontando para o Supabase Cloud
3. Comando de build: `npm run build`
4. Pasta de saida: `dist`

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
