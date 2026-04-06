'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../sprints.routes');

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
    req: null, // set after creation
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

/**
 * Extract the last handler from a route stack layer.
 */
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

function mockSprintRow(data = {}, overrides = {}) {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    title: 'Sprint 1',
    squad: 'Squad Alpha',
    squad_id: '00000000-0000-0000-0000-000000000010',
    start_date: '2026-01-01',
    end_date: '2026-01-15',
    total_tests: 50,
    total_exec: 30,
    updated_at: '2026-01-10T12:00:00Z',
    status: 'ativa',
    ...overrides,
  };
}

function mockSprintState(overrides = {}) {
  return {
    config: {
      title: 'Sprint 1',
      sprintDays: 10,
      startDate: '2026-01-01',
      endDate: '2026-01-15',
      hsCritical: 10,
      hsHigh: 5,
      hsMedium: 2,
      hsLow: 1,
      hsRetest: 3,
      hsBlocked: 5,
      hsDelayed: 10,
    },
    features: [
      { id: 1, name: 'Feature A', tests: 20, exec: 15, status: 'Ativa', cases: [] },
      { id: 2, name: 'Feature B', tests: 10, exec: 5, status: 'Bloqueada', cases: [] },
    ],
    bugs: [
      {
        id: 'bug-1', desc: 'Crash on login', feature: 'Feature A',
        stack: 'Front', severity: 'Cr\u00edtica', assignee: 'Dev A',
        status: 'Aberto', retests: 0, openedAt: '2026-01-05T10:00:00Z',
      },
      {
        id: 'bug-2', desc: 'Typo on label', feature: 'Feature B',
        stack: 'Front', severity: 'Baixa', assignee: 'Dev B',
        status: 'Resolvido', retests: 2,
        openedAt: '2026-01-06T08:00:00Z', resolvedAt: '2026-01-07T08:00:00Z',
      },
    ],
    blockers: [
      { id: 1, date: '2026-01-08', reason: 'Environment down', hours: 4 },
    ],
    suites: [],
    alignments: [],
    responsibles: [],
    notes: { premises: '', actionPlan: '', operationalNotes: '' },
    currentDate: '2026-01-10',
    reports: {},
    ...overrides,
  };
}

// ── GET / (List sprints) ────────────────────────────────────────────────────

describe('GET /api/v1/sprints (list)', () => {
  const handler = getRouteHandler(router, 'get', '/');

  it('route handler exists', () => {
    assert.ok(handler, 'GET / handler should exist');
  });

  it('returns paginated response', async () => {
    const rows = [mockSprintRow(), mockSprintRow({ id: '00000000-0000-0000-0000-000000000002', title: 'Sprint 2' })];

    const supabase = {
      from: () => ({
        select: (cols, opts) => {
          if (opts && opts.head) {
            // count query
            return {
              eq: function() { return this; },
              then: (cb) => cb({ count: 2, error: null }),
              catch: () => {},
            };
          }
          // data query
          return {
            eq: function() { return this; },
            order: function() { return this; },
            range: function() { return this; },
            then: (cb) => cb({ data: rows, error: null }),
            catch: () => {},
          };
        },
      }),
    };

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 20 },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.ok(res._json.data);
    assert.equal(res._json.data.length, 2);
    assert.equal(res._json.meta.total, 2);
    assert.equal(res._json.meta.page, 1);
    assert.equal(res._json.meta.perPage, 20);
    assert.ok(res._json.meta.requestId);
    assert.ok(res._json.meta.timestamp);
  });

  it('filters by status', async () => {
    let capturedEqField = null;
    let capturedEqValue = null;

    const supabase = {
      from: () => ({
        select: (cols, opts) => {
          const chain = {
            eq: (field, value) => { capturedEqField = field; capturedEqValue = value; return chain; },
            order: () => chain,
            range: () => chain,
            then: (cb) => cb(opts && opts.head ? { count: 0, error: null } : { data: [], error: null }),
            catch: () => {},
          };
          return chain;
        },
      }),
    };

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 20, status: 'ativa' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(capturedEqField, 'status');
    assert.equal(capturedEqValue, 'ativa');
  });

  it('filters by squadId', async () => {
    let capturedEqField = null;
    let capturedEqValue = null;
    const squadUuid = '00000000-0000-0000-0000-000000000010';

    const supabase = {
      from: () => ({
        select: (cols, opts) => {
          const chain = {
            eq: (field, value) => { capturedEqField = field; capturedEqValue = value; return chain; },
            order: () => chain,
            range: () => chain,
            then: (cb) => cb(opts && opts.head ? { count: 0, error: null } : { data: [], error: null }),
            catch: () => {},
          };
          return chain;
        },
      }),
    };

    const { req, res } = createReqRes({
      validatedQuery: { page: 1, perPage: 20, squadId: squadUuid },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(capturedEqField, 'squad_id');
    assert.equal(capturedEqValue, squadUuid);
  });
});

// ── GET /:id (Full sprint state) ────────────────────────────────────────────

describe('GET /api/v1/sprints/:id (full state)', () => {
  const handler = getRouteHandler(router, 'get', '/:id');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:id handler should exist');
  });

  it('returns sprint data', async () => {
    const state = mockSprintState();

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: state }, error: null }),
          }),
        }),
      }),
    };

    const { req, res } = createReqRes({
      validatedParams: { id: '00000000-0000-0000-0000-000000000001' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200
    assert.deepEqual(res._json.data, state);
    assert.ok(res._json.meta.requestId);
  });

  it('returns 404 for unknown sprint', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
          }),
        }),
      }),
    };

    const { req, res } = createReqRes({
      validatedParams: { id: '00000000-0000-0000-0000-000000000099' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(res._status, 404);
    assert.equal(res._json.error.code, 'NOT_FOUND');
  });
});

