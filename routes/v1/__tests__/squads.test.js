'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../squads.routes');

// ── Test helpers ────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    headers: {},
    params: {},
    body: {},
    requestId: 'test-req-id',
    apiKey: { squad_ids: [] },
    app: { locals: { supabase: null } },
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

// ── Tests: GET /api/v1/squads ───────────────────────────────────────────────

describe('GET /api/v1/squads (list)', () => {
  const handler = getRouteHandler(router, 'get', '/');

  it('route handler exists', () => {
    assert.ok(handler, 'GET / handler should exist on the router');
  });

  it('returns 503 when supabase is not configured', async () => {
    const req = mockReq();
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 503);
  });

  it('returns list of squads with member count', async () => {
    const dbSquads = [
      { id: 'sq-1', name: 'Alpha', description: 'Team A', color: '#ff0000', squad_members: [{ count: 3 }] },
      { id: 'sq-2', name: 'Beta', description: '', color: '', squad_members: [{ count: 0 }] },
    ];

    const supabase = {
      from: () => ({
        select: () => Promise.resolve({ data: dbSquads, error: null }),
      }),
    };

    const req = mockReq({ app: { locals: { supabase } } });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.equal(res._json.data.length, 2);
    assert.equal(res._json.data[0].name, 'Alpha');
    assert.equal(res._json.data[0].memberCount, 3);
    assert.equal(res._json.data[1].memberCount, 0);
  });

  it('filters by squad_ids when API key has them', async () => {
    let capturedIds = null;
    const supabase = {
      from: () => ({
        select: () => ({
          in: (col, ids) => {
            capturedIds = ids;
            return Promise.resolve({ data: [], error: null });
          },
        }),
      }),
    };

    const req = mockReq({
      apiKey: { squad_ids: ['sq-1', 'sq-2'] },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.deepEqual(capturedIds, ['sq-1', 'sq-2']);
  });
});

// ── Tests: GET /api/v1/squads/:id/members ───────────────────────────────────

describe('GET /api/v1/squads/:id/members', () => {
  const handler = getRouteHandler(router, 'get', '/:id/members');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:id/members handler should exist on the router');
  });

  it('returns 404 for unknown squad', async () => {
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
      params: { id: 'unknown-id' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 404);
    assert.equal(res._json.error.code, 'NOT_FOUND');
  });

  it('returns list of members on success', async () => {
    const membersData = [
      { role: 'lead', profiles: { id: 'u-1', display_name: 'Alice', email: 'alice@test.com' } },
      { role: 'dev', profiles: { id: 'u-2', display_name: 'Bob', email: 'bob@test.com' } },
    ];

    let callCount = 0;
    const supabase = {
      from: (table) => {
        if (table === 'squads') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({ data: { id: 'sq-1' }, error: null }),
              }),
            }),
          };
        }
        // squad_members
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: membersData, error: null }),
          }),
        };
      },
    };

    const req = mockReq({
      params: { id: 'sq-1' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.equal(res._json.data.length, 2);
    assert.equal(res._json.data[0].userId, 'u-1');
    assert.equal(res._json.data[0].displayName, 'Alice');
    assert.equal(res._json.data[1].role, 'dev');
  });
});
