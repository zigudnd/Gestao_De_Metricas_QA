require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// ── Validation Schemas ──────────────────────────────────────────────────────
const createUserSchema = z.object({
  email: z.string().email('Email inválido').max(255),
  display_name: z.string().min(1, 'Nome é obrigatório').max(100),
  global_role: z.enum(['admin', 'gerente', 'user']).optional(),
});

const resetPasswordSchema = z.object({
  user_id: z.string().uuid('user_id deve ser UUID válido'),
});

const dashboardPayloadSchema = z.object({
  payload: z.record(z.unknown()).refine(val => !Array.isArray(val), 'Payload não pode ser array'),
});

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Dados inválidos',
        details: result.error.issues.map(i => i.message),
      });
    }
    req.validatedBody = result.data;
    next();
  };
}

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_PROJECT_KEY = process.env.QA_PROJECT_KEY || 'android';

// Storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' or 'supabase'
const DATA_DIR = path.join(__dirname, 'data');

// Client com service_role (admin) — sempre criado se as vars existirem
let supabaseAdmin = null;
const SB_URL = process.env.SUPABASE_URL;
const SB_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (SB_URL && SB_SERVICE_KEY) {
  supabaseAdmin = createClient(SB_URL, SB_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

let supabase = supabaseAdmin;

if (STORAGE_TYPE === 'supabase') {
  if (!supabaseAdmin) {
    console.error('⚠️ ATENÇÃO: Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias quando STORAGE_TYPE=supabase.');
    process.exit(1);
  }
  console.log('✅ Back-end configurado para usar: SUPABASE');
} else {
  // Ensure data directory exists for local storage
  async function ensureDataDir() {
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (err) {
      console.error('Erro ao criar diretório de dados local:', err);
    }
  }
  ensureDataDir();
  console.log('✅ Back-end configurado para usar: LOCAL (Pasta data/)');
}

app.set('trust proxy', 1);
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || `http://localhost:5173,http://localhost:${PORT}`).split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));
const adminLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const flushLimiter = rateLimit({ windowMs: 60_000, max: 30 });

// ── Middleware: autenticação admin (requer global_role admin ou gerente) ──────
async function requireAdminAuth(req, res, next) {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase não configurado.' });
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !caller) return res.status(401).json({ error: 'Token inválido ou expirado.' });
    const { data: callerProfile, error: profileErr } = await supabaseAdmin.from('profiles').select('global_role').eq('id', caller.id).single();
    if (profileErr) {
      console.error('[requireAdminAuth] Erro ao buscar profile:', profileErr);
      return res.status(500).json({ error: 'Erro ao verificar perfil do usuário.' });
    }
    if (!callerProfile || (callerProfile.global_role !== 'admin' && callerProfile.global_role !== 'gerente')) {
      return res.status(403).json({ error: 'Apenas administradores podem executar esta ação.' });
    }
    req.caller = caller;
    req.callerProfile = callerProfile;
    next();
  } catch (err) {
    console.error('[requireAdminAuth] Falha:', err);
    return res.status(401).json({ error: 'Falha na autenticação.' });
  }
}

const KEY_REGEX = /^[a-zA-Z0-9_-]{1,80}$/;
function validateKey(req, res, next) {
  if (!KEY_REGEX.test(req.params.projectKey)) {
    return res.status(400).json({ error: 'projectKey inválido' });
  }
  next();
}
app.use(express.static(path.join(__dirname, 'public')));

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
  apis: ['./server.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ToStatos API Docs',
}));

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
    storageType: STORAGE_TYPE
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

