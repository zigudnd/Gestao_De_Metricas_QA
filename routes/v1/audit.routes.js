'use strict';

const { Router } = require('express');
const { z } = require('zod');
const { requireApiKey } = require('../../middleware/requireApiKey');
const { requireAdminAuth } = require('../../middleware/requireAuth');
const { paginated, error } = require('./helpers');

const router = Router();

// ── Validation Schemas ──────────────────────────────────────────────────────

const listAuditLogsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(50),
  resourceType: z.enum(['sprint', 'status_report', 'release', 'squad']).optional(),
  action: z.enum(['create', 'update', 'delete']).optional(),
  userId: z.string().uuid('userId deve ser UUID válido').optional(),
  from: z.string().datetime({ offset: true, message: 'from deve ser ISO date' }).optional(),
  to: z.string().datetime({ offset: true, message: 'to deve ser ISO date' }).optional(),
  search: z.string().min(1).max(255).optional(),
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

// ── Auth: accept API key OR admin Bearer token ──────────────────────────────

function requireAuditAccess(req, res, next) {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer tok_')) {
    return requireApiKey('audit:read')(req, res, next);
  }
  return requireAdminAuth(req, res, next);
}

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: List audit logs with pagination and filters
 *     description: |
 *       Returns a paginated list of audit log entries.
 *       Supports filtering by resource type, action, user, date range, and email search.
 *       Accepts either an API key with `audit:read` permission or an admin Bearer token.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *         description: Page number
 *       - in: query
 *         name: perPage
 *         schema: { type: integer, default: 50, minimum: 1, maximum: 100 }
 *         description: Items per page
 *       - in: query
 *         name: resourceType
 *         schema: { type: string, enum: [sprint, status_report, release, squad] }
 *         description: Filter by resource type
 *       - in: query
 *         name: action
 *         schema: { type: string, enum: [create, update, delete] }
 *         description: Filter by action
 *       - in: query
 *         name: userId
 *         schema: { type: string, format: uuid }
 *         description: Filter by user UUID
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date-time }
 *         description: Filter logs created at or after this ISO date
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date-time }
 *         description: Filter logs created at or before this ISO date
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by user email (partial match)
 *     responses:
 *       200:
 *         description: Paginated list of audit log entries
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
 *                       userId: { type: string, format: uuid, nullable: true }
 *                       userEmail: { type: string, nullable: true }
 *                       resourceType: { type: string }
 *                       resourceId: { type: string }
 *                       action: { type: string, enum: [create, update, delete] }
 *                       changes: { type: object }
 *                       createdAt: { type: string, format: date-time }
 *                 meta:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     page: { type: integer }
 *                     perPage: { type: integer }
 *                     requestId: { type: string }
 *                     timestamp: { type: string, format: date-time }
 *       400: { description: Invalid query parameters }
 *       401: { description: Missing or invalid credentials }
 *       403: { description: Insufficient permissions }
 *       503: { description: Database not configured }
 */
router.get('/', requireAuditAccess, validateQuery(listAuditLogsQuery), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) {
    return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');
  }

  try {
    const { page, perPage, resourceType, action, userId, from, to, search } = req.validatedQuery;
    const offset = (page - 1) * perPage;

    // Build count query
    let countQuery = supabase.from('audit_logs').select('*', { count: 'exact', head: true });
    // Build data query
    let dataQuery = supabase.from('audit_logs').select('id, user_id, user_email, resource_type, resource_id, action, changes, created_at');

    // Apply filters to both queries
    if (resourceType) {
      countQuery = countQuery.eq('resource_type', resourceType);
      dataQuery = dataQuery.eq('resource_type', resourceType);
    }

    if (action) {
      countQuery = countQuery.eq('action', action);
      dataQuery = dataQuery.eq('action', action);
    }

    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
      dataQuery = dataQuery.eq('user_id', userId);
    }

    if (from) {
      countQuery = countQuery.gte('created_at', from);
      dataQuery = dataQuery.gte('created_at', from);
    }

    if (to) {
      countQuery = countQuery.lte('created_at', to);
      dataQuery = dataQuery.lte('created_at', to);
    }

    if (search) {
      countQuery = countQuery.ilike('user_email', `%${search}%`);
      dataQuery = dataQuery.ilike('user_email', `%${search}%`);
    }

    dataQuery = dataQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);

    if (countResult.error) {
      console.error('[audit] Count error:', countResult.error.message);
      return error(res, 500, 'INTERNAL_ERROR', 'Failed to count audit logs');
    }

    if (dataResult.error) {
      console.error('[audit] Select error:', dataResult.error.message);
      return error(res, 500, 'INTERNAL_ERROR', 'Failed to list audit logs');
    }

    const entries = (dataResult.data || []).map(row => ({
      id: row.id,
      userId: row.user_id || null,
      userEmail: row.user_email || null,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      action: row.action,
      changes: row.changes || {},
      createdAt: row.created_at,
    }));

    return paginated(res, entries, countResult.count || 0, page, perPage);
  } catch (err) {
    console.error('[audit] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Unexpected error listing audit logs');
  }
});

module.exports = router;
