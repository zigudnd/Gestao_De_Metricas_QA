# ToStatos — QA Metrics Dashboard

Plataforma de gestão de métricas QA para acompanhamento de sprints. Centraliza KPIs, progresso de testes, bugs, impedimentos e alinhamentos em um único painel. Todo o estado das sprints é salvo localmente (LocalStorage + arquivos JSON via API Node.js), sem vazamento de dados confidenciais para a nuvem.

**Stack:** React 19 + TypeScript · Vite 6 · Zustand · Chart.js · Express

---

## ⚙️ Pré-requisitos

Antes de instalar, certifique-se de ter:

| Ferramenta | Versão mínima | Como verificar |
|---|---|---|
| **Node.js** | 18 LTS ou superior | `node --version` |
| **npm** | 9 ou superior | `npm --version` |
| **Git** | qualquer versão recente | `git --version` |
| **Navegador** | Chrome, Edge ou Firefox (versão atual) | — |

> **Recomendado:** Node.js 20 LTS. Baixe em [nodejs.org](https://nodejs.org).

---

## 🚀 Instalação e execução

### 1. Clone o repositório

```bash
git clone https://github.com/zigudnd/Gestao_De_Metricas_QA.git
cd Gestao_De_Metricas_QA
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env   # se existir o exemplo
# ou crie manualmente:
```

```env
# Armazenamento local (recomendado para compliance)
STORAGE_TYPE=local
QA_PROJECT_KEY=meu_projeto
```

> Para usar Supabase, veja a seção **Configurar o Banco de Dados** mais abaixo.

### 4. Rode em modo desenvolvimento

Abra **dois terminais** e execute um comando em cada:

**Terminal 1 — Backend Express (API):**
```bash
npm run dev
```
> Servidor disponível em `http://localhost:3000`

**Terminal 2 — Frontend Vite (React):**
```bash
npm run dev:client
```
> Interface disponível em `http://localhost:5173`

### 5. Build para produção

```bash
# Gera os arquivos estáticos em /dist
npm run build

# Inicia o servidor Express servindo o build
npm start
```
> Acesse em `http://localhost:3000`

---

## 📁 Estrutura

```
src/
├── app/components/       # Componentes compartilhados (NewBugModal, ConfirmModal)
├── app/pages/            # DocsPage (documentação integrada)
├── app/layout/           # AppShell, Sidebar, Topbar, SaveToast
├── modules/sprints/
│   ├── components/dashboard/   # Tabs: Overview, Features, Bugs, Config, Notes...
│   ├── services/persistence.ts # localStorage + computeFields + helpers de dias
│   ├── store/sprintStore.ts    # Zustand store central
│   └── types/sprint.types.ts  # Tipos TypeScript
server.js                 # API Express (sincronização remota opcional)
```

## Como funciona

- Todo o estado é salvo no **localStorage** do navegador (`qaDashboardData_<sprintId>`).
- Campos calculados (testes totais, executados, dias de sprint) são recomputados a cada `_commit` via `computeFields`.
- Opcionalmente, o front sincroniza com a API Express via `PUT /api/dashboard/:sprintId` (debounce 3s).

## ✨ Principais Funcionalidades e Casos de Uso

O QA Dashboard centraliza em um único ambiente tudo que um Líder ou Analista de Qualidade precisa para gerenciar os testes e reportar o andamento da Sprint.

- **Visão Executiva (C-Level & Gerencial):** Painel principal de alto nível com KPIs em tempo real (QA Health Score, Testes Executáveis, Capacidade Real, Bugs Abertos, Defeitos Prevenidos, MTTR, Índice de Retrabalho e mais), Burndown Chart e gráficos de bugs por stack.
- **KPIs de Valor Gerado pelo QA:** *Defeitos Prevenidos* (total de bugs encontrados) e *Impacto Prevenido* (score ponderado pela criticidade — Σ peso × bugs por severidade). Evidenciam o valor do trabalho de QA além da simples contagem.
- **Capacidade Real:** Percentual de testes disponíveis para execução, descontando features bloqueadas. Indicador de saúde operacional do ciclo.
- **QA Health Score Personalizável:** Ajuste o peso das penalidades (Bugs Críticos, Retestes, Bloqueios, Atraso, etc.) diretamente na aba Configurações.
- **Impacto Prevenido Configurável:** Pesos independentes por severidade (Crítica/Alta/Média/Baixa) para o cálculo do score ponderado de defeitos prevenidos.
- **Gestão de Casos de Teste Estruturada:** Cadastro de Suites, Funcionalidades e Casos de Teste em formato Gherkin, com Checklists (Concluído / Falhou / Bloqueado) e controle de data de execução por dia de sprint.
- **Fins de Semana Configuráveis:** Opção para incluir ou excluir fins de semana no cálculo de dias úteis da sprint. Por padrão, fins de semana são excluídos.
- **Gestão de Bugs com Stacks Customizáveis:** Registro de bugs com severidade, stack (Front, BFF, Back, Mobile, Infra ou stacks personalizadas criadas inline), responsável e rastreamento de MTTR. Status *Falhou* auto-incrementa o contador de retestes. Colunas ordenáveis por severidade, status e data.
- **Índice de Retrabalho:** Percentual de bugs que passaram por reteste — faixa qualitativa exibida na aba Overview.
- **⛔ Bloqueios de Execução:** Registro de blockers com data, motivo e horas bloqueadas. Alimenta os KPIs e gráficos de gargalos.
- **Notas Operacionais:** Campo livre (aba Notas) para massas de dados, cenários manuais, observações do dia e links úteis — fonte monoespaçada, redimensionável.
- **Premissas e Plano de Ação (Gestão de Risco):** Na aba Notas, Premissas do Ciclo de Testes e Plano de Ação lado a lado.
- **Armazenamento 100% Local (Secure-by-Design):** Dados salvos exclusivamente no localStorage do navegador. Nenhum dado sensível vaza para a nuvem.
- **Exportação One-Click:** Snapshot renderizado dos indicadores do dia via "📸 Exportar Imagem".

## 👨‍💻 Autor
Desenvolvido por **[Jhonny Robert](https://www.linkedin.com/in/jhonny-robert/)**

---

## 1) Configurar o Banco de Dados (Dual Mode)

Esta versão do Dashboard é flexível e permite que você escolha onde salvar seus dados modificando apenas uma variável de ambiente.

Copie `.env.example` para `.env`:
```bash
cp .env.example .env
```

Abra o arquivo `.env` e configure conforme a sua necessidade corporativa:

### Opção A: Armazenamento 100% Local (Recomendado para Compliance)
Se não quiser enviar dados para a internet, deixe configurado assim. O sistema criará a pasta `data/` automaticamente na raiz.
```env
STORAGE_TYPE=local
QA_PROJECT_KEY=meu_banco_android
```

### Opção B: Armazenamento na Nuvem via Supabase
Se a sua empresa permite e você quer que todos acessem um banco centralizado, mude o tipo e preencha as chaves:
```env
STORAGE_TYPE=supabase
QA_PROJECT_KEY=android
SUPABASE_URL=sua_url_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_secret_aqui
```

## 2) Rodar localmente

Se for a primeira vez, instale as dependências:
```bash
npm install
```

E inicie o servidor local:
```bash
npm start
```

Abra no navegador:
```text
http://localhost:3000
```

## 3) Extensibilidade: Como adicionar outras bases de dados

Para adicionar suporte as outras bases (como MongoDB, Firebase, PostgreSQL, MySQL ou AWS DynamoDB), a lógica foi desenhada para ser "Plug and Play" no arquivo `server.js`. 

Como o Dashboard trabalha apenas trocando um arquivo `JSON` enorme com o servidor (O estado da Sprint), o Front-end não se importa com onde os dados estão salvos. Basta seguir estes passos para ensinar a API a conversar com outro banco:

**1) Adicionar a variável de controle no `.env`**
Adicione o nome do seu banco e as credenciais necessárias:
```env
STORAGE_TYPE=mongodb
MONGO_URI=mongodb+srv://usuario:senha@cluster0.exemplo.mongodb.net/meubanco
QA_PROJECT_KEY=android
```

**2) Instale o SDK do seu banco**
Abra o terminal e instale (exemplo: `npm install mongodb`).