/**
 * @openapi
 * /api/dashboard/{projectKey}:
 *   get:
 *     tags: [Dashboard]
 *     summary: Buscar dashboard por projectKey
 *     description: Retorna o estado completo de um dashboard QA (sprints, bugs, features, etc).
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema: { type: string, pattern: "^[a-zA-Z0-9_-]{1,80}$" }
 *         description: Chave do projeto (ex sprint_1234567890)
 *     responses:
 *       200:
 *         description: Dashboard encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project_key: { type: string }
 *                 payload: { type: object }
 *                 updated_at: { type: string, format: date-time }
 *       400:
 *         description: projectKey inválido
 *       404:
 *         description: Dashboard não encontrado
 *       500:
 *         description: Erro interno
 */
app.get('/api/dashboard/:projectKey', validateKey, async (req, res) => {
  try {
    const { projectKey } = req.params;

    if (STORAGE_TYPE === 'supabase') {
      const { data, error } = await supabase
        .from('dashboard_states')
        .select('project_key, payload, updated_at')
        .eq('project_key', projectKey)
        .maybeSingle();

      if (error) throw error;
      if (!data) return res.status(404).json({ error: 'Dashboard não encontrado no Supabase.' });
      
      return res.json(data);
    } else {
      // Local Storage Logic
      const filePath = path.join(DATA_DIR, `dashboard_${projectKey}.json`);
      try {
        const fileData = await fs.readFile(filePath, 'utf-8');
        return res.json(JSON.parse(fileData));
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ error: 'Dashboard não encontrado localmente.' });
        }
        throw err;
      }
    }
  } catch (error) {
    console.error(`Erro ao buscar dashboard (${STORAGE_TYPE}):`, error);
    return res.status(500).json({ error: 'Erro ao buscar dashboard.' });
  }
});

/**
 * @openapi
 * /api/dashboard/{projectKey}:
 *   put:
 *     tags: [Dashboard]
 *     summary: Salvar/atualizar dashboard
 *     description: Upsert do estado completo de um dashboard QA. Cria se não existir.
 *     parameters:
 *       - in: path
 *         name: projectKey
 *         required: true
 *         schema: { type: string, pattern: "^[a-zA-Z0-9_-]{1,80}$" }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [payload]
 *             properties:
 *               payload:
 *                 type: object
 *                 description: Estado completo do dashboard (JSON livre)
 *     responses:
 *       200:
 *         description: Dashboard salvo com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 project_key: { type: string }
 *                 payload: { type: object }
 *                 updated_at: { type: string, format: date-time }
 *       400:
 *         description: Payload inválido
 *       500:
 *         description: Erro interno
 */
app.put('/api/dashboard/:projectKey', validateKey, requireAdminAuth, validateBody(dashboardPayloadSchema), async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { payload } = req.validatedBody;

    const row = {
      project_key: projectKey,
      payload,
      updated_at: new Date().toISOString()
    };

    if (STORAGE_TYPE === 'supabase') {
      const { data, error } = await supabase
        .from('dashboard_states')
        .upsert(row, { onConflict: 'project_key' })
        .select('project_key, payload, updated_at')
        .single();

      if (error) throw error;
      return res.json(data);
    } else {
      // Local Storage Logic
      const filePath = path.join(DATA_DIR, `dashboard_${projectKey}.json`);
      await fs.writeFile(filePath, JSON.stringify(row, null, 2), 'utf-8');
      return res.json(row);
    }
  } catch (error) {
    console.error(`Erro ao salvar dashboard (${STORAGE_TYPE}):`, error);
    return res.status(500).json({ error: 'Erro ao salvar dashboard.' });
  }
});

// ── Admin: criar usuário via Supabase Auth Admin API ─────────────────────────
/**
 * @openapi
 * /api/admin/create-user:
 *   post:
 *     tags: [Admin]
 *     summary: Criar novo usuário
 *     description: Cria usuário via Supabase Auth Admin API com senha temporária e flag must_change_password. Requer Bearer token de admin/gerente.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, display_name]
 *             properties:
 *               email: { type: string, format: email, example: "qa@empresa.com" }
 *               display_name: { type: string, example: "Maria Silva", maxLength: 100 }
 *     responses:
 *       200:
 *         description: Usuário criado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 email: { type: string }
 *                 temporaryPassword: { type: string }
 *       400: { description: Dados inválidos ou email já cadastrado }
 *       401: { description: Token ausente ou inválido }
 *       403: { description: Acesso negado — requer admin/gerente }
 *       503: { description: Supabase não configurado }
 */
