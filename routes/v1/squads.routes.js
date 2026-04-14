'use strict';

const { Router } = require('express');
const { requireApiKey } = require('../../middleware/requireApiKey');
const { success, error } = require('./helpers');

const router = Router();

// ── Routes ──────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /api/v1/squads:
 *   get:
 *     tags: [Squads]
 *     summary: List squads with member count
 *     description: |
 *       Returns all squads the API key has access to, including a member count.
 *       If the API key has `squad_ids` configured, only those squads are returned.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of squads
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
 *                       description: { type: string }
 *                       color: { type: string }
 *                       memberCount: { type: integer }
 *                 meta: { type: object }
 *       401: { description: Authentication required }
 *       403: { description: Missing permission }
 *       500: { description: Internal server error }
 */
router.get('/', requireApiKey('squads:read'), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');

  try {
    let query = supabase
      .from('squads')
      .select('id, name, description, color, squad_members(count)');

    // Filter by API key's squad_ids if configured
    const squadIds = req.apiKey.squad_ids;
    if (squadIds && squadIds.length > 0) {
      query = query.in('id', squadIds);
    }

    const { data, error: dbError } = await query;

    if (dbError) {
      console.error('[squads] Select error:', dbError.message);
      return error(res, 500, 'DB_ERROR', 'Failed to list squads');
    }

    const squads = (data || []).map(s => ({
      id: s.id,
      name: s.name,
      description: s.description || '',
      color: s.color || '',
      memberCount: s.squad_members?.[0]?.count ?? 0,
    }));

    return success(res, squads);
  } catch (err) {
    console.error('[squads] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  }
});

/**
 * @openapi
 * /api/v1/squads/{id}/members:
 *   get:
 *     tags: [Squads]
 *     summary: List members of a squad
 *     description: Returns all members of the given squad, joined with their profiles.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Squad UUID
 *     responses:
 *       200:
 *         description: List of squad members
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
 *                       userId: { type: string, format: uuid }
 *                       displayName: { type: string }
 *                       email: { type: string }
 *                       role: { type: string }
 *                 meta: { type: object }
 *       401: { description: Authentication required }
 *       403: { description: Missing permission }
 *       404: { description: Squad not found }
 *       500: { description: Internal server error }
 */
router.get('/:id/members', requireApiKey('squads:read'), async (req, res) => {
  const supabase = req.app.locals.supabase;
  if (!supabase) return error(res, 503, 'SERVICE_UNAVAILABLE', 'Database not configured');

  const { id } = req.params;

  // Check if API key has access to this squad
  if (req.apiKey && req.apiKey.squad_ids && req.apiKey.squad_ids.length > 0) {
    if (!req.apiKey.squad_ids.includes(id)) {
      return error(res, 403, 'FORBIDDEN', 'API key não tem acesso a este squad.');
    }
  }

  try {
    // Check squad exists
    const { data: squad, error: squadError } = await supabase
      .from('squads')
      .select('id')
      .eq('id', id)
      .single();

    if (squadError || !squad) {
      return error(res, 404, 'NOT_FOUND', 'Squad not found');
    }

    const { data: members, error: membersError } = await supabase
      .from('squad_members')
      .select('role, profiles(id, display_name, email)')
      .eq('squad_id', id);

    if (membersError) {
      console.error('[squads] Members select error:', membersError.message);
      return error(res, 500, 'DB_ERROR', 'Failed to list squad members');
    }

    const result = (members || []).map(m => ({
      userId: m.profiles?.id ?? '',
      displayName: m.profiles?.display_name ?? '',
      email: m.profiles?.email ?? '',
      role: m.role || '',
    }));

    return success(res, result);
  } catch (err) {
    console.error('[squads] Unexpected error:', err);
    return error(res, 500, 'INTERNAL_ERROR', 'Internal server error');
  }
});

module.exports = router;
