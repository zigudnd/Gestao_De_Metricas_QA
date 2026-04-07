'use strict';

const path = require('path');
const fs = require('fs').promises;
const router = require('express').Router();
const { requireAdminAuth } = require('../middleware/requireAuth');
const { validateBody, dashboardPayloadSchema } = require('../middleware/validate');

const DATA_DIR = path.join(__dirname, '..', 'data');
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

const KEY_REGEX = /^[a-zA-Z0-9_-]{1,80}$/;
function validateKey(req, res, next) {
  if (!KEY_REGEX.test(req.params.projectKey)) {
    return res.status(400).json({ error: 'projectKey inválido' });
  }
  next();
}

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
router.get('/:projectKey', validateKey, requireAdminAuth, async (req, res) => {
  try {
    const { projectKey } = req.params;
    const supabase = req.app.locals.supabase;

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
router.put('/:projectKey', validateKey, requireAdminAuth, validateBody(dashboardPayloadSchema), async (req, res) => {
  try {
    const { projectKey } = req.params;
    const { payload } = req.validatedBody;
    const supabase = req.app.locals.supabase;

    const row = {
      project_key: projectKey,
      payload,
      updated_at: new Date().toISOString(),
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
      const filePath = path.join(DATA_DIR, `dashboard_${projectKey}.json`);
      await fs.writeFile(filePath, JSON.stringify(row, null, 2), 'utf-8');
      return res.json(row);
    }
  } catch (error) {
    console.error(`Erro ao salvar dashboard (${STORAGE_TYPE}):`, error);
    return res.status(500).json({ error: 'Erro ao salvar dashboard.' });
  }
});

module.exports = router;