app.post('/api/admin/create-user', adminLimiter, requireAdminAuth, validateBody(createUserSchema), async (req, res) => {
  const { email, display_name, global_role } = req.validatedBody;
  // Gerar senha temporária aleatória (16 chars, base64)
  const password = crypto.randomBytes(12).toString('base64').slice(0, 16) + '!1';

  try {
    const metadata = { display_name, must_change_password: true };
    if (global_role) metadata.global_role = global_role;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json({ id: data.user.id, email: data.user.email, temporaryPassword: password });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

// ── Admin: resetar senha de usuário ──────────────────────────────────────────
/**
 * @openapi
 * /api/admin/reset-password:
 *   post:
 *     tags: [Admin]
 *     summary: Resetar senha de usuário
 *     description: Gera nova senha temporária e marca must_change_password. Requer Bearer token de admin/gerente.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [user_id]
 *             properties:
 *               user_id: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Senha resetada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 temporaryPassword: { type: string }
 *       400: { description: user_id inválido }
 *       401: { description: Token ausente ou inválido }
 *       403: { description: Acesso negado }
 *       503: { description: Supabase não configurado }
 */
app.post('/api/admin/reset-password', adminLimiter, requireAdminAuth, validateBody(resetPasswordSchema), async (req, res) => {
  const { user_id } = req.validatedBody;

  try {
    // Prevent self-reset
    if (user_id === req.caller.id) {
      return res.status(403).json({ error: 'Não é permitido resetar a própria senha por este endpoint.' });
    }

    // Fetch target user's profile to check role
    const { data: targetProfile, error: targetErr } = await supabaseAdmin.from('profiles').select('global_role').eq('id', user_id).single();
    if (targetErr || !targetProfile) {
      return res.status(404).json({ error: 'Usuário alvo não encontrado.' });
    }

    // Prevent gerente from resetting admin passwords
    if (req.callerProfile.global_role === 'gerente' && targetProfile.global_role === 'admin') {
      return res.status(403).json({ error: 'Gerentes não podem resetar senhas de administradores.' });
    }

    const newPassword = crypto.randomBytes(12).toString('base64').slice(0, 16) + '!1';
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: newPassword,
      user_metadata: { must_change_password: true },
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.json({ ok: true, temporaryPassword: newPassword });
  } catch (err) {
    console.error('Erro ao resetar senha:', err);
    return res.status(500).json({ error: 'Erro interno ao resetar senha.' });
  }
});

// ── Status Report: flush pendente ao fechar aba (sendBeacon) ─────────────────
/**
 * @openapi
 * /api/status-report-flush:
 *   post:
 *     tags: [Flush]
 *     summary: Flush de status report (sendBeacon)
 *     description: Persiste dados de status report enviados via navigator.sendBeacon ao fechar a aba. Aceita text/plain com JSON stringificado.
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *             description: "JSON stringificado com { id, data, squad_id?, status? }"
 *     responses:
 *       200:
 *         description: Dados persistidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       400:
 *         description: JSON inválido ou ID ausente
 *       503:
 *         description: Supabase não configurado
 */
app.post('/api/status-report-flush', flushLimiter, express.text({ type: '*/*', limit: '10kb' }), async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase não configurado.' });
  try {
    const payload = JSON.parse(req.body);
    // Validação de input
    if (!payload.id || typeof payload.id !== 'string' || payload.id.length > 100) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      return res.status(400).json({ error: 'Data inválido.' });
    }
    // Não confiar em timestamps do client
    const { error: dbError } = await supabaseAdmin.from('status_reports').upsert({
      id: payload.id,
      data: payload.data,
      squad_id: payload.squad_id || null,
      status: payload.status || 'active',
      updated_at: new Date().toISOString(),
    });
    if (dbError) {
      console.error('[flush] upsert error:', dbError.message);
      return res.status(500).json({ error: 'Falha ao salvar dados.' });
    }
    return res.json({ ok: true });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return res.status(400).json({ error: 'JSON inválido.' });
    }
    console.error('[flush] Erro:', e);
    return res.status(500).json({ error: 'Erro ao persistir.' });
  }
});

