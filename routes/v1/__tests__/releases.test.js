'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../releases.routes');

// ── Test helpers ────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    headers: {},
    params: {},
    query: {},
    requestId: 'test-req-id',
    app: { locals: { supabase: null } },
    apiKey: { id: 'key-uuid', permissions: { 'releases:read': true } },
    ...overrides,
  };
}

function mockRes() {
  const res = {
    _status: null,
    _json: null,
    req: { requestId: 'test-req-id' },
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

// ── Sample data ─────────────────────────────────────────────────────────────

const sampleRelease = {
  id: 'rel-001',
  version: 'v4.0.0',
  title: 'Release Abril',
  status: 'em_homologacao',
  productionDate: '2026-04-15',
  squads: [
    {
      id: 'sq-1',
      squadId: 'squad-abc',
      squadName: 'Squad Alpha',
      status: 'testing',
      features: [
        {
          id: 'f-1',
          name: 'Login',
          tests: 3,
          cases: [
            { id: 'c-1', status: 'Concluído' },
            { id: 'c-2', status: 'Falhou' },
            { id: 'c-3', status: 'Bloqueado' },
          ],
        },
      ],
      bugs: [
        { id: 'b-1', status: 'Aberto', severity: 'Alta' },
        { id: 'b-2', status: 'Resolvido', severity: 'Média' },
      ],
      blockers: [{ id: 'bl-1', description: 'API down' }],
      notes: '',
      hasNewFeatures: true,
      suites: [],
    },
    {
      id: 'sq-2',
      squadId: 'squad-xyz',
      squadName: 'Squad Beta',
      status: 'not_started',
      features: [
        {
          id: 'f-2',
          name: 'Dashboard',
          tests: 2,
          cases: [
            { id: 'c-4', status: 'Concluído' },
            { id: 'c-5', status: 'Concluído' },
          ],
        },
      ],
      bugs: [],
      blockers: [],
      notes: '',
      hasNewFeatures: false,
      suites: [],
    },
  ],
  createdAt: '2026-04-01T00:00:00Z',
  updatedAt: '2026-04-06T12:00:00Z',
};

// ── GET / (list) ────────────────────────────────────────────────────────────

describe('GET /api/v1/releases (list)', () => {
  const handler = getRouteHandler(router, 'get', '/');

  it('route handler exists', () => {
    assert.ok(handler, 'GET / handler should exist on the router');
  });

  it('returns 503 when supabase is not configured', async () => {
    const req = mockReq({ query: {} });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 503);
  });

  it('returns paginated releases', async () => {
    const rows = [
      {
        id: 'rel-001',
        version: 'v4.0.0',
        title: 'Release Abril',
        status: 'em_homologacao',
        production_date: '2026-04-15',
        squad_count: 2,
        updated_at: '2026-04-06T12:00:00Z',
      },
    ];

    const supabase = {
      from: () => ({
        select: (...args) => {
          // Count query (head: true)
          if (args[1] && args[1].head) {
            return Promise.resolve({ count: 1, error: null });
          }
          // Data query
          return {
            order: () => ({
              range: () => Promise.resolve({ data: rows, error: null }),
            }),
          };
        },
      }),
    };

    const req = mockReq({ query: { page: '1', perPage: '20' }, app: { locals: { supabase } } });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.equal(res._json.data.length, 1);
    assert.equal(res._json.data[0].version, 'v4.0.0');
    assert.equal(res._json.data[0].productionDate, '2026-04-15');
    assert.equal(res._json.meta.total, 1);
    assert.equal(res._json.meta.page, 1);
    assert.equal(res._json.meta.perPage, 20);
  });

  it('filters by status', async () => {
    let statusFilter = null;

    const supabase = {
      from: () => ({
        select: (...args) => {
          if (args[1] && args[1].head) {
            return {
              eq: (col, val) => {
                statusFilter = val;
                return Promise.resolve({ count: 0, error: null });
              },
            };
          }
          return {
            order: () => ({
              range: () => ({
                eq: (col, val) => {
                  statusFilter = val;
                  return Promise.resolve({ data: [], error: null });
                },
              }),
            }),
          };
        },
      }),
    };

    const req = mockReq({ query: { status: 'aprovada' }, app: { locals: { supabase } } });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(statusFilter, 'aprovada');
    assert.equal(res._json.data.length, 0);
  });

  it('returns 400 for invalid query params', async () => {
    const supabase = { from: () => ({}) };
    const req = mockReq({ query: { page: '-1' }, app: { locals: { supabase } } });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 400);
  });
});

