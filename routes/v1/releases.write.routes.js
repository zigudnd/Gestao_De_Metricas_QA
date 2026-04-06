'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireApiKey } = require('../../middleware/requireApiKey');
const { validateBody } = require('../../middleware/validate');
const { success, error } = require('./helpers');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────────

const RELEASE_STATUSES = [
  'planejada',
  'em_desenvolvimento',
  'em_qa',
  'aguardando_aprovacao',
  'aprovada',
  'em_producao',
  'concluida',
  'rollback',
  'cancelada',
];

const updateStatusSchema = z.object({
  status: z.enum(RELEASE_STATUSES),
  reason: z.string().optional().default(''),
});

const updateRolloutSchema = z.object({
  rolloutPct: z.number().int().min(0).max(100),
});

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/releases/{id}/status:
 *   patch:
 *     tags: [Releases]
 *     summary: Update release status
 *     description: |
 *       Updates the status of a release, appending to status history.
 *       Cannot update a concluded release.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Release ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [planejada, em_desenvolvimento, em_qa, aguardando_aprovacao, aprovada, em_producao, concluida, rollback, cancelada]
 *               reason:
 *                 type: string
 *                 default: ""
 *     responses:
 *       200:
 *         description: Status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     status: { type: string }
 *                     previousStatus: { type: string }
 *                 meta: { type: object }
 *       400: { description: Invalid body }
 *       401: { description: Authentication required }
 *       403: { description: Missing permission }
 *       404: { description: Release not found }
 *       409: { description: Release concluded }
 *       500: { description: Internal server error }
 */
router.patch(
  '/releases/:id/status',
  requireApiKey('releases:write'),
  validateBody(updateStatusSchema),
  async (req, res) => {
    const supabase = req.app.locals.supabase;
    if (!supabase) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');

    const { id } = req.params;

    try {
      const { data: release, error: readError } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .single();

      if (readError || !release) {
        return error(res, 404, 'NOT_FOUND', 'Release not found');
      }

      const releaseData = release.data || {};
      const previousStatus = releaseData.status || release.status || 'planejada';

      if (previousStatus === 'concluida') {
        return error(res, 409, 'RELEASE_CONCLUDED', 'Cannot update a concluded release');
      }

      const { status: newStatus, reason } = req.validatedBody;

      // Append to statusHistory
      const statusHistory = Array.isArray(releaseData.statusHistory) ? [...releaseData.statusHistory] : [];
      statusHistory.push({
        from: previousStatus,
        to: newStatus,
        timestamp: new Date().toISOString(),
        reason,
      });

      const updatedData = { ...releaseData, status: newStatus, statusHistory };

      const { error: updateError } = await supabase
        .from('releases')
        .update({ data: updatedData, status: newStatus })
        .eq('id', id);

      if (updateError) {
        console.error('[releases] Update error:', updateError.message);
        return error(res, 500, 'DB_ERROR', 'Failed to update release status');
      }

      return success(res, { id, status: newStatus, previousStatus });
    } catch (err) {
      console.error('[releases] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Internal server error');
    }
  },
);

/**
 * @openapi
 * /api/v1/releases/{id}/rollout:
 *   patch:
 *     tags: [Releases]
 *     summary: Update release rollout percentage
 *     description: |
 *       Updates the rollout percentage of a release.
 *       The release must be in 'em_producao' status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Release ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rolloutPct]
 *             properties:
 *               rolloutPct:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *     responses:
 *       200:
 *         description: Rollout percentage updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     rolloutPct: { type: integer }
 *                 meta: { type: object }
 *       400: { description: Invalid body }
 *       401: { description: Authentication required }
 *       403: { description: Missing permission }
 *       409: { description: Release not in production }
 *       500: { description: Internal server error }
 */
router.patch(
  '/releases/:id/rollout',
  requireApiKey('releases:write'),
  validateBody(updateRolloutSchema),
  async (req, res) => {
    const supabase = req.app.locals.supabase;
    if (!supabase) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');

    const { id } = req.params;

    try {
      const { data: release, error: readError } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .single();

      if (readError || !release) {
        return error(res, 404, 'NOT_FOUND', 'Release not found');
      }

      const releaseData = release.data || {};
      const currentStatus = releaseData.status || release.status || 'planejada';

      if (currentStatus !== 'em_producao') {
        return error(res, 409, 'NOT_IN_PRODUCTION', 'Rollout can only be updated when release is em_producao');
      }

      const { rolloutPct } = req.validatedBody;
      const updatedData = { ...releaseData, rolloutPct };

      const { error: updateError } = await supabase
        .from('releases')
        .update({ data: updatedData })
        .eq('id', id);

      if (updateError) {
        console.error('[releases] Update error:', updateError.message);
        return error(res, 500, 'DB_ERROR', 'Failed to update rollout');
      }

      return success(res, { id, rolloutPct });
    } catch (err) {
      console.error('[releases] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Internal server error');
    }
  },
);

module.exports = router;
