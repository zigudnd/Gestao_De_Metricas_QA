'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireApiKey } = require('../../middleware/requireApiKey');
const { enforceSquadScope } = require('../../middleware/enforceSquadScope');
const { success, paginated, error, RELEASE_STATUSES } = require('./helpers');

const router = Router();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(RELEASE_STATUSES).optional(),
});

const uuidParamSchema = z.string().uuid('ID must be a valid UUID');

// ── Metrics computation (mirrors releaseMetrics.ts) ─────────────────────────

function computeTotals(squad) {
  let totalTests = 0;
  let executedTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let blockedTests = 0;

  for (const f of (squad.features || [])) {
    const cases = f.cases || [];
    totalTests += Math.max(f.tests || 0, cases.length);
    for (const c of cases) {
      if (c.status === 'Concluído') { executedTests++; passedTests++; }
      else if (c.status === 'Falhou') { executedTests++; failedTests++; }
      else if (c.status === 'Bloqueado') { blockedTests++; }
    }
  }

  const bugs = squad.bugs || [];
  const openBugs = bugs.filter(b => b.status === 'Aberto' || b.status === 'Em Andamento').length;
  const resolvedBugs = bugs.filter(b => b.status === 'Resolvido').length;
  const blockers = (squad.blockers || []).length;

  return { totalTests, executedTests, passedTests, failedTests, blockedTests, openBugs, resolvedBugs, blockers };
}

function computeReleaseMetrics(release) {
  const squads = release.squads || [];

  let totalTests = 0;
  let executedTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let blockedTests = 0;
  let openBugs = 0;
  let resolvedBugs = 0;
  let blockers = 0;

  for (const squad of squads) {
    const t = computeTotals(squad);
    totalTests += t.totalTests;
    executedTests += t.executedTests;
    passedTests += t.passedTests;
    failedTests += t.failedTests;
    blockedTests += t.blockedTests;
    openBugs += t.openBugs;
    resolvedBugs += t.resolvedBugs;
    blockers += t.blockers;
  }

  const coveragePct = totalTests > 0 ? Math.round((executedTests / totalTests) * 100) : 0;
  const passPct = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  return {
    totalSquads: squads.length,
    totalTests,
    executedTests,
    passedTests,
    failedTests,
    blockedTests,
    openBugs,
    resolvedBugs,
    blockers,
    coveragePct,
    passPct,
  };
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/releases:
 *   get:
 *     tags: [Releases]
 *     summary: List releases with pagination
 *     description: |
 *       Returns a paginated list of releases. Optionally filter by status.
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
 *         schema:
 *           type: string
 *           enum: [planejada, em_desenvolvimento, corte, em_homologacao, em_regressivo, em_qa, aguardando_aprovacao, aprovada, em_producao, concluida, uniu_escopo, rollback, cancelada]
 *         description: Filter by release status
 *     responses:
 *       200:
 *         description: Paginated list of releases
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
 *                       version: { type: string }
 *                       title: { type: string }
 *                       status: { type: string }
 *                       productionDate: { type: string }
 *                       squadCount: { type: integer }
 *                       updatedAt: { type: string, format: date-time }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     perPage: { type: integer }
 *       400: { description: Invalid query parameters }
 *       401: { description: API key required }
 *       403: { description: Insufficient permissions }
 *       503: { description: Database not configured }
 */
router.get('/', requireApiKey('releases:read'), async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return error(res, 400, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
    }

    const { page, perPage, status } = parsed.data;
    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
    }

    // Count query
    let countQuery = supabase.from('releases').select('*', { count: 'exact', head: true });
    if (status) countQuery = countQuery.eq('status', status);

    const { count, error: countErr } = await countQuery;
    if (countErr) {
      console.error('[releases] Count error:', countErr.message);
      return error(res, 500, 'DB_ERROR', 'Failed to count releases');
    }

    // Data query
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    let dataQuery = supabase
      .from('releases')
      .select('id, version, title, status, production_date, squad_count, updated_at')
      .order('updated_at', { ascending: false })
      .range(from, to);

    if (status) dataQuery = dataQuery.eq('status', status);

    const { data: rows, error: dataErr } = await dataQuery;
    if (dataErr) {
      console.error('[releases] Select error:', dataErr.message);
      return error(res, 500, 'DB_ERROR', 'Failed to list releases');
    }

    const mapped = (rows || []).map(r => ({
      id: r.id,
      version: r.version,
      title: r.title,
      status: r.status,
      productionDate: r.production_date,
      squadCount: r.squad_count,
      updatedAt: r.updated_at,
    }));

    return paginated(res, mapped, count || 0, page, perPage);
  } catch (err) {
    console.error('[releases] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error listing releases');
  }
});

