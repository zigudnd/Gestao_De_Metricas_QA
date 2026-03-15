require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_PROJECT_KEY = process.env.QA_PROJECT_KEY || 'android';

// Storage configuration
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' or 'supabase'
const DATA_DIR = path.join(__dirname, 'data');

let supabase = null;

if (STORAGE_TYPE === 'supabase') {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('⚠️ ATENÇÃO: Variáveis SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias quando STORAGE_TYPE=supabase.');
    process.exit(1);
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
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

app.use(cors());
app.use(express.json({ limit: '10mb' }));
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

app.get('/api/dashboard/:projectKey', async (req, res) => {
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

app.put('/api/dashboard/:projectKey', async (req, res) => {
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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`QA Dashboard rodando em http://localhost:${PORT}`);
});
