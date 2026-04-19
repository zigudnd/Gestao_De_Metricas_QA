'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireApiKey } = require('../../middleware/requireApiKey');
const { requireAdminAuth } = require('../../middleware/requireAuth');
const { success, paginated, error } = require('./helpers');

const router = Router();

// ── Constants ────────────────────────────────────────────────────────────────

const CHANGE_TYPES = ['feature', 'fix', 'refactor', 'hotfix'];
const REVIEW_STATUSES = ['pending', 'approved', 'rejected'];

// ── Validation Schemas ──────────────────────────────────────────────────────

const releaseIdParam = z.object({
  releaseId: z.string().uuid('releaseId deve ser UUID válido'),
});

const prIdParam = z.object({
  releaseId: z.string().uuid('releaseId deve ser UUID válido'),
  prId: z.string().uuid('prId deve ser UUID válido'),
});

// SEC: R2-H-01 — Only allow http/https protocols to prevent javascript: XSS
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const safeUrl = z.string().url('pr_link deve ser uma URL válida').refine(
  (u) => { try { return ALLOWED_PROTOCOLS.has(new URL(u).protocol); } catch { return false; } },
  { message: 'pr_link deve usar http:// ou https://' },
);

const createPrBody = z.object({
  pr_link: safeUrl,
  repository: z.string().min(1, 'repository é obrigatório'),
  description: z.string().optional(),
  change_type: z.enum(CHANGE_TYPES, { errorMap: () => ({ message: `change_type deve ser: ${CHANGE_TYPES.join(', ')}` }) }),
  squad_id: z.string().uuid('squad_id deve ser UUID válido').optional(),
});

const updatePrBody = z.object({
  pr_link: safeUrl.optional(),
  repository: z.string().min(1, 'repository é obrigatório').optional(),
  description: z.string().optional(),
  change_type: z.enum(CHANGE_TYPES, { errorMap: () => ({ message: `change_type deve ser: ${CHANGE_TYPES.join(', ')}` }) }).optional(),
});

const reviewPrBody = z.object({
  status: z.enum(['approved', 'rejected'], { errorMap: () => ({ message: 'status deve ser: approved ou rejected' }) }),
  review_observation: z.string().optional(),
}).refine(
  (data) => data.status !== 'rejected' || (data.review_observation && data.review_observation.trim().length > 0),
  { message: 'review_observation é obrigatória quando status é rejected', path: ['review_observation'] },
);

const listPrsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  squad_id: z.string().uuid('squad_id deve ser UUID válido').optional(),
  review_status: z.enum(REVIEW_STATUSES).optional(),
  change_type: z.enum(CHANGE_TYPES).optional(),
});

// ── Validation Middleware ────────────────────────────────────────────────────

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

function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return error(res, 400, 'VALIDATION_ERROR', result.error.issues.map(i => i.message).join('; '));
    }
    req.validatedBody = result.data;
    next();
  };
}

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

// ── Auth: accept API key OR admin Bearer token ──────────────────────────────

function requirePrWriteAccess(req, res, next) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer tok_')) {
    return requireApiKey('write:prs')(req, res, next);
  }
  return requireAdminAuth(req, res, next);
}

function requirePrReadAccess(req, res, next) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer tok_')) {
    return requireApiKey('read:prs')(req, res, next);
  }
  return requireAdminAuth(req, res, next);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function getSupabase(req, res) {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
    return null;
  }
  return supabase;
}

function getUserId(req) {
  // From admin auth
  if (req.caller) return req.caller.id;
  // From API key
  if (req.apiKey) return req.apiKey.user_id;
  return null;
}

async function findRelease(supabase, releaseId) {
  const { data, error: dbErr } = await supabase
    .from('releases')
    .select('id, status, cutoff_date')
    .eq('id', releaseId)
    .single();
  return { release: data, releaseError: dbErr };
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/releases/{releaseId}/prs:
 *   post:
 *     tags: [PRs]
 *     summary: Register a PR for a release
 *     description: |
 *       Creates a new PR entry linked to a release. Release must be in 'corte' status
 *       and the cutoff date must be >= today. Accepts admin Bearer token or API key with write:prs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: releaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Release UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pr_link, repository, change_type]
 *             properties:
 *               pr_link: { type: string, format: uri, description: URL of the PR }
 *               repository: { type: string, description: Repository name }
 *               description: { type: string, description: Optional description }
 *               change_type: { type: string, enum: [feature, fix, refactor, hotfix] }
 *               squad_id: { type: string, format: uuid, description: Optional squad UUID }
 *     responses:
 *       201:
 *         description: PR created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PR'
 *       400: { description: Validation error }
 *       401: { description: Missing or invalid credentials }
 *       403: { description: Insufficient permissions }
 *       409: { description: Release not in corte status or cutoff date passed }
 *       404: { description: Release not found }
 */
