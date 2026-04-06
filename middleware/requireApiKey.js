'use strict';

const { hashApiKey } = require('./apiKeyUtils');

/**
 * Express middleware factory that validates API key authentication.
 * Expects `Authorization: Bearer tok_...` header.
 *
 * @param {string} [requiredPermission] - Permission key that must be present in the API key's permissions JSONB
 * @returns {import('express').RequestHandler}
 */
function requireApiKey(requiredPermission) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer tok_')) {
      return res.status(401).json({
        error: { code: 'MISSING_API_KEY', message: 'API key required', status: 401 },
        meta: { requestId: req.requestId },
      });
    }

    const raw = authHeader.slice(7); // Remove 'Bearer '
    const hash = hashApiKey(raw);
    const supabase = req.app.locals.supabase;

    if (!supabase) {
      return res.status(503).json({
        error: { code: 'SERVICE_UNAVAILABLE', message: 'Database not configured', status: 503 },
        meta: { requestId: req.requestId },
      });
    }

    const { data: key, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', hash)
      .eq('is_active', true)
      .single();

    if (error || !key) {
      return res.status(401).json({
        error: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key', status: 401 },
        meta: { requestId: req.requestId },
      });
    }

    // Check expiration
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return res.status(401).json({
        error: { code: 'EXPIRED_API_KEY', message: 'API key has expired', status: 401 },
        meta: { requestId: req.requestId },
      });
    }

    // Check permission
    if (requiredPermission && !key.permissions[requiredPermission]) {
      return res.status(403).json({
        error: { code: 'INSUFFICIENT_PERMISSIONS', message: `Missing permission: ${requiredPermission}`, status: 403 },
        meta: { requestId: req.requestId },
      });
    }

    // Update last_used_at (fire and forget)
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', key.id)
      .then(() => {});

    req.apiKey = key;
    next();
  };
}

module.exports = { requireApiKey };
