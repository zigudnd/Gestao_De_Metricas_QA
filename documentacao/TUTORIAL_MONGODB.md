# Tutorial Completo: Colocando o QA Dashboard Online com MongoDB

**Nível:** Iniciante / Junior
**Tempo estimado:** 1h30 a 2h (primeira vez)
**Objetivo:** Ter o sistema rodando localmente e/ou na nuvem com MongoDB como banco de dados

---

## Antes de começar — Leia isto

Este tutorial vai te guiar **passo a passo**, do zero. Você vai:
1. Instalar as ferramentas necessárias no seu computador
2. Criar um banco de dados MongoDB (gratuito na nuvem)
3. Adaptar o servidor para usar o MongoDB
4. Rodar o sistema localmente
5. (Opcional) Publicar na internet gratuitamente

> **Não sabe programar?** Sem problema. Cada comando é explicado. Basta copiar e colar com atenção.

> **Já tem Node.js instalado?** Pule para o [Passo 2](#passo-2-criando-o-banco-de-dados-mongodb).

---

## Sumário

- [Passo 1 — Instalar Node.js](#passo-1--instalar-nodejs)
- [Passo 2 — Criando o banco de dados MongoDB](#passo-2--criando-o-banco-de-dados-mongodb)
- [Passo 3 — Configurando o projeto](#passo-3--configurando-o-projeto)
- [Passo 4 — Instalando a dependência do MongoDB](#passo-4--instalando-a-dependência-do-mongodb)
- [Passo 5 — Criando o arquivo de configuração (.env)](#passo-5--criando-o-arquivo-de-configuração-env)
- [Passo 6 — Criando o servidor com MongoDB](#passo-6--criando-o-servidor-com-mongodb)
- [Passo 7 — Rodando o sistema](#passo-7--rodando-o-sistema)
- [Passo 8 — Verificando que tudo funciona](#passo-8--verificando-que-tudo-funciona)
- [Passo 9 (Opcional) — Publicando na internet com Railway](#passo-9-opcional--publicando-na-internet-com-railway)
- [Erros Comuns e Soluções](#erros-comuns-e-soluções)
- [Como funciona a integração (para curiosos)](#como-funciona-a-integração-para-curiosos)

---

## Passo 1 — Instalar Node.js

O Node.js é o motor que roda o servidor do sistema no seu computador.

### Como verificar se já tem

Abra o terminal (no Mac: `Command + Espaço` → digite "Terminal" → Enter) e digite:

```bash
node --version
```

Se aparecer algo como `v18.0.0` ou maior, **você já tem o Node.js**. Pule para o Passo 2.

Se aparecer `command not found`, siga os passos abaixo:

### Instalando o Node.js

1. Acesse: **https://nodejs.org**
2. Clique no botão **"LTS"** (Long Term Support — versão mais estável)
3. Baixe o instalador para o seu sistema operacional
4. Execute o instalador e clique em "Next" / "Continuar" em todas as telas
5. Quando terminar, **feche e abra o terminal novamente**
6. Digite `node --version` para confirmar. Deve aparecer `v20.x.x` ou similar.

Junto com o Node.js vem o **npm** (gerenciador de pacotes). Confirme:

```bash
npm --version
```

Deve aparecer um número como `10.x.x`. Se aparecer, está tudo certo.

---

## Passo 2 — Criando o banco de dados MongoDB

Você tem **duas opções**: MongoDB na nuvem (recomendado para iniciantes) ou MongoDB instalado no seu computador.

**Recomendamos a opção nuvem (MongoDB Atlas)** porque:
- É gratuito (até 512 MB — mais do que suficiente)
- Não precisa instalar nada extra no computador
- Funciona de qualquer lugar
- Você pode usar esse mesmo banco quando publicar online

---

### Opção A — MongoDB Atlas (Nuvem, RECOMENDADO)

#### 1. Criar conta no MongoDB Atlas

1. Acesse: **https://www.mongodb.com/cloud/atlas/register**
2. Preencha nome, email e senha
3. Clique em **"Create your Atlas account"**
4. Verifique o email recebido e clique no link de confirmação

#### 2. Criar um cluster gratuito

Após o login, o Atlas vai te guiar numa configuração inicial:

1. Selecione **"Build a database"**
2. Escolha o plano **M0 Free** (é o gratuito — não precisa de cartão de crédito)
3. Escolha o provedor de nuvem: **AWS** (recomendado) ou Google Cloud
4. Escolha uma região próxima ao Brasil: **São Paulo (sa-east-1)** se disponível, ou **Virginia (us-east-1)**
5. Dê um nome ao cluster: `qa-dashboard-cluster` (ou o que quiser)
6. Clique em **"Create Deployment"**

Aguarde 1-3 minutos enquanto o cluster é criado. Você verá uma barra de progresso.

#### 3. Criar usuário do banco

Enquanto o cluster cria, o Atlas vai pedir para criar um usuário:

1. **Username:** `qa_admin` (ou qualquer nome sem espaços)
2. **Password:** clique em **"Autogenerate Secure Password"** para gerar uma senha forte
3. **IMPORTANTE:** Copie e salve essa senha em algum lugar seguro agora. Você vai precisar dela.
4. Clique em **"Create Database User"**

#### 4. Configurar acesso de rede

O MongoDB Atlas bloqueia conexões por segurança. Precisamos liberar:

1. Clique em **"Choose a connection method"** (ou vá em "Network Access" no menu lateral)
2. Clique em **"Add My Current IP Address"** para adicionar seu IP atual
3. Para desenvolvimento local, você também pode adicionar `0.0.0.0/0` (libera qualquer IP — prático para desenvolvimento, mas use com cuidado em produção)
4. Clique em **"Add Entry"** e depois **"Confirm"**

#### 5. Pegar a Connection String

Esta é a "senha de acesso" ao banco. É uma URL especial:

1. No painel do Atlas, clique em **"Connect"** no seu cluster
2. Selecione **"Drivers"** (a opção com o símbolo `</>`  de código)
3. Em "Driver" selecione **Node.js** e versão **5.5 or later**
4. Você verá uma string assim:

```
mongodb+srv://qa_admin:<password>@qa-dashboard-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

5. **Copie essa string inteira**
6. Substitua `<password>` pela senha que você gerou no passo 3

O resultado final deve ser algo como:
```
mongodb+srv://qa_admin:SuaSenhaAqui123@qa-dashboard-cluster.abc12.mongodb.net/qa_dashboard?retryWrites=true&w=majority
```

> **Dica:** Note o `/qa_dashboard?` — estamos especificando o nome do banco de dados. Adicione esse nome antes do `?` se não estiver presente.

**Guarde essa string** — você vai usar no Passo 5.

---

### Opção B — MongoDB Local (no seu computador)

Use esta opção se preferir não usar a nuvem.

#### Instalar MongoDB Community Server

**macOS:**
```bash
# Instalar o Homebrew primeiro (se não tiver)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Instalar MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Iniciar o MongoDB
brew services start mongodb-community
```

**Windows:**
1. Acesse: **https://www.mongodb.com/try/download/community**
2. Selecione versão **7.0**, plataforma **Windows**, formato **msi**
3. Execute o instalador e siga os passos (aceite todas as opções padrão)
4. Marque a opção "Install MongoDB as a Service" — isso faz o MongoDB iniciar automaticamente

**Linux (Ubuntu/Debian):**
```bash
# Importar a chave pública
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor

# Adicionar repositório
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Instalar
sudo apt-get update
sudo apt-get install -y mongodb-org

# Iniciar o serviço
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### Verificar instalação local

```bash
mongosh --version
```

Se aparecer um número de versão, está instalado.

A **Connection String** para MongoDB local é:
```
mongodb://localhost:27017/qa_dashboard
```

**Guarde essa string** — você vai usar no Passo 5.

---

## Passo 3 — Configurando o projeto

### Abrir o terminal na pasta do projeto

Você precisa abrir o terminal **dentro da pasta do projeto**. Há duas formas:

**Opção 1 — Pelo terminal:**
```bash
cd /Users/jhonnyrobert/Documents/qa_dashboard_project
```
> Substitua o caminho pelo local real da pasta no seu computador.

**Opção 2 — Pelo explorador de arquivos:**
- **Mac:** Arraste a pasta para o ícone do Terminal no Dock, ou clique com botão direito na pasta → "Novo Terminal na Pasta"
- **Windows:** Clique com botão direito dentro da pasta → "Abrir no Terminal" (ou "Git Bash Here")

### Confirmar que está na pasta certa

```bash
ls
```

Você deve ver arquivos como `server.js`, `package.json`, `public/`. Se estiver vendo isso, está no lugar certo.

---

## Passo 4 — Instalando a dependência do MongoDB

O **Mongoose** é a biblioteca que permite o Node.js se comunicar com o MongoDB. Instale com:

```bash
npm install mongoose
```

Aguarde o download terminar. Você verá mensagens como:
```
added 18 packages in 3s
```

Isso é normal. A instalação está concluída quando o cursor piscar novamente.

> **O que é o npm install?** É como uma "loja de aplicativos" para o servidor. O comando baixa e instala o pacote `mongoose` automaticamente.

---

## Passo 5 — Criando o arquivo de configuração (.env)

O arquivo `.env` guarda **informações secretas** (como a senha do banco) **fora do código**. Isso é uma boa prática — nunca coloque senhas direto no código.

### Criar o arquivo

Na pasta do projeto, crie um arquivo chamado exatamente `.env` (com o ponto na frente):

**No terminal:**
```bash
# Mac / Linux
touch .env

# Windows (PowerShell)
New-Item -ItemType File -Name ".env"
```

**Ou pelo VS Code:** File → New File → salve como `.env` na raiz do projeto.

### Preencher o arquivo

Abra o arquivo `.env` no editor de texto e adicione o conteúdo abaixo:

```env
# ─── Servidor ─────────────────────────────────────────────────
PORT=3000

# ─── MongoDB ──────────────────────────────────────────────────
# Cole aqui a sua Connection String obtida no Passo 2
MONGODB_URI=mongodb+srv://qa_admin:SuaSenhaAqui@qa-dashboard-cluster.abc12.mongodb.net/qa_dashboard?retryWrites=true&w=majority

# ─── Projeto ──────────────────────────────────────────────────
QA_PROJECT_KEY=android
```

> **IMPORTANTE:** Substitua o valor de `MONGODB_URI` pela sua Connection String real obtida no Passo 2.
>
> Se usou MongoDB Local, use: `MONGODB_URI=mongodb://localhost:27017/qa_dashboard`

### Proteger o arquivo .env

O arquivo `.env` **nunca deve ser enviado para o Git** (ele contém sua senha). Verifique se existe um `.gitignore` na pasta:

```bash
cat .gitignore
```

Se o arquivo existir e contiver `.env`, está protegido. Se não existir, crie:

```bash
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
```

---

## Passo 6 — Criando o servidor com MongoDB

Agora vamos criar um novo arquivo de servidor que usa MongoDB. Vamos **criar um arquivo novo** chamado `server_mongo.js` para não quebrar o servidor original.

### Criar o arquivo server_mongo.js

Crie o arquivo `/qa_dashboard_project/server_mongo.js` com o seguinte conteúdo completo:

```javascript
// server_mongo.js
// Servidor do QA Dashboard com MongoDB (Mongoose)

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const mongoose   = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI      = process.env.MONGODB_URI;
const DEFAULT_PROJECT_KEY = process.env.QA_PROJECT_KEY || 'android';

// ─── Validação de configuração ─────────────────────────────────────────────

if (!MONGODB_URI) {
    console.error('');
    console.error('❌ ERRO: A variável MONGODB_URI não foi definida!');
    console.error('   Crie o arquivo .env na raiz do projeto com o conteúdo:');
    console.error('   MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/qa_dashboard');
    console.error('');
    process.exit(1);
}

// ─── Schema do MongoDB ─────────────────────────────────────────────────────
//
// Cada sprint é um documento na coleção "dashboards".
// A chave única é "sprint_id" (ex: "sprint_1710000000000").
// O campo "payload" armazena o estado completo da sprint como objeto genérico.

const dashboardSchema = new mongoose.Schema(
    {
        sprint_id:  { type: String, required: true, unique: true, index: true },
        payload:    { type: mongoose.Schema.Types.Mixed, required: true },
        updated_at: { type: Date, default: Date.now }
    },
    {
        // Desativa a conversão automática de tipos para preservar
        // a estrutura exata do payload do frontend
        strict: false
    }
);

// Atualiza updated_at automaticamente em cada save
dashboardSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

const Dashboard = mongoose.model('Dashboard', dashboardSchema);

// ─── Conexão com MongoDB ───────────────────────────────────────────────────

async function connectDB() {
    try {
        console.log('🔌 Conectando ao MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            // Opções recomendadas para evitar avisos de depreciação
            serverSelectionTimeoutMS: 10000, // 10 segundos para tentar conectar
        });
        console.log('✅ MongoDB conectado com sucesso!');
        console.log(`   Banco: ${mongoose.connection.name}`);
        console.log(`   Host:  ${mongoose.connection.host}`);
    } catch (err) {
        console.error('');
        console.error('❌ ERRO ao conectar no MongoDB:', err.message);
        console.error('');
        console.error('   Verifique:');
        console.error('   1. A MONGODB_URI no arquivo .env está correta?');
        console.error('   2. Se usa Atlas: o IP do seu computador está liberado?');
        console.error('      (MongoDB Atlas → Network Access → Add IP Address)');
        console.error('   3. Se usa MongoDB local: o serviço está rodando?');
        console.error('      (Mac: brew services start mongodb-community)');
        console.error('      (Windows: verifique o Serviço "MongoDB" no Gerenciador de Tarefas)');
        console.error('');
        process.exit(1);
    }
}

// Reconexão automática em caso de queda
mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado. Tentando reconectar...');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconectado!');
});

// ─── Middlewares ───────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' })); // 10mb para suportar imagens base64 de mockup
app.use(express.static(path.join(__dirname, 'public')));

// ─── Rota: Config Runtime ──────────────────────────────────────────────────

app.get('/config.js', (req, res) => {
    const config = {
        projectKey:     DEFAULT_PROJECT_KEY,
        apiBasePath:    '/api/dashboard',
        localBackupKey: 'qaDashboardData',
        storageType:    'mongodb'
    };
    res.type('application/javascript');
    res.send(`window.__QA_DASHBOARD_CONFIG__ = ${JSON.stringify(config)};`);
});

// ─── Rota: Health Check ────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
    const dbStatus = mongoose.connection.readyState;
    // readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
    const statusMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({
        ok:      dbStatus === 1,
        service: 'qa-dashboard-api',
        storage: 'mongodb',
        db:      statusMap[dbStatus] || 'unknown'
    });
});

// ─── Rota: Buscar estado de uma sprint ────────────────────────────────────
//
// GET /api/dashboard/:sprintId
// Retorna: { payload: { ...estado da sprint... } }

app.get('/api/dashboard/:sprintId', async (req, res) => {
    try {
        const { sprintId } = req.params;

        const doc = await Dashboard.findOne({ sprint_id: sprintId }).lean();

        if (!doc) {
            return res.status(404).json({
                message: `Sprint "${sprintId}" não encontrada no banco.`
            });
        }

        return res.json({ payload: doc.payload });

    } catch (err) {
        console.error('Erro ao buscar sprint:', err);
        return res.status(500).json({ message: 'Erro interno ao buscar sprint.' });
    }
});

// ─── Rota: Salvar/Atualizar estado de uma sprint ──────────────────────────
//
// PUT /api/dashboard/:sprintId
// Body: { payload: { ...estado da sprint... } }
// Retorna: { payload: { ...estado salvo... } }

app.put('/api/dashboard/:sprintId', async (req, res) => {
    try {
        const { sprintId } = req.params;
        const { payload }  = req.body;

        // Validação básica do payload
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return res.status(400).json({
                message: 'Payload inválido. Esperado um objeto JSON.'
            });
        }

        // findOneAndUpdate com upsert=true:
        // - Se o documento existe → atualiza
        // - Se não existe → cria um novo
        // O {new: true} retorna o documento já atualizado
        const doc = await Dashboard.findOneAndUpdate(
            { sprint_id: sprintId },
            {
                sprint_id:  sprintId,
                payload:    payload,
                updated_at: new Date()
            },
            {
                upsert:    true,   // cria se não existir
                new:       true,   // retorna o documento atualizado
                lean:      true    // retorna objeto JS puro (mais rápido)
            }
        );

        return res.json({ payload: doc.payload });

    } catch (err) {
        console.error('Erro ao salvar sprint:', err);
        return res.status(500).json({ message: 'Erro interno ao salvar sprint.' });
    }
});

// ─── Rota: Listar todas as sprints (bônus) ────────────────────────────────
//
// GET /api/sprints
// Retorna lista de sprints com metadados básicos (sem o payload completo)

app.get('/api/sprints', async (req, res) => {
    try {
        const sprints = await Dashboard.find(
            {},
            { sprint_id: 1, updated_at: 1, 'payload.config': 1 } // projeta só os campos necessários
        ).sort({ updated_at: -1 }).lean();

        const result = sprints.map(s => ({
            id:         s.sprint_id,
            title:      s.payload?.config?.title  || 'S/ Título',
            squad:      s.payload?.config?.squad  || '',
            updatedAt:  s.updated_at
        }));

        return res.json(result);
    } catch (err) {
        console.error('Erro ao listar sprints:', err);
        return res.status(500).json({ message: 'Erro ao listar sprints.' });
    }
});

// ─── Rota: Deletar uma sprint (bônus) ─────────────────────────────────────

app.delete('/api/dashboard/:sprintId', async (req, res) => {
    try {
        const { sprintId } = req.params;
        await Dashboard.deleteOne({ sprint_id: sprintId });
        return res.json({ ok: true, message: `Sprint "${sprintId}" removida.` });
    } catch (err) {
        console.error('Erro ao deletar sprint:', err);
        return res.status(500).json({ message: 'Erro ao deletar sprint.' });
    }
});

// ─── Fallback SPA ──────────────────────────────────────────────────────────
// Qualquer rota não reconhecida retorna o index.html (necessário para o hash routing)

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Inicialização ─────────────────────────────────────────────────────────

async function start() {
    await connectDB();

    app.listen(PORT, () => {
        console.log('');
        console.log('🚀 QA Dashboard rodando!');
        console.log(`   Acesse: http://localhost:${PORT}`);
        console.log('');
        console.log('   Para parar o servidor: pressione Ctrl + C');
        console.log('');
    });
}

start();
```

> **Como criar esse arquivo:**
> 1. Abra o VS Code (ou qualquer editor de texto)
> 2. File → New File
> 3. Cole todo o conteúdo acima
> 4. Salve como `server_mongo.js` dentro da pasta `qa_dashboard_project`

---

## Passo 7 — Rodando o sistema

Com tudo configurado, rode o servidor com o seguinte comando no terminal:

```bash
node server_mongo.js
```

### O que deve aparecer

```
🔌 Conectando ao MongoDB...
✅ MongoDB conectado com sucesso!
   Banco: qa_dashboard
   Host:  qa-dashboard-cluster.abc12.mongodb.net

🚀 QA Dashboard rodando!
   Acesse: http://localhost:3000

   Para parar o servidor: pressione Ctrl + C
```

Se aparecer isso, **está funcionando!** Abra o navegador e acesse:

```
http://localhost:3000
```

### Para parar o servidor

Pressione `Ctrl + C` no terminal.

### Para facilitar: adicionar ao package.json

Abra o arquivo `package.json` e adicione uma linha em `"scripts"`:

```json
{
  "scripts": {
    "dev": "node server.js",
    "start": "node server.js",
    "mongo": "node server_mongo.js"
  }
}
```

Depois você pode iniciar com:
```bash
npm run mongo
```

---

## Passo 8 — Verificando que tudo funciona

### Teste 1 — Health Check

Abra o navegador e acesse:
```
http://localhost:3000/api/health
```

Você deve ver:
```json
{
  "ok": true,
  "service": "qa-dashboard-api",
  "storage": "mongodb",
  "db": "connected"
}
```

Se `"ok": true` e `"db": "connected"` aparecerem, o banco está conectado.

### Teste 2 — Criar uma Sprint

1. Acesse `http://localhost:3000`
2. Clique em **"Nova Sprint"**
3. Digite um nome e clique em **"Criar"**
4. O sistema vai abrir o dashboard da sprint
5. Faça qualquer alteração (ex: adicione uma feature)
6. Aguarde 1-2 segundos (o backup automático tem um delay de 700ms)

### Teste 3 — Verificar no banco

Abra no navegador:
```
http://localhost:3000/api/sprints
```

Você verá a sprint que criou listada como JSON. Isso confirma que foi salva no MongoDB.

### Teste 4 — Simular falha e recuperação

1. Feche a aba do navegador
2. Pare o servidor (`Ctrl + C`)
3. Inicie novamente (`node server_mongo.js`)
4. Acesse `http://localhost:3000`
5. A sprint criada ainda deve aparecer

> **Como funciona a recuperação?** O sistema sempre mantém uma cópia no LocalStorage do navegador (imediata) e envia um backup para o MongoDB (automático após 700ms). Ao reabrir, o sistema carrega do LocalStorage primeiro. Se estiver em outro computador, carrega do MongoDB.

---

## Passo 9 (Opcional) — Publicando na internet com Railway

O **Railway** é uma plataforma que permite hospedar o servidor Node.js na internet de forma gratuita (plano hobby: $5/mês de créditos gratuitos inicialmente) sem precisar configurar servidores.

### Pré-requisitos

- Uma conta no GitHub (gratuita): **https://github.com**
- O código do projeto em um repositório GitHub

### 9.1 — Colocar o código no GitHub

Se ainda não tem o projeto no GitHub:

```bash
# Na pasta do projeto, inicializar o Git
git init

# Criar .gitignore se não existir (IMPORTANTE: protege o .env)
echo ".env" >> .gitignore
echo "node_modules/" >> .gitignore
echo "data/" >> .gitignore

# Adicionar todos os arquivos
git add .

# Criar o primeiro commit
git commit -m "Primeiro commit: QA Dashboard com MongoDB"
```

Agora crie o repositório no GitHub:
1. Acesse **https://github.com/new**
2. Nome: `qa-dashboard` (ou qualquer nome)
3. Selecione **Private** (para manter o código privado)
4. **NÃO** marque "Add README" nem "Add .gitignore" (você já tem)
5. Clique em **"Create repository"**

O GitHub vai mostrar comandos. Copie e execute no terminal:
```bash
git remote add origin https://github.com/SEU_USUARIO/qa-dashboard.git
git branch -M main
git push -u origin main
```

### 9.2 — Criar conta no Railway

1. Acesse: **https://railway.app**
2. Clique em **"Login with GitHub"**
3. Autorize o Railway a acessar sua conta GitHub

### 9.3 — Criar um novo projeto

1. No dashboard do Railway, clique em **"New Project"**
2. Selecione **"Deploy from GitHub repo"**
3. Selecione o repositório `qa-dashboard`
4. Railway vai detectar automaticamente que é Node.js

### 9.4 — Configurar as variáveis de ambiente

Após criar o projeto, vá em **"Variables"** no painel do Railway:

Clique em **"New Variable"** para cada uma:

| Nome da Variável | Valor |
|-----------------|-------|
| `MONGODB_URI` | Sua connection string do MongoDB Atlas |
| `PORT` | `3000` |
| `QA_PROJECT_KEY` | `android` |

> **IMPORTANTE:** Use a connection string do **MongoDB Atlas** (nuvem), não a do localhost. O Railway não tem acesso ao MongoDB do seu computador.

### 9.5 — Configurar o comando de start

O Railway precisa saber como iniciar o servidor. Vá em **"Settings"** → **"Start Command"** e coloque:

```
node server_mongo.js
```

### 9.6 — Fazer o deploy

1. Clique em **"Deploy"** (ou o Railway pode ter feito automaticamente)
2. Aguarde 1-3 minutos
3. Quando aparecer **"Success"**, clique em **"View Logs"** para ver se está tudo bem
4. Vá em **"Settings"** → **"Domains"** → **"Generate Domain"**
5. Você receberá uma URL como: `https://qa-dashboard-production.up.railway.app`

Acesse essa URL no navegador e o sistema estará **ao vivo na internet**.

---

## Erros Comuns e Soluções

---

### ❌ `Cannot find module 'mongoose'`

**O que significa:** O Mongoose não foi instalado.

**Solução:**
```bash
npm install mongoose
```

---

### ❌ `MongoServerSelectionError: connection timed out`

**O que significa:** O MongoDB não conseguiu ser acessado. Causa mais comum: IP não liberado no Atlas.

**Solução (MongoDB Atlas):**
1. Acesse o painel do Atlas
2. Vá em **"Network Access"** no menu lateral
3. Clique em **"Add IP Address"**
4. Clique em **"Add Current IP Address"** para adicionar o IP atual
5. Aguarde 1-2 minutos para as mudanças propagarem
6. Tente novamente

---

### ❌ `MongoParseError: Invalid connection string`

**O que significa:** A `MONGODB_URI` no arquivo `.env` está com formato errado.

**Verifique:**
- A senha não contém caracteres especiais não escapados (ex: `@`, `#`, `%`)
- Se sua senha tem `@`, você precisa codificá-la: `@` vira `%40`
- A string começa com `mongodb+srv://` ou `mongodb://`
- Não há espaços na string

---

### ❌ `Error: ENOENT: no such file or directory, open '.env'`

**O que significa:** O arquivo `.env` não existe ou está no lugar errado.

**Solução:**
```bash
# Confirmar que está na pasta certa
ls -la | grep .env

# Se não aparecer, criar o arquivo
touch .env
```

---

### ❌ `Port 3000 already in use`

**O que significa:** Outra aplicação está usando a porta 3000.

**Solução — Mudar a porta:**
No arquivo `.env`, troque:
```env
PORT=3001
```

Depois acesse `http://localhost:3001`.

Ou para encerrar o processo que usa a porta 3000:
```bash
# Mac / Linux
lsof -ti:3000 | xargs kill

# Windows (PowerShell)
netstat -ano | findstr :3000
# Anote o PID e execute:
taskkill /PID <PID> /F
```

---

### ❌ O sistema abre mas não salva no MongoDB

**O que acontece:** O sistema funciona normalmente (LocalStorage), mas o backup MongoDB não funciona.

**Como diagnosticar:**
1. Abra o DevTools do navegador (F12)
2. Vá na aba **"Console"**
3. Procure por erros em vermelho com "fetch" ou "PUT /api/dashboard"
4. Acesse `http://localhost:3000/api/health` — verifique se `"db": "connected"`

**Causa comum:** O servidor foi iniciado mas a conexão MongoDB falhou silenciosamente.
**Solução:** Verifique os logs no terminal onde o servidor está rodando.

---

### ❌ `Authentication failed` no Atlas

**O que significa:** Usuário ou senha incorretos na connection string.

**Solução:**
1. No Atlas, vá em **"Database Access"**
2. Clique em **Edit** no seu usuário
3. Clique em **"Edit Password"** → **"Autogenerate Secure Password"**
4. Copie a nova senha
5. Atualize o arquivo `.env` com a nova string de conexão

---

## Como funciona a integração (para curiosos)

Este diagrama mostra como o frontend (navegador), o servidor (Node.js) e o MongoDB interagem:

```
┌─────────────────────────────────────────────────────────────────┐
│                    NAVEGADOR (Frontend)                          │
│                                                                  │
│   Usuário altera dado → saveState()                             │
│        │                                                         │
│        ├─ 1. Salva IMEDIATAMENTE no LocalStorage                │
│        │    (sem delay, o dado não se perde)                     │
│        │                                                         │
│        └─ 2. Aguarda 700ms (debounce)                           │
│                  │                                               │
│                  └─ fetch PUT /api/dashboard/{sprintId}         │
│                       body: { payload: estadoCompleto }         │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   server_mongo.js (Node.js)                      │
│                                                                  │
│   PUT /api/dashboard/:sprintId                                  │
│        │                                                         │
│        ├─ Valida o payload                                      │
│        ├─ Dashboard.findOneAndUpdate(                           │
│        │    { sprint_id: sprintId },   ← chave de busca        │
│        │    { payload, updated_at },   ← dado a salvar         │
│        │    { upsert: true }            ← cria se não existir  │
│        │  )                                                      │
│        └─ Responde 200 OK                                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ Mongoose (Driver MongoDB)
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB (Atlas ou Local)                     │
│                                                                  │
│   Coleção: dashboards                                           │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │ {                                                        │  │
│   │   "_id": ObjectId("..."),                               │  │
│   │   "sprint_id": "sprint_1710000000000",                  │  │
│   │   "updated_at": "2026-03-14T10:00:00Z",                 │  │
│   │   "payload": {                                          │  │
│   │     "config": { "title": "Sprint 12", ... },           │  │
│   │     "features": [...],                                  │  │
│   │     "bugs": [...],                                      │  │
│   │     ...                                                 │  │
│   │   }                                                     │  │
│   │ }                                                        │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Por que usar MongoDB em vez de arquivos JSON?

| Critério               | Arquivos JSON (modo local) | MongoDB              |
|------------------------|---------------------------|----------------------|
| Múltiplos usuários     | ❌ Conflitos de escrita    | ✅ Concorrência segura |
| Acesso remoto          | ❌ Só no mesmo computador  | ✅ Qualquer lugar     |
| Backup automático      | ❌ Manual                  | ✅ Atlas faz backups  |
| Escala                 | ❌ Limitado                | ✅ Cresce conforme necessário |
| Busca e filtros        | ❌ Precisa ler tudo        | ✅ Queries eficientes |
| Configuração           | ✅ Zero                    | ⚠️ Requer setup      |

---

## Resumo dos Comandos

```bash
# 1. Instalar dependência do MongoDB
npm install mongoose

# 2. Criar arquivo de configuração
touch .env
# (edite o .env com sua MONGODB_URI)

# 3. Rodar o servidor com MongoDB
node server_mongo.js

# 4. Acessar no navegador
# http://localhost:3000

# 5. Verificar saúde da conexão
# http://localhost:3000/api/health

# 6. Ver sprints salvas no banco
# http://localhost:3000/api/sprints
```

---

*Tutorial criado para o QA Dashboard v2.0 — 2026-03-15*
*Para dúvidas, abra uma issue no repositório do projeto.*
