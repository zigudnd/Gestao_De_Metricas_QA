'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../sprints.write.routes');

// ── Test helpers ────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    headers: {},
    params: {},
    body: {},
    validatedBody: {},
    requestId: 'test-req-id',
    apiKey: { permissions: { 'bugs:write': true } },
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

// ── Tests: POST /sprints/:id/bugs ───────────────────────────────────────────

describe('POST /sprints/:id/bugs (create bug)', () => {
  const handler = getRouteHandler(router, 'post', '/sprints/:id/bugs');

  it('route handler exists', () => {
    assert.ok(handler, 'POST /sprints/:id/bugs handler should exist');
  });

  it('returns 503 when supabase is not configured', async () => {
    const req = mockReq({ params: { id: 'sprint-1' } });
    const res = mockRes();
    await handler(req, res, () => {});
    assert.equal(res._status, 503);
  });

  it('returns 404 when sprint not found', async () => {
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
      params: { id: 'unknown' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 404);
    assert.equal(res._json.error.code, 'NOT_FOUND');
  });

  it('returns 409 when sprint is concluded', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'sprint-1', data: { status: 'concluida', bugs: [] } },
              error: null,
            }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: 'sprint-1' },
      validatedBody: { desc: 'Bug', stack: 'Front', severity: 'Alta' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 409);
    assert.equal(res._json.error.code, 'SPRINT_CONCLUDED');
  });

  it('creates bug successfully and returns 201', async () => {
    let updatedData = null;
    const supabase = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'sprint-1', data: { status: 'ativa', bugs: [] } },
              error: null,
            }),
          }),
        }),
        update: (payload) => {
          updatedData = payload;
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
      }),
    };

    const req = mockReq({
      params: { id: 'sprint-1' },
      validatedBody: {
        desc: 'Button not working',
        feature: 'Login',
        stack: 'Front',
        severity: 'Alta',
        assignee: 'dev1',
        notes: 'Reproducible on Chrome',
      },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 201);
    assert.ok(res._json.data.id.startsWith('bug_api_'));
    assert.equal(res._json.data.desc, 'Button not working');
    assert.equal(res._json.data.status, 'Aberto');
    assert.equal(res._json.data.retests, 0);
    assert.ok(res._json.data.openedAt);

    // Verify data was updated with the new bug
    assert.equal(updatedData.data.bugs.length, 1);
  });

  it('validates body via Zod middleware (invalid body returns 400)', async () => {
    // Test the validateBody middleware directly by extracting it from the route stack.
    // In the route stack: [requireApiKey, validateBody, handler].
    // validateBody is at index 1 (the second middleware).
    let validateMiddleware = null;
    for (const layer of router.stack) {
      if (!layer.route) continue;
      if (layer.route.path === '/sprints/:id/bugs' && layer.route.methods.post) {
        // Stack: [requireApiKey, validateBody, handler]
        validateMiddleware = layer.route.stack[1].handle;
        break;
      }
    }

    assert.ok(validateMiddleware, 'validateBody middleware should exist at index 1');

    const req = mockReq({
      body: { desc: '', stack: 'Invalid' }, // invalid: desc empty, stack not in enum
    });
    const res = mockRes();
    let nextCalled = false;
    validateMiddleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });
});
