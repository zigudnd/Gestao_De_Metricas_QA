# QA Dashboard com Armazenamento Local (Node.js)

Projeto pronto para executar seu dashboard localmente. Em vez de depender de bancos de dados em nuvem como Supabase, esta arquitetura salva todo o estado das suas sprints em arquivos JSON locais na máquina. Isso garante flexibilidade, segurança e total conformidade (Sem vazamento de métricas confidenciais na web).

## Estrutura

- `public/index.html`: dashboard principal.
- `server.js`: API Node.js ultraleve com rotas de salvamento.
- `data/`: pasta gerada automaticamente para armazenar os backups `dashboard_*.json`.

## Como funciona

- Ao abrir a página, o front faz `GET /api/dashboard/:projectKey` pedindo os dados da sprint.
- Ao editar qualquer dado, o front (além do backup salvo no LocalStorage do seu navegador) envia a carga para `PUT /api/dashboard/:projectKey`.
- O servidor recebe e salva/cria um arquivo JSON local na pasta `data/`.

## ✨ Principais Funcionalidades e Casos de Uso

O QA Dashboard centraliza em um único ambiente tudo que um Líder ou Analista de Qualidade precisa para gerenciar os testes e reportar o andamento da Sprint.

- **Visão Executiva (C-Level & Gerencial):** Painel principal de alto nível onde stakeholders acompanham o "Pulse" da Sprint. Apresenta KPI’s como *QA Health Score*, meta de execução vs executado, e o avanço diário através de gráficos como o *Burndown Chart*.
- **Gestão de Casos de Teste Estruturada:** Você pode cadastrar Módulos, Funcionalidades e Casos de Teste em formato Gherkin e acompanhá-los via Checklists (Passou / Falhou / Bloqueado).
- **Gestão de Impedimentos Dinâmica:** Chega de planilhas paralelas de bugs. Se uma tela está bloqueada, você insere diretamente no card do Teste o Motivo do Bloqueio, que alimentará os gráficos de gargalos da visão executiva e deixará a feature com um visual de Alerta na área operacional.
- **QA Health Score Personalizável**: Ajuste o peso das penalidades da sua equipe (Retestes, Bugs Críticos, Telas Bloqueadas, etc) direto na aba de Configurações, flexibilizando o dashboard para o nível de rigor do seu projeto.
- **Armazenamento 100% Local (Secure-by-Design)**: Ignora bancos externos e salva os backups numa pasta local `data/`, atendendo rigidamente regras de compliance contra vazamento de métricas em ambientes corporativos sensíveis.
- **Premissas e Plano de Ação (Gestão de Risco):** Ambiente dedicado na aba "Visão Executiva" para descrever gatilhos de atraso arquitetural com foco em resolutividade rápida lado a lado.
- **Exportação One-Click:** Envie status por e-mail no final do dia clicando no botão "📸 Exportar Imagem", que tira um *snapshot* renderizado exato dos seus indicadores do dia.

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