**3) Inicie a Conexão no `server.js`**
No topo do arquivo `server.js`, importe sua lib, verifique o `STORAGE_TYPE` e inicie a conexão.

```javascript
/* No topo do arquivo */
const { MongoClient } = require('mongodb');
let mongoDb = null;

/* Na área de inicialização do storage */
if (STORAGE_TYPE === 'mongodb') {
  const client = new MongoClient(process.env.MONGO_URI);
  client.connect().then(() => {
    mongoDb = client.db('qa_dashboard_db');
    console.log('✅ Back-end configurado para usar: MONGODB');
  });
} else if (STORAGE_TYPE === 'supabase') { ... } 
// ...
```

**4) Atualize as rotas de Leitura (`GET`) e Salvamento (`PUT`)**
Nas rotas do Express (`app.get` e `app.put`), insira as querys específicas do seu banco no bloco caso o `STORAGE_TYPE` seja escolhido:

Exemplo da leitura (`GET`):
```javascript
if (STORAGE_TYPE === 'mongodb') {
  const collection = mongoDb.collection('dashboard_states');
  const data = await collection.findOne({ project_key: projectKey });
  
  if (!data) return res.status(404).json({ message: 'Não encontrado' });
  return res.json(data);
} 
```

Exemplo da gravação (`PUT`):
```javascript
if (STORAGE_TYPE === 'mongodb') {
  const collection = mongoDb.collection('dashboard_states');
  await collection.updateOne(
    { project_key: projectKey }, // Procura a sprint
    { $set: row },               // Salva os dados dela
    { upsert: true }             // Cria se não existir
  );
  return res.json(row);
}
```

Abra:

```text
http://localhost:3000
```

## 4) Endpoints

- `GET /api/health`
- `GET /api/dashboard/:projectKey`
- `PUT /api/dashboard/:projectKey`

Exemplo de leitura:

```bash
curl http://localhost:3000/api/dashboard/android
```

Exemplo de gravação:

```bash
curl -X PUT http://localhost:3000/api/dashboard/android \
  -H "Content-Type: application/json" \
  -d '{"payload":{"config":{"title":"QA Dashboard"},"currentDate":"2026-03-10","reports":{},"notes":{},"alignments":[],"features":[],"blockers":[],"bugs":[]}}'
```

## 5) Deploy

Você pode subir esse projeto em:

- Railway
- Render
- VPS/Hostinger
- Docker

### Railway/Render

- conecte o repositório
- adicione as variáveis `.env`
- comando de start: `npm start`

## Observações

- O front continua mantendo backup local para não perder dados se a API ficar indisponível
- O `projectKey` padrão vem de `QA_PROJECT_KEY`
- Também dá para usar vários dashboards trocando a URL para `?project=ios`, `?project=android`, etc.