// ── GET /:id (detail) ──────────────────────────────────────────────────────

describe('GET /api/v1/releases/:id (detail)', () => {
  const handler = getRouteHandler(router, 'get', '/:id');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:id handler should exist on the router');
  });

  it('returns 400 for invalid UUID', async () => {
    const req = mockReq({ params: { id: 'not-a-uuid' }, app: { locals: { supabase: {} } } });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 400);
  });

  it('returns 503 when supabase is not configured', async () => {
    const req = mockReq({ params: { id: '00000000-0000-0000-0000-000000000000' } });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 503);
  });

  it('returns 404 for unknown release', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: '00000000-0000-0000-0000-000000000000' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 404);
  });

  it('returns full release data', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: sampleRelease }, error: null }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: '00000000-0000-0000-0000-000000000000' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.equal(res._json.data.id, 'rel-001');
    assert.equal(res._json.data.version, 'v4.0.0');
    assert.equal(res._json.data.squads.length, 2);
  });
});

// ── GET /:id/metrics ────────────────────────────────────────────────────────

describe('GET /api/v1/releases/:id/metrics', () => {
  const handler = getRouteHandler(router, 'get', '/:id/metrics');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:id/metrics handler should exist on the router');
  });

  it('returns 400 for invalid UUID', async () => {
    const req = mockReq({ params: { id: 'bad' }, app: { locals: { supabase: {} } } });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 400);
  });

  it('returns 404 for unknown release', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: '00000000-0000-0000-0000-000000000000' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 404);
  });

  it('computes correct metrics from release data', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: sampleRelease }, error: null }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: '00000000-0000-0000-0000-000000000000' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    const m = res._json.data;

    // Squad Alpha: 3 tests (1 passed, 1 failed, 1 blocked), 1 open bug, 1 resolved, 1 blocker
    // Squad Beta: 2 tests (2 passed), 0 bugs, 0 blockers
    assert.equal(m.totalSquads, 2);
    assert.equal(m.totalTests, 5);       // 3 + 2
    assert.equal(m.executedTests, 4);    // 2 (Alpha: passed+failed) + 2 (Beta: passed+passed)
    assert.equal(m.passedTests, 3);      // 1 (Alpha) + 2 (Beta)
    assert.equal(m.failedTests, 1);      // 1 (Alpha)
    assert.equal(m.blockedTests, 1);     // 1 (Alpha)
    assert.equal(m.openBugs, 1);         // 1 Aberto in Alpha
    assert.equal(m.resolvedBugs, 1);     // 1 Resolvido in Alpha
    assert.equal(m.blockers, 1);         // 1 blocker in Alpha
    assert.equal(m.coveragePct, 80);     // 4/5 * 100 = 80
    assert.equal(m.passPct, 60);         // 3/5 * 100 = 60
  });

  it('handles empty release (no squads) gracefully', async () => {
    const emptyRelease = { id: 'rel-empty', squads: [] };
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: emptyRelease }, error: null }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: '00000000-0000-0000-0000-000000000000' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    const m = res._json.data;
    assert.equal(m.totalSquads, 0);
    assert.equal(m.totalTests, 0);
    assert.equal(m.coveragePct, 0);
    assert.equal(m.passPct, 0);
  });

  it('handles release with no data field gracefully', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: null }, error: null }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: '00000000-0000-0000-0000-000000000000' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    const m = res._json.data;
    assert.equal(m.totalSquads, 0);
    assert.equal(m.totalTests, 0);
  });
});

// ── computeReleaseMetrics unit tests ────────────────────────────────────────

describe('computeReleaseMetrics (unit)', () => {
  const computeReleaseMetrics = router._computeReleaseMetrics;

  it('returns zeros for empty release', () => {
    const m = computeReleaseMetrics({});
    assert.equal(m.totalSquads, 0);
    assert.equal(m.totalTests, 0);
    assert.equal(m.coveragePct, 0);
    assert.equal(m.passPct, 0);
  });

  it('aggregates across multiple squads', () => {
    const m = computeReleaseMetrics(sampleRelease);
    assert.equal(m.totalSquads, 2);
    assert.equal(m.totalTests, 5);
    assert.equal(m.passedTests, 3);
    assert.equal(m.failedTests, 1);
    assert.equal(m.blockedTests, 1);
  });
});
