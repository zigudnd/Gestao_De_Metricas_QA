// server_mongo.js
// Servidor do QA Dashboard com MongoDB (Mongoose)

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI         = process.env.MONGODB_URI;
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
    { strict: false }
);

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
            serverSelectionTimeoutMS: 10000,
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
        console.error('');
        process.exit(1);
    }
}

mongoose.connection.on('disconnected', () => {
    console.warn('⚠️  MongoDB desconectado. Tentando reconectar...');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconectado!');
});

// ─── Middlewares ───────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json({ limit: '10mb' }));
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
    const dbState  = mongoose.connection.readyState;
    const stateMap = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
    res.json({
        ok:      dbState === 1,
        service: 'qa-dashboard-api',
        storage: 'mongodb',
        db:      stateMap[dbState] || 'unknown'
    });
});

// ─── Rota: Buscar sprint ───────────────────────────────────────────────────

app.get('/api/dashboard/:sprintId', async (req, res) => {
    try {
        const { sprintId } = req.params;
        const doc = await Dashboard.findOne({ sprint_id: sprintId }).lean();

        if (!doc) {
            return res.status(404).json({ message: `Sprint "${sprintId}" não encontrada.` });
        }

        return res.json({ payload: doc.payload });
    } catch (err) {
        console.error('Erro ao buscar sprint:', err);
        return res.status(500).json({ message: 'Erro interno ao buscar sprint.' });
    }
});

// ─── Rota: Salvar/Atualizar sprint ────────────────────────────────────────

app.put('/api/dashboard/:sprintId', async (req, res) => {
    try {
        const { sprintId } = req.params;
        const { payload }  = req.body;

        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
            return res.status(400).json({ message: 'Payload inválido. Esperado um objeto JSON.' });
        }

        const doc = await Dashboard.findOneAndUpdate(
            { sprint_id: sprintId },
            { sprint_id: sprintId, payload, updated_at: new Date() },
            { upsert: true, new: true, lean: true }
        );

        return res.json({ payload: doc.payload });
    } catch (err) {
        console.error('Erro ao salvar sprint:', err);
        return res.status(500).json({ message: 'Erro interno ao salvar sprint.' });
    }
});

// ─── Rota: Listar sprints ─────────────────────────────────────────────────

app.get('/api/sprints', async (req, res) => {
    try {
        const sprints = await Dashboard.find(
            {},
            { sprint_id: 1, updated_at: 1, 'payload.config': 1 }
        ).sort({ updated_at: -1 }).lean();

        const result = sprints.map(s => ({
            id:        s.sprint_id,
            title:     s.payload?.config?.title || 'S/ Título',
            squad:     s.payload?.config?.squad || '',
            updatedAt: s.updated_at
        }));

        return res.json(result);
    } catch (err) {
        console.error('Erro ao listar sprints:', err);
        return res.status(500).json({ message: 'Erro ao listar sprints.' });
    }
});

// ─── Rota: Deletar sprint ─────────────────────────────────────────────────

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
        console.log('   Para parar o servidor: Ctrl + C');
        console.log('');
    });
}

start();