// ── GET /:id/metrics (Computed KPIs) ────────────────────────────────────────

describe('GET /api/v1/sprints/:id/metrics (KPIs)', () => {
  const handler = getRouteHandler(router, 'get', '/:id/metrics');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:id/metrics handler should exist');
  });

  it('computes healthScore correctly', async () => {
    const state = mockSprintState();

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: state }, error: null }),
          }),
        }),
      }),
    };

    const { req, res } = createReqRes({
      validatedParams: { id: '00000000-0000-0000-0000-000000000001' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    const metrics = res._json.data;
    assert.equal(metrics.totalTests, 30); // 20 + 10
    assert.equal(metrics.totalExec, 20); // 15 + 5
    assert.equal(metrics.execPercent, 66.67); // (20/30)*100 rounded
    assert.equal(metrics.openBugs, 1); // bug-1 is Aberto
    assert.equal(metrics.blockedHours, 4);
    assert.ok(metrics.healthScore >= 0 && metrics.healthScore <= 100);
    assert.equal(typeof metrics.mttr, 'number');
    assert.equal(typeof metrics.retestIndex, 'number');
  });

  it('handles empty sprint (no features/bugs)', async () => {
    const state = mockSprintState({ features: [], bugs: [], blockers: [] });

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: state }, error: null }),
          }),
        }),
      }),
    };

    const { req, res } = createReqRes({
      validatedParams: { id: '00000000-0000-0000-0000-000000000001' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    const metrics = res._json.data;
    assert.equal(metrics.totalTests, 0);
    assert.equal(metrics.totalExec, 0);
    assert.equal(metrics.execPercent, 0);
    assert.equal(metrics.openBugs, 0);
    assert.equal(metrics.blockedHours, 0);
    assert.equal(metrics.healthScore, 100);
    assert.equal(metrics.mttr, 0);
    assert.equal(metrics.retestIndex, 0);
  });
});

// ── GET /:id/bugs (Bug list) ────────────────────────────────────────────────

describe('GET /api/v1/sprints/:id/bugs', () => {
  const handler = getRouteHandler(router, 'get', '/:id/bugs');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:id/bugs handler should exist');
  });

  it('returns bug array', async () => {
    const state = mockSprintState();

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: state }, error: null }),
          }),
        }),
      }),
    };

    const { req, res } = createReqRes({
      validatedParams: { id: '00000000-0000-0000-0000-000000000001' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200
    assert.ok(Array.isArray(res._json.data));
    assert.equal(res._json.data.length, 2);
    assert.equal(res._json.data[0].id, 'bug-1');
    assert.equal(res._json.data[1].id, 'bug-2');
  });

  it('returns empty array when no bugs', async () => {
    const state = mockSprintState({ bugs: [] });

    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { data: state }, error: null }),
          }),
        }),
      }),
    };

    const { req, res } = createReqRes({
      validatedParams: { id: '00000000-0000-0000-0000-000000000001' },
      app: { locals: { supabase } },
    });

    await handler(req, res, () => {});

    assert.equal(res._status, null);
    assert.ok(Array.isArray(res._json.data));
    assert.equal(res._json.data.length, 0);
  });
});

// ── computeMetrics unit tests ───────────────────────────────────────────────

describe('computeMetrics (direct)', () => {
  const computeMetrics = router._computeMetrics;

  it('returns all zero metrics for empty state', () => {
    const m = computeMetrics({});
    assert.equal(m.totalTests, 0);
    assert.equal(m.totalExec, 0);
    assert.equal(m.execPercent, 0);
    assert.equal(m.openBugs, 0);
    assert.equal(m.healthScore, 100);
    assert.equal(m.blockedHours, 0);
    assert.equal(m.mttr, 0);
    assert.equal(m.retestIndex, 0);
  });

  it('computes MTTR for resolved bugs with dates', () => {
    const m = computeMetrics({
      features: [],
      bugs: [
        {
          id: 'b1', status: 'Resolvido', retests: 1,
          openedAt: '2026-01-01T00:00:00Z', resolvedAt: '2026-01-01T12:00:00Z',
        },
        {
          id: 'b2', status: 'Resolvido', retests: 3,
          openedAt: '2026-01-02T00:00:00Z', resolvedAt: '2026-01-03T00:00:00Z',
        },
      ],
      blockers: [],
    });

    // (12 + 24) / 2 = 18 hours
    assert.equal(m.mttr, 18);
    // retestIndex = (1+3)/2 = 2
    assert.equal(m.retestIndex, 2);
  });
});
