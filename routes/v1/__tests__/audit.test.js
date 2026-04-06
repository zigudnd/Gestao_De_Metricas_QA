'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../audit.routes');

// ── Test helpers ────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  const req = {
    requestId: 'req_test123',
    headers: {},
    params: {},
    query: {},
    body: {},
    app: { locals: { supabase: null } },
    ...overrides,
  };
  return req;
}

function mockRes() {
  const res = {
    _status: null,
    _json: null,
    req: null,
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
  };
  return res;
}

function createReqRes(overrides = {}) {
  const req = mockReq(overrides);
  const res = mockRes();
  res.req = req;
  return { req, res };
}

function getRouteHandler(routerInstance, method, path) {
  for (const layer of routerInstance.stack) {
    if (!layer.route) continue;
    const route = layer.route;
    if (route.path === path && route.methods[method]) {
      const handlers = route.stack.map(s => s.handle);
      return handlers[handlers.length - 1];
    }
  }
  return null;
}

// ── Supabase mock builders ──────────────────────────────────────────────────

function mockAuditRow(overrides = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    user_id: '00000000-0000-0000-0000-000000000099',
    user_email: 'user@example.com',
    resource_type: 'sprint',
    resource_id: '00000000-0000-0000-0000-000000000010',
    action: 'create',
    changes: { title: { old: null, new: 'Sprint 1' } },
    created_at: '2026-03-20T10:00:00Z',
    ...overrides,
  };
}

function buildSupabaseMock({ rows = [], count = 0, capturedFilters = {} } = {}) {
  return {
    from: () => ({
      select: (cols, opts) => {
        const chain = {
          eq: (field, value) => {
            capturedFilters[field] = value;
            return chain;
          },
          gte: (field, value) => {
            capturedFilters[`${field}_gte`] = value;
            return chain;
          },
          lte: (field, value) => {
            capturedFilters[`${field}_lte`] = value;
            return chain;
          },
          ilike: (field, value) => {
            capturedFilters[`${field}_ilike`] = value;
            return chain;
          },
          order: () => chain,
          range: () => chain,
          then: (cb) => cb(opts && opts.head ? { count, error: null } : { data: rows, error: null }),
          catch: () => {},
        };
        return chain;
      },
    }),
  };
}

// ── GET / (List audit logs) ─────────────────────────────────────────────────

describe('GET /api/v1/audit-logs (list)', () => {
  const handler = getRouteHandler(router, 'get', '/');

  it('route handler exists', () => {
    assert.ok(handler, 'GET / handler should exist');
  });

  it('returns paginated response', async () => {
    const rows = [
      mockAuditRow(),
      mockAuditRow({ id: '00000000-0000-0000-0000-000000000002', action: 'update' }),
    ];

    const supabase = buildSupabaseMock({ rows, count: 2 });

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 50 },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.ok(res._json.data);
    assert.equal(res._json.data.length, 2);
    assert.equal(res._json.meta.total, 2);
    assert.equal(res._json.meta.page, 1);
    assert.equal(res._json.meta.perPage, 50);
    assert.ok(res._json.meta.requestId);
    assert.ok(res._json.meta.timestamp);

    // Check camelCase mapping
    const entry = res._json.data[0];
    assert.equal(entry.userId, '00000000-0000-0000-0000-000000000099');
    assert.equal(entry.userEmail, 'user@example.com');
    assert.equal(entry.resourceType, 'sprint');
    assert.equal(entry.resourceId, '00000000-0000-0000-0000-000000000010');
    assert.equal(entry.action, 'create');
    assert.deepEqual(entry.changes, { title: { old: null, new: 'Sprint 1' } });
    assert.equal(entry.createdAt, '2026-03-20T10:00:00Z');
  });

  it('filters by resourceType', async () => {
    const capturedFilters = {};
    const supabase = buildSupabaseMock({ capturedFilters });

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 50, resourceType: 'sprint' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(capturedFilters.resource_type, 'sprint');
  });

  it('filters by action', async () => {
    const capturedFilters = {};
    const supabase = buildSupabaseMock({ capturedFilters });

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 50, action: 'delete' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(capturedFilters.action, 'delete');
  });

  it('filters by date range', async () => {
    const capturedFilters = {};
    const supabase = buildSupabaseMock({ capturedFilters });

    const fromDate = '2026-03-01T00:00:00Z';
    const toDate = '2026-03-31T23:59:59Z';

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 50, from: fromDate, to: toDate },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(capturedFilters.created_at_gte, fromDate);
    assert.equal(capturedFilters.created_at_lte, toDate);
  });

  it('filters by search (email)', async () => {
    const capturedFilters = {};
    const supabase = buildSupabaseMock({ capturedFilters });

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 50, search: 'admin@' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(capturedFilters.user_email_ilike, '%admin@%');
  });

  it('returns 503 when no supabase', async () => {
    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 50 },
      app: { locals: { supabase: null } },
    });

    await handler(req, res, () => {});

    assert.equal(res._status, 503);
    assert.equal(res._json.error.code, 'SERVICE_UNAVAILABLE');
  });
});

// ── Combined auth middleware ────────────────────────────────────────────────

describe('requireAuditAccess (combined auth)', () => {
  // The auth middleware is the first handler in the route stack
  function getAuthMiddleware() {
    for (const layer of router.stack) {
      if (!layer.route) continue;
      if (layer.route.path === '/' && layer.route.methods.get) {
        return layer.route.stack[0].handle; // first handler = auth middleware
      }
    }
    return null;
  }

  const authMiddleware = getAuthMiddleware();

  it('auth middleware exists', () => {
    assert.ok(authMiddleware, 'Auth middleware should exist');
  });

  it('delegates to requireApiKey for tok_ tokens', async () => {
    // When token starts with tok_, the middleware delegates to requireApiKey.
    // Without a valid supabase, requireApiKey returns 503.
    const { req, res } = createReqRes({
      headers: { authorization: 'Bearer tok_abc123' },
      app: { locals: { supabase: null } },
    });

    let nextCalled = false;
    await authMiddleware(req, res, () => { nextCalled = true; });

    // Without supabase, requireApiKey returns 503
    assert.equal(res._status, 503);
    assert.equal(nextCalled, false);
  });

  it('delegates to requireAdminAuth for non-tok_ tokens', async () => {
    // When token does NOT start with tok_, the middleware delegates to requireAdminAuth.
    // Without supabase, requireAdminAuth returns 503.
    const { req, res } = createReqRes({
      headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.test' },
      app: { locals: { supabase: null } },
    });

    let nextCalled = false;
    await authMiddleware(req, res, () => { nextCalled = true; });

    assert.equal(res._status, 503);
    assert.equal(nextCalled, false);
  });

  it('delegates to requireAdminAuth when no authorization header', async () => {
    const { req, res } = createReqRes({
      headers: {},
      app: { locals: { supabase: null } },
    });

    let nextCalled = false;
    await authMiddleware(req, res, () => { nextCalled = true; });

    // requireAdminAuth checks supabase first → 503
    assert.equal(res._status, 503);
    assert.equal(nextCalled, false);
  });
});
