'use strict';

/**
 * SEC: H-04 — Middleware that enforces API key squad_ids scope on resources.
 *
 * For list endpoints: filters query by squad_ids (caller uses req.squadScope).
 * For detail endpoints: fetches resource squad_id and verifies against API key scope.
 *
 * Usage:
 *   router.get('/:id', requireApiKey('sprints:read'), enforceSquadScope('sprints'), handler)
 *
 * The middleware attaches `req.squadScope` with:
 *   - `hasScope`: boolean (true if API key has squad_ids restriction)
 *   - `squadIds`: string[] (the allowed squad IDs, empty if unrestricted)
 */
function enforceSquadScope(tableName) {
  return async (req, res, next) => {
    // Only applies to API key requests (not Bearer admin auth)
    if (!req.apiKey) return next();

    const squadIds = req.apiKey.squad_ids;
    const hasScope = Array.isArray(squadIds) && squadIds.length > 0;

    // Attach scope info for list endpoints to use in their query
    req.squadScope = { hasScope, squadIds: hasScope ? squadIds : [] };

    // For detail endpoints (with :id param), verify the resource belongs to a scoped squad
    const resourceId = req.params.id || req.params.sprintId || req.params.releaseId;
    if (hasScope && resourceId && tableName) {
      const supabase = req.app.locals.supabase;
      if (!supabase) return res.status(503).json({ error: 'SERVICE_UNAVAILABLE', message: 'Database not configured' });

      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('squad_id')
          .eq('id', resourceId)
          .single();

        if (error || !data) {
          return res.status(404).json({ error: 'NOT_FOUND', message: `Resource ${resourceId} not found` });
        }

        // If resource has a squad_id and it's not in the API key's scope → 403
        if (data.squad_id && !squadIds.includes(data.squad_id)) {
          return res.status(403).json({ error: 'SCOPE_DENIED', message: 'API key does not have access to this squad\'s resources' });
        }
      } catch (err) {
        console.error(`[enforceSquadScope] Error checking ${tableName}:`, err);
        return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Scope verification failed' });
      }
    }

    next();
  };
}

module.exports = { enforceSquadScope };