/**
 * @openapi
 * /api/release-flush:
 *   post:
 *     tags: [Flush]
 *     summary: Flush de release (sendBeacon)
 *     description: Persiste dados de release enviados via navigator.sendBeacon ao fechar a aba.
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *             description: "JSON stringificado com { id, data, status?, version?, production_date? }"
 *     responses:
 *       200:
 *         description: Dados persistidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       400: { description: JSON inválido ou ID ausente }
 *       503: { description: Supabase não configurado }
 */
app.post('/api/release-flush', flushLimiter, express.text({ type: '*/*', limit: '10kb' }), async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase não configurado.' });
  try {
    const payload = JSON.parse(req.body);
    if (!payload.id || typeof payload.id !== 'string' || payload.id.length > 100) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      return res.status(400).json({ error: 'Data inválido.' });
    }
    const { error: dbError } = await supabaseAdmin.from('releases').upsert({
      id: payload.id,
      data: payload.data,
      status: payload.status || 'planejada',
      version: payload.version || null,
      production_date: payload.production_date || null,
      updated_at: new Date().toISOString(),
    });
    if (dbError) {
      console.error('[flush] upsert error:', dbError.message);
      return res.status(500).json({ error: 'Falha ao salvar dados.' });
    }
    return res.json({ ok: true });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return res.status(400).json({ error: 'JSON inválido.' });
    }
    console.error('[release-flush] Erro:', e);
    return res.status(500).json({ error: 'Erro ao persistir.' });
  }
});

/**
 * @openapi
 * /api/sprint-flush:
 *   post:
 *     tags: [Flush]
 *     summary: Flush de sprint (sendBeacon)
 *     description: Persiste dados de sprint enviados via navigator.sendBeacon ao fechar a aba.
 *     requestBody:
 *       required: true
 *       content:
 *         text/plain:
 *           schema:
 *             type: string
 *             description: "JSON stringificado com { id, data, squad_id?, status? }"
 *     responses:
 *       200:
 *         description: Dados persistidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *       400: { description: JSON inválido ou ID ausente }
 *       503: { description: Supabase não configurado }
 */
app.post('/api/sprint-flush', flushLimiter, express.text({ type: '*/*', limit: '10kb' }), async (req, res) => {
  if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase não configurado.' });
  try {
    const payload = JSON.parse(req.body);
    if (!payload.id || typeof payload.id !== 'string' || payload.id.length > 100) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      return res.status(400).json({ error: 'Data inválido.' });
    }
    const { error: dbError } = await supabaseAdmin.from('sprints').upsert({
      id: payload.id,
      data: payload.data,
      squad_id: payload.squad_id || null,
      status: payload.status || 'ativa',
      updated_at: new Date().toISOString(),
    });
    if (dbError) {
      console.error('[flush] upsert error:', dbError.message);
      return res.status(500).json({ error: 'Falha ao salvar dados.' });
    }
    return res.json({ ok: true });
  } catch (e) {
    if (e instanceof SyntaxError) return res.status(400).json({ error: 'JSON inválido.' });
    console.error('[sprint-flush] Erro:', e);
    return res.status(500).json({ error: 'Erro ao persistir.' });
  }
});

// ── API 404 catch-all (antes do SPA) ─────────────────────────────────────────
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint não encontrado.' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Global error handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

app.listen(PORT, () => {
  console.log(`QA Dashboard rodando em http://localhost:${PORT}`);
});