router.post(
  '/:releaseId/prs',
  requirePrWriteAccess,
  validateParams(releaseIdParam),
  validateBody(createPrBody),
  async (req, res) => {
    const supabase = getSupabase(req, res);
    if (!supabase) return;

    try {
      const { releaseId } = req.validatedParams;
      const { pr_link, repository, description, change_type, squad_id } = req.validatedBody;

      // Check release exists and is in corte status
      const { release, releaseError } = await findRelease(supabase, releaseId);
      if (releaseError || !release) {
        return error(res, 404, 'NOT_FOUND', `Release ${releaseId} não encontrada`);
      }

      if (release.status !== 'corte') {
        return error(res, 409, 'INVALID_STATUS', `Release deve estar em status 'corte'. Status atual: '${release.status}'`);
      }

      // Check cutoff date
      if (release.cutoff_date) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const cutoff = new Date(release.cutoff_date);
        cutoff.setHours(0, 0, 0, 0);
        if (cutoff < today) {
          return error(res, 409, 'CUTOFF_PASSED', 'A data de corte da release já passou');
        }
      }

      const userId = getUserId(req);

      const { data: pr, error: insertErr } = await supabase
        .from('release_prs')
        .insert({
          release_id: releaseId,
          pr_link,
          repository,
          description: description || null,
          change_type,
          squad_id: squad_id || null,
          user_id: userId,
          review_status: 'pending',
        })
        .select('*')
        .single();

      if (insertErr) {
        console.error('[prs] Insert error:', insertErr.message);
        return error(res, 500, 'INTERNAL_ERROR', 'Falha ao cadastrar PR');
      }

      return res.status(201).json({
        data: pr,
        meta: { requestId: req.requestId, timestamp: new Date().toISOString() },
      });
    } catch (err) {
      console.error('[prs] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Erro inesperado ao cadastrar PR');
    }
  },
);

/**
 * @openapi
 * /api/v1/releases/{releaseId}/prs:
 *   get:
 *     tags: [PRs]
 *     summary: List PRs for a release with filters
 *     description: |
 *       Returns a paginated list of PRs for a release, with optional filters.
 *       Includes user email and squad name via joins.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: releaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Release UUID
 *       - in: query
 *         name: squad_id
 *         schema: { type: string, format: uuid }
 *         description: Filter by squad
 *       - in: query
 *         name: review_status
 *         schema: { type: string, enum: [pending, approved, rejected] }
 *         description: Filter by review status
 *       - in: query
 *         name: change_type
 *         schema: { type: string, enum: [feature, fix, refactor, hotfix] }
 *         description: Filter by change type
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: per_page
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated list of PRs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PR'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     perPage: { type: integer }
 *       400: { description: Invalid query parameters }
 *       401: { description: Missing or invalid credentials }
 *       404: { description: Release not found }
 */
router.get(
  '/:releaseId/prs',
  requirePrReadAccess,
  validateParams(releaseIdParam),
  validateQuery(listPrsQuery),
  async (req, res) => {
    const supabase = getSupabase(req, res);
    if (!supabase) return;

    try {
      const { releaseId } = req.validatedParams;
      const { page, per_page, squad_id, review_status, change_type } = req.validatedQuery;
      const offset = (page - 1) * per_page;

      // Verify release exists
      const { release, releaseError } = await findRelease(supabase, releaseId);
      if (releaseError || !release) {
        return error(res, 404, 'NOT_FOUND', `Release ${releaseId} não encontrada`);
      }

      // Build count query
      let countQuery = supabase
        .from('release_prs')
        .select('id', { count: 'exact', head: true })
        .eq('release_id', releaseId);

      // Build data query with joins
      let dataQuery = supabase
        .from('release_prs')
        .select('*, profiles:user_id(email), squads:squad_id(name)')
        .eq('release_id', releaseId);

      // Apply filters
      if (squad_id) {
        countQuery = countQuery.eq('squad_id', squad_id);
        dataQuery = dataQuery.eq('squad_id', squad_id);
      }
      if (review_status) {
        countQuery = countQuery.eq('review_status', review_status);
        dataQuery = dataQuery.eq('review_status', review_status);
      }
      if (change_type) {
        countQuery = countQuery.eq('change_type', change_type);
        dataQuery = dataQuery.eq('change_type', change_type);
      }

      dataQuery = dataQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + per_page - 1);

      const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

      if (countResult.error) {
        console.error('[prs] Count error:', countResult.error.message);
        return error(res, 500, 'INTERNAL_ERROR', 'Falha ao contar PRs');
      }

      if (dataResult.error) {
        console.error('[prs] Select error:', dataResult.error.message);
        return error(res, 500, 'INTERNAL_ERROR', 'Falha ao listar PRs');
      }

      const entries = (dataResult.data || []).map(row => ({
        ...row,
        user_email: row.profiles?.email || null,
        squad_name: row.squads?.name || null,
        profiles: undefined,
        squads: undefined,
      }));

      return paginated(res, entries, countResult.count || 0, page, per_page);
    } catch (err) {
      console.error('[prs] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Erro inesperado ao listar PRs');
    }
  },
);

