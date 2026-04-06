'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireApiKey } = require('../../middleware/requireApiKey');
const { success, paginated, error } = require('./helpers');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────────

const listSprintsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['ativa', 'concluida']).optional(),
  squadId: z.string().uuid('squadId deve ser UUID válido').optional(),
});

const sprintIdParam = z.object({
  id: z.string().uuid('id deve ser UUID válido'),
});

// ── Middleware: validate query ──────────────────────────────────────────────

function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return error(res, 400, 'VALIDATION_ERROR', result.error.issues.map(i => i.message).join('; '));
    }
    req.validatedQuery = result.data;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return error(res, 400, 'VALIDATION_ERROR', result.error.issues.map(i => i.message).join('; '));
    }
    req.validatedParams = result.data;
    next();
  };
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/sprints:
 *   get:
 *     tags: [Sprints]
 *     summary: List sprints with pagination
 *     description: Returns paginated list of sprint index entries. Supports filtering by status and squadId.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: Page number
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ativa, concluida] }
 *         description: Filter by sprint status
 *       - in: query
 *         name: squadId
 *         schema: { type: string, format: uuid }
 *         description: Filter by squad UUID
 *     responses:
 *       200:
 *         description: Paginated list of sprints
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
 *                       title: { type: string }
 *                       squad: { type: string }
 *                       squadId: { type: string, format: uuid, nullable: true }
 *                       startDate: { type: string }
 *                       endDate: { type: string }
 *                       totalTests: { type: integer }
 *                       totalExec: { type: integer }
 *                       updatedAt: { type: string, format: date-time }
 *                       status: { type: string, enum: [ativa, concluida] }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     perPage: { type: integer }
 *                     requestId: { type: string }
 *                     timestamp: { type: string, format: date-time }
 *       400: { description: Invalid query parameters }
 *       401: { description: Missing or invalid API key }
 *       403: { description: Insufficient permissions }
 */
router.get('/', requireApiKey('sprints:read'), validateQuery(listSprintsQuery), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
  }

  try {
    const { page, perPage, status, squadId } = req.validatedQuery;
    const offset = (page - 1) * perPage;

    // Build query for count
    let countQuery = supabase.from('sprints').select('id', { count: 'exact', head: true });
    let dataQuery = supabase.from('sprints').select('id, title, squad, squad_id, start_date, end_date, total_tests, total_exec, updated_at, status');

    if (status) {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    if (squadId) {
      countQuery = countQuery.eq('squad_id', squadId);
      dataQuery = dataQuery.eq('squad_id', squadId);
    }

    dataQuery = dataQuery
      .order('updated_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      console.error('[sprints] Count error:', countResult.error.message);
      return error(res, 500, 'INTERNAL_ERROR', 'Failed to count sprints');
    }

    if (dataResult.error) {
      console.error('[sprints] Select error:', dataResult.error.message);
      return error(res, 500, 'INTERNAL_ERROR', 'Failed to list sprints');
    }

    const entries = (dataResult.data || []).map(row => ({
      id: row.id,
      title: row.title,
      squad: row.squad,
      squadId: row.squad_id || null,
      startDate: row.start_date,
      endDate: row.end_date,
      totalTests: row.total_tests,
      totalExec: row.total_exec,
      updatedAt: row.updated_at,
      status: row.status || 'ativa',
    }));

    return paginated(res, entries, countResult.count || 0, page, perPage);
  } catch (err) {
    console.error('[sprints] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error listing sprints');
  }
});

/**
 * @openapi
 * /api/v1/sprints/{id}:
 *   get:
 *     tags: [Sprints]
 *     summary: Get full sprint state
 *     description: Returns the complete SprintState JSONB data for a given sprint.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Sprint UUID
 *     responses:
 *       200:
 *         description: Full sprint state
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: SprintState JSONB object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId: { type: string }
 *                     timestamp: { type: string, format: date-time }
 *       400: { description: Invalid UUID }
 *       401: { description: Missing or invalid API key }
 *       404: { description: Sprint not found }
 */
router.get('/:id', requireApiKey('sprints:read'), validateParams(sprintIdParam), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
  }

  try {
    const { id } = req.validatedParams;

    const { data: sprint, error: dbError } = await supabase
      .from('sprints')
      .select('data')
      .eq('id', id)
      .single();

    if (dbError || !sprint) {
      return error(res, 404, 'NOT_FOUND', `Sprint ${id} not found`);
    }

    return success(res, sprint.data);
  } catch (err) {
    console.error('[sprints] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error fetching sprint');
  }
});

/**
 * @openapi
 * /api/v1/sprints/{id}/metrics:
 *   get:
 *     tags: [Sprints]
 *     summary: Get computed sprint KPIs
 *     description: |
 *       Reads sprint JSONB data and computes key performance indicators:
 *       healthScore, totalTests, totalExec, execPercent, openBugs, mttr, retestIndex, blockedHours.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Sprint UUID
 *     responses:
 *       200:
 *         description: Computed KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     healthScore: { type: number, description: "0-100 health score" }
 *                     totalTests: { type: integer }
 *                     totalExec: { type: integer }
 *                     execPercent: { type: number }
 *                     openBugs: { type: integer }
 *                     mttr: { type: number, description: "Mean time to resolution in hours" }
 *                     retestIndex: { type: number, description: "Average retests per resolved bug" }
 *                     blockedHours: { type: number }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId: { type: string }
 *                     timestamp: { type: string, format: date-time }
 *       400: { description: Invalid UUID }
 *       401: { description: Missing or invalid API key }
 *       404: { description: Sprint not found }
 */
