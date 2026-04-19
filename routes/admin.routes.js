'use strict';

const crypto = require('crypto');
const router = require('express').Router();
const { requireAdminAuth } = require('../middleware/requireAuth');
const { validateBody, createUserSchema, resetPasswordSchema } = require('../middleware/validate');
const { adminLimiter } = require('../middleware/rateLimiter');

// ── Admin: criar usuario via Supabase Auth Admin API ─────────────────────────
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
router.post('/create-user', adminLimiter, requireAdminAuth, validateBody(createUserSchema), async (req, res) => {
  const supabaseAdmin = req.app.locals.supabase;
  const { email, display_name, global_role } = req.validatedBody;

  // SEC-003: Prevent privilege escalation — only admins can create other admins
  if (global_role === 'admin' && req.callerProfile.global_role !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem criar outros administradores.' });
  }

  // SEC: H-08 — Use fixed temporary password (never returned in response).
  // User is forced to change on first login via must_change_password flag.
  const password = 'Mudar@123!Ts';

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

    // SEC: H-08 — Never return password in response. Admin informs user verbally or via secure channel.
    return res.json({ id: data.user.id, email: data.user.email, mustChangePassword: true });
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    return res.status(500).json({ error: 'Erro interno ao criar usuário.' });
  }
});

// ── Admin: resetar senha de usuario ──────────────────────────────────────────
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
router.post('/reset-password', adminLimiter, requireAdminAuth, validateBody(resetPasswordSchema), async (req, res) => {
  const supabaseAdmin = req.app.locals.supabase;
  const { user_id } = req.validatedBody;

  try {
    if (user_id === req.caller.id) {
      return res.status(403).json({ error: 'Não é permitido resetar a própria senha por este endpoint.' });
    }

    const { data: targetProfile, error: targetErr } = await supabaseAdmin.from('profiles').select('global_role').eq('id', user_id).single();
    if (targetErr || !targetProfile) {
      return res.status(404).json({ error: 'Usuário alvo não encontrado.' });
    }

    if (req.callerProfile.global_role === 'gerente' && targetProfile.global_role === 'admin') {
      return res.status(403).json({ error: 'Gerentes não podem resetar senhas de administradores.' });
    }

    // SEC: H-08 — Use fixed temporary password (never returned in response).
    const newPassword = 'Mudar@123!Ts';
    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: newPassword,
      user_metadata: { must_change_password: true },
    });
    if (error) {
      return res.status(400).json({ error: error.message });
    }
    // SEC: H-08 — Never return password in response.
    return res.json({ ok: true, mustChangePassword: true });
  } catch (err) {
    console.error('Erro ao resetar senha:', err);
    return res.status(500).json({ error: 'Erro interno ao resetar senha.' });
  }
});

module.exports = router;