/**
 * @openapi
 * /api/v1/releases/{releaseId}/prs/{prId}:
 *   put:
 *     tags: [PRs]
 *     summary: Edit a PR
 *     description: |
 *       Updates an existing PR. If the PR was previously rejected,
 *       the review_status is automatically reset to 'pending'.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: releaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: prId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               pr_link: { type: string, format: uri }
 *               repository: { type: string }
 *               description: { type: string }
 *               change_type: { type: string, enum: [feature, fix, refactor, hotfix] }
 *     responses:
 *       200:
 *         description: Updated PR
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PR'
 *       400: { description: Validation error }
 *       401: { description: Missing or invalid credentials }
 *       403: { description: Insufficient permissions }
 *       404: { description: PR not found }
 */
router.put(
  '/:releaseId/prs/:prId',
  requireAdminAuth,
  validateParams(prIdParam),
  validateBody(updatePrBody),
  async (req, res) => {
    const supabase = getSupabase(req, res);
    if (!supabase) return;

    try {
      const { releaseId, prId } = req.validatedParams;
      const updates = req.validatedBody;

      // Fetch existing PR to check rejection status
      const { data: existingPr, error: fetchErr } = await supabase
        .from('release_prs')
        .select('review_status')
        .eq('id', prId)
        .eq('release_id', releaseId)
        .single();

      if (fetchErr || !existingPr) {
        return error(res, 404, 'NOT_FOUND', `PR ${prId} não encontrada na release ${releaseId}`);
      }

      // If PR was rejected, auto-reset to pending on edit
      if (existingPr.review_status === 'rejected') {
        updates.review_status = 'pending';
        updates.reviewed_by = null;
        updates.reviewed_at = null;
        updates.review_observation = null;
      }

      const { data: pr, error: updateErr } = await supabase
        .from('release_prs')
        .update(updates)
        .eq('id', prId)
        .eq('release_id', releaseId)
        .select('*')
        .single();

      if (updateErr) {
        console.error('[prs] Update error:', updateErr.message);
        return error(res, 500, 'INTERNAL_ERROR', 'Falha ao atualizar PR');
      }

      return success(res, pr);
    } catch (err) {
      console.error('[prs] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Erro inesperado ao atualizar PR');
    }
  },
);

/**
 * @openapi
 * /api/v1/releases/{releaseId}/prs/{prId}:
 *   delete:
 *     tags: [PRs]
 *     summary: Remove a PR
 *     description: Deletes a PR from a release.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: releaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: prId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: PR deleted }
 *       401: { description: Missing or invalid credentials }
 *       403: { description: Insufficient permissions }
 *       404: { description: PR not found }
 */
router.delete(
  '/:releaseId/prs/:prId',
  requireAdminAuth,
  validateParams(prIdParam),
  async (req, res) => {
    const supabase = getSupabase(req, res);
    if (!supabase) return;

    try {
      const { releaseId, prId } = req.validatedParams;

      const { data, error: deleteErr } = await supabase
        .from('release_prs')
        .delete()
        .eq('id', prId)
        .eq('release_id', releaseId)
        .select('id')
        .single();

      if (deleteErr || !data) {
        return error(res, 404, 'NOT_FOUND', `PR ${prId} não encontrada na release ${releaseId}`);
      }

      return res.status(204).send();
    } catch (err) {
      console.error('[prs] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Erro inesperado ao remover PR');
    }
  },
);

/**
 * @openapi
 * /api/v1/releases/{releaseId}/prs/{prId}/review:
 *   patch:
 *     tags: [PRs]
 *     summary: Approve or reject a PR
 *     description: |
 *       Sets the review status of a PR. Only admin/gerente (Foundation) can review.
 *       When rejecting, an observation is required.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: releaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: prId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [approved, rejected] }
 *               review_observation: { type: string, description: Required when status is rejected }
 *     responses:
 *       200:
 *         description: Reviewed PR
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/PR'
 *       400: { description: Validation error }
 *       401: { description: Missing or invalid credentials }
 *       403: { description: Insufficient permissions (Foundation only) }
 *       404: { description: PR not found }
 */