router.get('/:id/metrics', requireApiKey('sprints:read'), validateParams(sprintIdParam), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
  }

  try {
    const { id } = req.validatedParams;

    const { data: sprint, error: dbError } = await supabase
      .from('sprints')
      .select('data')
      .eq('id', id)
      .single();

    if (dbError || !sprint) {
      return error(res, 404, 'NOT_FOUND', `Sprint ${id} not found`);
    }

    const state = sprint.data || {};
    const metrics = computeMetrics(state);
    return success(res, metrics);
  } catch (err) {
    console.error('[sprints] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error computing metrics');
  }
});

/**
 * @openapi
 * /api/v1/sprints/{id}/bugs:
 *   get:
 *     tags: [Sprints]
 *     summary: List sprint bugs
 *     description: Extracts the bugs array from the sprint JSONB data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Sprint UUID
 *     responses:
 *       200:
 *         description: List of bugs
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
 *                       id: { type: string }
 *                       desc: { type: string }
 *                       feature: { type: string }
 *                       stack: { type: string }
 *                       severity: { type: string, enum: [Critica, Alta, Media, Baixa] }
 *                       assignee: { type: string }
 *                       status: { type: string, enum: [Aberto, Em Andamento, Falhou, Resolvido] }
 *                       retests: { type: integer }
 *                       openedAt: { type: string, format: date-time, nullable: true }
 *                       resolvedAt: { type: string, format: date-time, nullable: true }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId: { type: string }
 *                     timestamp: { type: string, format: date-time }
 *       400: { description: Invalid UUID }
 *       401: { description: Missing or invalid API key }
 *       404: { description: Sprint not found }
 */
router.get('/:id/bugs', requireApiKey('sprints:read'), validateParams(sprintIdParam), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
  }

  try {
    const { id } = req.validatedParams;

    const { data: sprint, error: dbError } = await supabase
      .from('sprints')
      .select('data')
      .eq('id', id)
      .single();

    if (dbError || !sprint) {
      return error(res, 404, 'NOT_FOUND', `Sprint ${id} not found`);
    }

    const state = sprint.data || {};
    const bugs = Array.isArray(state.bugs) ? state.bugs : [];
    return success(res, bugs);
  } catch (err) {
    console.error('[sprints] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error fetching bugs');
  }
});

// ── Metrics computation ─────────────────────────────────────────────────────

/**
 * Computes KPIs from a SprintState JSONB object.
 * @param {object} state - SprintState
 * @returns {object} Computed metrics
 */
function computeMetrics(state) {
  const features = Array.isArray(state.features) ? state.features : [];
  const bugs = Array.isArray(state.bugs) ? state.bugs : [];
  const blockers = Array.isArray(state.blockers) ? state.blockers : [];
  const config = state.config || {};

  // Total tests and execution
  const totalTests = features.reduce((sum, f) => sum + (f.tests || 0), 0);
  const totalExec = features.reduce((sum, f) => sum + (f.exec || 0), 0);
  const execPercent = totalTests > 0 ? Math.round((totalExec / totalTests) * 10000) / 100 : 0;

  // Open bugs
  const openBugs = bugs.filter(b => b.status !== 'Resolvido').length;

  // Blocked hours
  const blockedHours = blockers.reduce((sum, b) => sum + (b.hours || 0), 0);

  // MTTR (mean time to resolution) in hours for resolved bugs
  const resolvedBugs = bugs.filter(b => b.status === 'Resolvido' && b.openedAt && b.resolvedAt);
  let mttr = 0;
  if (resolvedBugs.length > 0) {
    const totalHours = resolvedBugs.reduce((sum, b) => {
      const opened = new Date(b.openedAt).getTime();
      const resolved = new Date(b.resolvedAt).getTime();
      return sum + Math.max(0, resolved - opened) / (1000 * 60 * 60);
    }, 0);
    mttr = Math.round((totalHours / resolvedBugs.length) * 100) / 100;
  }

  // Retest index: average retests per resolved bug
  const resolvedBugsAll = bugs.filter(b => b.status === 'Resolvido');
  let retestIndex = 0;
  if (resolvedBugsAll.length > 0) {
    retestIndex = Math.round(
      (resolvedBugsAll.reduce((sum, b) => sum + (b.retests || 0), 0) / resolvedBugsAll.length) * 100
    ) / 100;
  }

  // Health Score (100 - penalties)
  const wCritical = config.hsCritical || 10;
  const wHigh = config.hsHigh || 5;
  const wMedium = config.hsMedium || 2;
  const wLow = config.hsLow || 1;
  const wRetest = config.hsRetest || 3;
  const wBlocked = config.hsBlocked || 5;
  const wDelayed = config.hsDelayed || 10;

  let penalty = 0;
  for (const b of bugs) {
    if (b.status === 'Resolvido') continue;
    if (b.severity === 'Cr\u00edtica') penalty += wCritical;
    else if (b.severity === 'Alta') penalty += wHigh;
    else if (b.severity === 'M\u00e9dia') penalty += wMedium;
    else penalty += wLow;

    if (b.retests > 0) penalty += wRetest;
  }

  // Blocked features penalty
  const blockedFeatures = features.filter(f => f.status === 'Bloqueada').length;
  penalty += blockedFeatures * wBlocked;

  // Delayed penalty (exec < 50% of tests is considered delayed)
  if (totalTests > 0 && execPercent < 50) {
    penalty += wDelayed;
  }

  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  return {
    healthScore,
    totalTests,
    totalExec,
    execPercent,
    openBugs,
    mttr,
    retestIndex,
    blockedHours,
  };
}

// Export for testing
router._computeMetrics = computeMetrics;

module.exports = router;
