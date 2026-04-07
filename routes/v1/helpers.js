'use strict';

/**
 * Standardized response helpers for API v1.
 */

function success(res, data, meta = {}) {
  return res.json({
    data,
    meta: { ...meta, requestId: res.req.requestId, timestamp: new Date().toISOString() },
  });
}

function paginated(res, data, total, page, perPage) {
  return res.json({
    data,
    meta: { total, page, perPage, requestId: res.req.requestId, timestamp: new Date().toISOString() },
  });
}

function error(res, status, code, message) {
  return res.status(status).json({
    error: { code, message, status },
    meta: { requestId: res.req.requestId },
  });
}

// ── Unified Release Statuses ────────────────────────────────────────────────
// Single source of truth for all valid release statuses across read & write routes.
const RELEASE_STATUSES = [
  'planejada',
  'em_desenvolvimento',
  'corte',
  'em_homologacao',
  'em_regressivo',
  'em_qa',
  'aguardando_aprovacao',
  'aprovada',
  'em_producao',
  'concluida',
  'uniu_escopo',
  'rollback',
  'cancelada',
];

module.exports = { success, paginated, error, RELEASE_STATUSES };
