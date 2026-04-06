'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// We test the route handlers by importing the router and inspecting its stack,
// then calling the handlers directly with mock req/res objects.
// This avoids needing a running Express server.

const router = require('../apikeys.routes');

// ── Test helpers ────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    headers: {},
    params: {},
    body: {},
    validatedBody: {},
    caller: { id: 'caller-uuid' },
    callerProfile: { global_role: 'admin' },
    app: { locals: { supabase: null } },
    ...overrides,
  };
}

function mockRes() {
  const res = {
    _status: null,
    _json: null,
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

/**
 * Extract the last handler from a route stack layer.
 * Express routers store middleware in `router.stack[].route.stack[].handle`.
 * We want the last handler (the actual route logic, after middleware).
 */
function getRouteHandler(routerInstance, method, path) {
  for (const layer of routerInstance.stack) {
    if (!layer.route) continue;
    const route = layer.route;
    if (route.path === path && route.methods[method]) {
      // Return the last handler in the stack (the actual route logic)
      const handlers = route.stack.map(s => s.handle);
      return handlers[handlers.length - 1];
    }
  }
  return null;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/v1/apikeys (create)', () => {
  const handler = getRouteHandler(router, 'post', '/');

  it('route handler exists', () => {
    assert.ok(handler, 'POST / handler should exist on the router');
  });

  it('returns 503 when supabase is not configured', async () => {
    const req = mockReq({
      validatedBody: { name: 'Test Key', permissions: {}, squad_ids: [] },
    });
    const res = mockRes();

    await handler(req, res, () => {});

    assert.equal(res._status, 503);
  });

  it('returns 201 with key data on success', async () => {
    const insertedRow = {
      id: 'new-key-uuid',
      name: 'Test Key',
      key_prefix: 'tok_abc12345...',
      permissions: { 'read:metrics': true },
      squad_ids: [],
      expires_at: null,
      created_at: '2026-04-06T00:00:00Z',
    };

    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: insertedRow, error: null }),
          }),
        }),
      }),
    };

    const req = mockReq({
      validatedBody: { name: 'Test Key', permissions: { 'read:metrics': true }, squad_ids: [] },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res, () => {});

    assert.equal(res._status, 201);
    assert.ok(res._json.key, 'Response should include the raw key');
    assert.ok(res._json.key.startsWith('tok_'), 'Raw key should start with tok_');
    assert.equal(res._json.id, 'new-key-uuid');
  });

  it('returns 500 on database insert error', async () => {
    const supabase = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
          }),
        }),
      }),
    };

    const req = mockReq({
      validatedBody: { name: 'Test Key', permissions: {}, squad_ids: [] },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res, () => {});

    assert.equal(res._status, 500);
  });
});

describe('GET /api/v1/apikeys (list)', () => {
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

  it('returns list of keys on success', async () => {
    const keys = [
      { id: 'key-1', name: 'Key 1', key_prefix: 'tok_abc...', is_active: true },
      { id: 'key-2', name: 'Key 2', key_prefix: 'tok_def...', is_active: false },
    ];

    const supabase = {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: keys, error: null }),
        }),
      }),
    };

    const req = mockReq({ app: { locals: { supabase } } });
    const res = mockRes();

    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 is default, status() not called
    assert.deepEqual(res._json.data, keys);
  });
});

describe('DELETE /api/v1/apikeys/:id (revoke)', () => {
  const handler = getRouteHandler(router, 'delete', '/:id');

  it('route handler exists', () => {
    assert.ok(handler, 'DELETE /:id handler should exist on the router');
  });

  it('returns 400 for invalid UUID', async () => {
    const req = mockReq({
      params: { id: 'not-a-uuid' },
      app: { locals: { supabase: {} } },
    });
    const res = mockRes();

    await handler(req, res, () => {});

    assert.equal(res._status, 400);
  });

  it('returns 404 when key is not found', async () => {
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
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

  it('returns 200 on successful revocation', async () => {
    const supabase = {
      from: () => ({
        update: () => ({
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve({
                data: { id: '00000000-0000-0000-0000-000000000000' },
                error: null,
              }),
            }),
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
    assert.equal(res._json.ok, true);
    assert.equal(res._json.id, '00000000-0000-0000-0000-000000000000');
  });
});
