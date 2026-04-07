'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireApiKey } = require('../../middleware/requireApiKey');
const { validateBody } = require('../../middleware/validate');
const { success, error } = require('./helpers');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────────

const createBugSchema = z.object({
  desc: z.string().min(1).max(500),
  feature: z.string().optional().default(''),
  stack: z.enum(['Front', 'BFF', 'Back', 'Mobile', 'Infra']),
  severity: z.enum(['Crítica', 'Alta', 'Média', 'Baixa']),
  assignee: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/sprints/{id}/bugs:
 *   post:
 *     tags: [Sprints]
 *     summary: Create a bug in a sprint
 *     description: |
 *       Appends a new bug to the sprint's JSONB `data.bugs[]` array.
 *       The sprint must not be in 'concluida' status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Sprint ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [desc, stack, severity]
 *             properties:
 *               desc:
 *                 type: string
 *                 maxLength: 500
 *               feature:
 *                 type: string
 *                 default: ""
 *               stack:
 *                 type: string
 *                 enum: [Front, BFF, Back, Mobile, Infra]
 *               severity:
 *                 type: string
 *                 enum: [Crítica, Alta, Média, Baixa]
 *               assignee:
 *                 type: string
 *                 default: ""
 *               notes:
 *                 type: string
 *                 default: ""
 *     responses:
 *       201:
 *         description: Bug created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     desc: { type: string }
 *                     stack: { type: string }
 *                     severity: { type: string }
 *                     status: { type: string, example: "Aberto" }
 *                     retests: { type: integer, example: 0 }
 *                     openedAt: { type: string }
 *                 meta: { type: object }
 *       400: { description: Invalid body }
 *       401: { description: Authentication required }
 *       403: { description: Missing permission }
 *       404: { description: Sprint not found }
 *       409: { description: Sprint concluded }
 *       500: { description: Internal server error }
 */
router.post(
  '/sprints/:id/bugs',
  requireApiKey('bugs:write'),
  validateBody(createBugSchema),
  async (req, res) => {
    const supabase = req.app.locals.supabase;
    if (!supabase) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');

    const { id } = req.params;

    try {
      // Read sprint
      const { data: sprint, error: readError } = await supabase
        .from('sprints')
        .select('*')
        .eq('id', id)
        .single();

      if (readError || !sprint) {
        return error(res, 404, 'NOT_FOUND', 'Sprint not found');
      }

      // Check sprint status
      const sprintData = sprint.data || {};
      if (sprintData.status === 'concluida' || sprint.status === 'concluida') {
        return error(res, 409, 'SPRINT_CONCLUDED', 'Cannot add bugs to a concluded sprint');
      }

      // Build bug object
      const today = new Date().toISOString().slice(0, 10);
      const bug = {
        id: 'bug_api_' + crypto.randomUUID(),
        ...req.validatedBody,
        status: 'Aberto',
        retests: 0,
        openedAt: today,
      };

      // Append to data.bugs[]
      const bugs = Array.isArray(sprintData.bugs) ? [...sprintData.bugs, bug] : [bug];
      const updatedData = { ...sprintData, bugs };

      // Upsert back
      const { error: updateError } = await supabase
        .from('sprints')
        .update({ data: updatedData })
        .eq('id', id);

      if (updateError) {
        console.error('[sprints] Update error:', updateError.message);
        return error(res, 500, 'DB_ERROR', 'Failed to save bug');
      }

      return res.status(201).json({
        data: bug,
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      console.error('[sprints] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Internal server error');
    }
  },
);

module.exports = router;
