require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const helmet = require('helmet');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const { generalLimiter } = require('./middleware/rateLimiter');
const { requestId } = require('./middleware/requestId');
const adminRoutes = require('./routes/admin.routes');
const flushRoutes = require('./routes/flush.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const apikeysRoutes = require('./routes/v1/apikeys.routes');
const releasesRoutes = require('./routes/v1/releases.routes');
const sprintsRoutes = require('./routes/v1/sprints.routes');
const squadsRoutes = require('./routes/v1/squads.routes');
const sprintsWriteRoutes = require('./routes/v1/sprints.write.routes');
const releasesWriteRoutes = require('./routes/v1/releases.write.routes');
const auditRoutes = require('./routes/v1/audit.routes');

// ── App & Config ────────────────────────────────────────────────────────────

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_PROJECT_KEY = process.env.QA_PROJECT_KEY || 'android';
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';
const DATA_DIR = path.join(__dirname, 'data');

// ── Supabase Admin Client ───────────────────────────────────────────────────

let supabaseAdmin = null;
const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (SB_URL && SB_SERVICE_KEY) {
  supabaseAdmin = createClient(SB_URL, SB_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

if (STORAGE_TYPE === 'supabase') {
  if (!supabaseAdmin) {
    console.error('⚠️ ATENÇÃO: Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias quando STORAGE_TYPE=supabase.');
    process.exit(1);
  }
  console.log('✅ Back-end configurado para usar: SUPABASE');
} else {
  (async () => {
    try { await fs.mkdir(DATA_DIR, { recursive: true }); }
    catch (err) { console.error('Erro ao criar diretório de dados local:', err); }
  })();
  console.log('✅ Back-end configurado para usar: LOCAL (Pasta data/)');
}

// Share supabase client with routers via app.locals (Express convention)
app.locals.supabase = supabaseAdmin;

// ── Global Middleware ───────────────────────────────────────────────────────

app.set('trust proxy', 1);
app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGINS || `http://localhost:5173,http://localhost:${PORT}`)
  .split(',')
  .map(s => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/', generalLimiter);
app.use(requestId);

// ── Static Files ────────────────────────────────────────────────────────────

app.use(express.static(path.join(__dirname, 'public')));

// ── Swagger ─────────────────────────────────────────────────────────────────

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ToStatos — QA Dashboard API',
      version: '1.0.0',
      description: 'API do ToStatos para gestão de métricas QA, sprints, status reports e releases.',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 3000}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./routes/*.routes.js', './routes/v1/*.routes.js', './server.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ToStatos API Docs',
}));

// ── Inline Routes (config.js + health) ──────────────────────────────────────

/**
 * @openapi
 * /config.js:
 *   get:
 *     tags: [Sistema]
 *     summary: Configuração do frontend
 *     description: Retorna JavaScript com variáveis de configuração para o frontend (projectKey, storageType).
 *     responses:
 *       200:
 *         description: JavaScript com window.__QA_DASHBOARD_CONFIG__
 *         content:
 *           application/javascript:
 *             schema: { type: string }
 */
app.get('/config.js', (req, res) => {
  const config = {
    projectKey: DEFAULT_PROJECT_KEY,
    apiBasePath: '/api/dashboard',
    localBackupKey: 'qaDashboardData',
    storageType: STORAGE_TYPE,
  };
  res.type('application/javascript');
  res.send(`window.__QA_DASHBOARD_CONFIG__ = ${JSON.stringify(config)};`);
});

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [Sistema]
 *     summary: Health check
 *     description: Verifica se a API está respondendo e qual tipo de storage está configurado.
 *     responses:
 *       200:
 *         description: API funcionando
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 service: { type: string, example: "qa-dashboard-api" }
 *                 storage: { type: string, enum: [local, supabase], example: "local" }
 */
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'qa-dashboard-api', storage: STORAGE_TYPE });
});

// ── Route Mounting ──────────────────────────────────────────────────────────

app.use('/api/admin', adminRoutes);
app.use('/api', flushRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/v1/api-keys', apikeysRoutes);
app.use('/api/v1/releases', releasesRoutes);
app.use('/api/v1/sprints', sprintsRoutes);
app.use('/api/v1/squads', squadsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1', sprintsWriteRoutes);
app.use('/api/v1', releasesWriteRoutes);

// ── API 404 catch-all (antes do SPA) ────────────────────────────────────────

app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado.' });
});

// ── SPA Fallback ────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global Error Handler ────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

// ── Start ───────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`QA Dashboard rodando em http://localhost:${PORT}`);
});
