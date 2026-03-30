require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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

app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGINS || `http://localhost:5173,http://localhost:${PORT}`).split(',').map(s => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '2mb' }));
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));
const adminLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const flushLimiter = rateLimit({ windowMs: 60_000, max: 30 });

const KEY_REGEX = /^[a-zA-Z0-9_-]{1,80}$/;
function validateKey(req, res, next) {
  if (!KEY_REGEX.test(req.params.projectKey)) {
    return res.status(400).json({ error: 'projectKey inválido' });
  }
  next();
}
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'qa-dashboard-api', storage: STORAGE_TYPE });
});

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
      if (!data) return res.status(404).json({ message: 'Dashboard não encontrado no Supabase.' });
      
      return res.json(data);
    } else {
      // Local Storage Logic
      const filePath = path.join(DATA_DIR, `dashboard_${projectKey}.json`);
      try {
        const fileData = await fs.readFile(filePath, 'utf-8');
        return res.json(JSON.parse(fileData));
      } catch (err) {
        if (err.code === 'ENOENT') {
          return res.status(404).json({ message: 'Dashboard não encontrado localmente.' });
        }
        throw err;
      }
    }
  } catch (error) {
    console.error(`Erro ao buscar dashboard (${STORAGE_TYPE}):`, error);
    return res.status(500).json({ message: 'Erro ao buscar dashboard.' });
  }
});

app.put('/api/dashboard/:projectKey', validateKey, async (req, res) => {
  try {
    const { projectKey } = req.params;
    const payload = req.body?.payload;

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return res.status(400).json({ message: 'Payload inválido.' });
    }

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
    return res.status(500).json({ message: 'Erro ao salvar dashboard.' });
  }
});

// ── Admin: criar usuário via Supabase Auth Admin API ─────────────────────────
app.post('/api/admin/create-user', adminLimiter, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase não configurado no servidor.' });
  }

  // Verificar autenticação: extrair token do header Authorization
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !caller) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  // Verificar se é admin
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('global_role')
    .eq('id', caller.id)
    .single();
  if (!callerProfile || callerProfile.global_role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem criar usuários.' });
  }

  const { email, display_name } = req.body;
  if (!email || !display_name) {
    return res.status(400).json({ error: 'email e display_name são obrigatórios.' });
  }
  // Gerar senha temporária aleatória (16 chars, base64)
  const password = crypto.randomBytes(12).toString('base64').slice(0, 16) + '!1';

  try {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name, must_change_password: true },
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
app.post('/api/admin/reset-password', adminLimiter, async (req, res) => {
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Supabase não configurado no servidor.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }
  const token = authHeader.split(' ')[1];
  const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !caller) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('global_role')
    .eq('id', caller.id)
    .single();
  if (!callerProfile || callerProfile.global_role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem resetar senhas.' });
  }

  const { user_id } = req.body;
  if (!user_id) {
    return res.status(400).json({ error: 'user_id é obrigatório.' });
  }

  try {
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
app.post('/api/status-report-flush', flushLimiter, express.text({ type: '*/*' }), async (req, res) => {
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
    await supabaseAdmin.from('status_reports').upsert({
      id: payload.id,
      data: payload.data,
      status: payload.status || 'active',
      updated_at: new Date().toISOString(),
    });
    return res.json({ ok: true });
  } catch (e) {
    if (e instanceof SyntaxError) {
      return res.status(400).json({ error: 'JSON inválido.' });
    }
    console.error('[flush] Erro:', e);
    return res.status(500).json({ error: 'Erro ao persistir.' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`QA Dashboard rodando em http://localhost:${PORT}`);
});
