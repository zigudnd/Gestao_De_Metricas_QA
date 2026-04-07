'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { generateApiKey, hashApiKey } = require('../../middleware/apiKeyUtils');
const { requireAdminAuth } = require('../../middleware/requireAuth');
const { validateBody } = require('../../middleware/validate');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────────

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Nome da chave é obrigatório').max(100),
  permissions: z.record(z.boolean()).optional().default({}),
  squad_ids: z.array(z.string()).optional().default([]),
  expires_at: z.string().datetime({ offset: true }).optional().nullable(),
});

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/api-keys:
 *   post:
 *     tags: [API Keys]
 *     summary: Create a new API key
 *     description: |
 *       Generates a new API key for external integrations.
 *       The raw key is returned ONLY in this response — store it securely.
 *       Only admin/gerente users can create API keys.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "CI/CD Pipeline"
 *                 maxLength: 100
 *               permissions:
 *                 type: object
 *                 additionalProperties: { type: boolean }
 *                 example: { "read:metrics": true, "write:sprints": true }
 *               squad_ids:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["squad-abc", "squad-xyz"]
 *               expires_at:
 *                 type: string
 *                 format: date-time
 *                 nullable: true
 *                 example: "2026-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: API key created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string, format: uuid }
 *                     name: { type: string }
 *                     rawToken: { type: string, description: "Raw API key — shown only once" }
 *                     key_prefix: { type: string, example: "tok_abc123de..." }
 *                     permissions: { type: object }
 *                     squad_ids: { type: array, items: { type: string } }
 *                     expires_at: { type: string, format: date-time, nullable: true }
 *                     created_at: { type: string, format: date-time }
 *       400: { description: Invalid input }
 *       401: { description: Authentication required }
 *       403: { description: Admin/gerente role required }
 *       500: { description: Internal server error }
 */
router.post('/', requireAdminAuth, validateBody(createApiKeySchema), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase não configurado.' });
  }

  try {
    const { name, permissions, squad_ids, expires_at } = req.validatedBody;
    const { raw, hash, prefix } = generateApiKey();

    const { data, error } = await supabase
      .from('api_keys')
      .insert({
        name,
        key_hash: hash,
        key_prefix: prefix,
        permissions,
        squad_ids,
        created_by: req.caller.id,
        expires_at: expires_at || null,
      })
      .select('id, name, key_prefix, permissions, squad_ids, expires_at, created_at')
      .single();

    if (error) {
      console.error('[apikeys] Insert error:', error.message);
      return res.status(500).json({ error: 'Erro ao criar API key.' });
    }

    return res.status(201).json({
      data: { ...data, rawToken: raw }, // Raw token shown only once
    });
  } catch (err) {
    console.error('[apikeys] Unexpected error:', err);
    return res.status(500).json({ error: 'Erro interno ao criar API key.' });
  }
});

/**
 * @openapi
 * /api/v1/api-keys:
 *   get:
 *     tags: [API Keys]
 *     summary: List all API keys
 *     description: |
 *       Returns all API keys (without the raw key or hash).
 *       Only admin/gerente users can list API keys.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of API keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       name: { type: string }
 *                       key_prefix: { type: string }
 *                       permissions: { type: object }
 *                       squad_ids: { type: array, items: { type: string } }
 *                       created_by: { type: string, format: uuid }
 *                       expires_at: { type: string, format: date-time, nullable: true }
 *                       last_used_at: { type: string, format: date-time, nullable: true }
 *                       is_active: { type: boolean }
 *                       created_at: { type: string, format: date-time }
 *       401: { description: Authentication required }
 *       403: { description: Admin/gerente role required }
 *       500: { description: Internal server error }
 */
router.get('/', requireAdminAuth, async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase não configurado.' });
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, permissions, squad_ids, created_by, expires_at, last_used_at, is_active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[apikeys] Select error:', error.message);
      return res.status(500).json({ error: 'Erro ao listar API keys.' });
    }

    return res.json({ data });
  } catch (err) {
    console.error('[apikeys] Unexpected error:', err);
    return res.status(500).json({ error: 'Erro interno ao listar API keys.' });
  }
});

/**
 * @openapi
 * /api/v1/api-keys/{id}:
 *   delete:
 *     tags: [API Keys]
 *     summary: Revoke an API key
 *     description: |
 *       Soft-deletes an API key by setting is_active to false.
 *       Only admin/gerente users can revoke API keys.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: API key UUID
 *     responses:
 *       200:
 *         description: API key revoked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 id: { type: string, format: uuid }
 *       400: { description: Invalid UUID }
 *       401: { description: Authentication required }
 *       403: { description: Admin/gerente role required }
 *       404: { description: API key not found }
 *       500: { description: Internal server error }
 */
router.delete('/:id', requireAdminAuth, async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return res.status(503).json({ error: 'Supabase não configurado.' });
  }

  const { id } = req.params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(400).json({ error: 'ID deve ser um UUID válido.' });
  }

  try {
    const { data, error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', id)
      .select('id')
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'API key não encontrada.' });
    }

    return res.json({ ok: true, id: data.id });
  } catch (err) {
    console.error('[apikeys] Unexpected error:', err);
    return res.status(500).json({ error: 'Erro interno ao revogar API key.' });
  }
});

module.exports = router;
