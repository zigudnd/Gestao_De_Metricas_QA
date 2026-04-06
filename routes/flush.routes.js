'use strict';

const express = require('express');
const router = require('express').Router();
const { flushLimiter } = require('../middleware/rateLimiter');

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
router.post('/status-report-flush', flushLimiter, express.text({ type: '*/*', limit: '10kb' }), async (req, res) => {
  const supabaseAdmin = req.app.locals.supabase;
  if (!supabaseAdmin) return res.status(503).json({ error: 'Supabase não configurado.' });
  try {
    const payload = JSON.parse(req.body);
    if (!payload.id || typeof payload.id !== 'string' || payload.id.length > 100) {
      return res.status(400).json({ error: 'ID inválido.' });
    }
    if (!payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
      return res.status(400).json({ error: 'Data inválido.' });
    }
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
router.post('/release-flush', flushLimiter, express.text({ type: '*/*', limit: '10kb' }), async (req, res) => {
  const supabaseAdmin = req.app.locals.supabase;
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
router.post('/sprint-flush', flushLimiter, express.text({ type: '*/*', limit: '10kb' }), async (req, res) => {
  const supabaseAdmin = req.app.locals.supabase;
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

module.exports = router;