router.patch(
  '/:releaseId/prs/:prId/review',
  requireAdminAuth,
  validateParams(prIdParam),
  validateBody(reviewPrBody),
  async (req, res) => {
    const supabase = getSupabase(req, res);
    if (!supabase) return;

    try {
      const { releaseId, prId } = req.validatedParams;
      const { status, review_observation } = req.validatedBody;

      // Verify PR exists
      const { data: existingPr, error: fetchErr } = await supabase
        .from('release_prs')
        .select('id, user_id')
        .eq('id', prId)
        .eq('release_id', releaseId)
        .single();

      if (fetchErr || !existingPr) {
        return error(res, 404, 'NOT_FOUND', `PR ${prId} não encontrada na release ${releaseId}`);
      }

      // SEC: M-05 — Prevent self-review
      if (existingPr.user_id === req.caller.id) {
        return error(res, 403, 'SELF_REVIEW', 'Não é permitido revisar o próprio PR');
      }

      const reviewerId = req.caller.id;

      const { data: pr, error: updateErr } = await supabase
        .from('release_prs')
        .update({
          review_status: status,
          review_observation: review_observation || null,
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', prId)
        .eq('release_id', releaseId)
        .select('*')
        .single();

      if (updateErr) {
        console.error('[prs] Review update error:', updateErr.message);
        return error(res, 500, 'INTERNAL_ERROR', 'Falha ao revisar PR');
      }

      return success(res, pr);
    } catch (err) {
      console.error('[prs] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Erro inesperado ao revisar PR');
    }
  },
);

/**
 * @openapi
 * /api/v1/releases/{releaseId}/squads-summary:
 *   get:
 *     tags: [PRs]
 *     summary: Squad summary for a release
 *     description: |
 *       Returns an aggregated summary of PRs per squad for a release,
 *       including counts by review status and a has_tests flag.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: releaseId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Array of squad summaries
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
 *                       squad_id: { type: string, format: uuid }
 *                       squad_name: { type: string }
 *                       total_prs: { type: integer }
 *                       approved: { type: integer }
 *                       pending: { type: integer }
 *                       rejected: { type: integer }
 *                       has_tests: { type: boolean }
 *       401: { description: Missing or invalid credentials }
 *       403: { description: Insufficient permissions }
 *       404: { description: Release not found }
 */
router.get(
  '/:releaseId/squads-summary',
  requireAdminAuth,
  validateParams(releaseIdParam),
  async (req, res) => {
    const supabase = getSupabase(req, res);
    if (!supabase) return;

    try {
      const { releaseId } = req.validatedParams;

      // Verify release exists
      const { release, releaseError } = await findRelease(supabase, releaseId);
      if (releaseError || !release) {
        return error(res, 404, 'NOT_FOUND', `Release ${releaseId} não encontrada`);
      }

      // Fetch all PRs for this release with squad info
      const { data: prs, error: fetchErr } = await supabase
        .from('release_prs')
        .select('squad_id, review_status, change_type, squads:squad_id(name)')
        .eq('release_id', releaseId);

      if (fetchErr) {
        console.error('[prs] Squads summary error:', fetchErr.message);
        return error(res, 500, 'INTERNAL_ERROR', 'Falha ao gerar resumo de squads');
      }

      // Aggregate by squad
      const squadsMap = new Map();

      for (const pr of (prs || [])) {
        const sid = pr.squad_id || '__no_squad__';
        if (!squadsMap.has(sid)) {
          squadsMap.set(sid, {
            squad_id: pr.squad_id || null,
            squad_name: pr.squads?.name || 'Sem squad',
            total_prs: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            has_tests: false,
          });
        }

        const entry = squadsMap.get(sid);
        entry.total_prs++;

        if (pr.review_status === 'approved') entry.approved++;
        else if (pr.review_status === 'rejected') entry.rejected++;
        else entry.pending++;

        // has_tests: check if change_type indicates testing (feature/bugfix/hotfix have tests)
        if (['feature', 'fix', 'hotfix'].includes(pr.change_type)) {
          entry.has_tests = true;
        }
      }

      const summaries = Array.from(squadsMap.values()).sort((a, b) => b.total_prs - a.total_prs);

      return success(res, summaries);
    } catch (err) {
      console.error('[prs] Unexpected error:', err);
      return error(res, 500, 'INTERNAL_ERROR', 'Erro inesperado ao gerar resumo de squads');
    }
  },
);

/**
 * @openapi
 * components:
 *   schemas:
 *     PR:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         release_id: { type: string, format: uuid }
 *         pr_link: { type: string, format: uri }
 *         repository: { type: string }
 *         description: { type: string, nullable: true }
 *         change_type: { type: string, enum: [feature, fix, refactor, hotfix] }
 *         squad_id: { type: string, format: uuid, nullable: true }
 *         user_id: { type: string, format: uuid }
 *         review_status: { type: string, enum: [pending, approved, rejected] }
 *         reviewed_by: { type: string, format: uuid, nullable: true }
 *         reviewed_at: { type: string, format: date-time, nullable: true }
 *         review_observation: { type: string, nullable: true }
 *         created_at: { type: string, format: date-time }
 *         updated_at: { type: string, format: date-time }
 */

module.exports = router;