/**
 * @openapi
 * /api/v1/releases/{id}:
 *   get:
 *     tags: [Releases]
 *     summary: Get full release by ID
 *     description: Returns the full release object including JSONB data.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Release UUID
 *     responses:
 *       200:
 *         description: Full release data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   description: Full Release object
 *                 meta:
 *                   type: object
 *       400: { description: Invalid UUID }
 *       401: { description: API key required }
 *       403: { description: Insufficient permissions }
 *       404: { description: Release not found }
 *       503: { description: Database not configured }
 */
router.get('/:id', requireApiKey('releases:read'), enforceSquadScope('releases'), async (req, res, next) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return error(res, 400, 'VALIDATION_ERROR', 'ID must be a valid UUID');
    }

    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
    }

    const { data: row, error: dbErr } = await supabase
      .from('releases')
      .select('data')
      .eq('id', req.params.id)
      .single();

    if (dbErr || !row) {
      return error(res, 404, 'NOT_FOUND', 'Release not found');
    }

    return success(res, row.data);
  } catch (err) {
    console.error('[releases] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error fetching release');
  }
});

/**
 * @openapi
 * /api/v1/releases/{id}/metrics:
 *   get:
 *     tags: [Releases]
 *     summary: Get computed metrics for a release
 *     description: |
 *       Computes and returns aggregated metrics from the release JSONB data:
 *       total squads, tests, bugs, coverage percentage, pass percentage, etc.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Release UUID
 *     responses:
 *       200:
 *         description: Computed release metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSquads: { type: integer }
 *                     totalTests: { type: integer }
 *                     executedTests: { type: integer }
 *                     passedTests: { type: integer }
 *                     failedTests: { type: integer }
 *                     blockedTests: { type: integer }
 *                     openBugs: { type: integer }
 *                     resolvedBugs: { type: integer }
 *                     blockers: { type: integer }
 *                     coveragePct: { type: number }
 *                     passPct: { type: number }
 *                 meta:
 *                   type: object
 *       400: { description: Invalid UUID }
 *       401: { description: API key required }
 *       403: { description: Insufficient permissions }
 *       404: { description: Release not found }
 *       503: { description: Database not configured }
 */
router.get('/:id/metrics', requireApiKey('releases:read'), enforceSquadScope('releases'), async (req, res, next) => {
  try {
    const idResult = uuidParamSchema.safeParse(req.params.id);
    if (!idResult.success) {
      return error(res, 400, 'VALIDATION_ERROR', 'ID must be a valid UUID');
    }

    const supabase = req.app.locals.supabase;
    if (!supabase) {
      return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
    }

    const { data: row, error: dbErr } = await supabase
      .from('releases')
      .select('data')
      .eq('id', req.params.id)
      .single();

    if (dbErr || !row) {
      return error(res, 404, 'NOT_FOUND', 'Release not found');
    }

    const metrics = computeReleaseMetrics(row.data || {});
    return success(res, metrics);
  } catch (err) {
    console.error('[releases] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error computing metrics');
  }
});

// Export for testing
router._computeReleaseMetrics = computeReleaseMetrics;

module.exports = router;
