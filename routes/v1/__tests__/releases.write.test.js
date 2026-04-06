'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../releases.write.routes');

// ── Test helpers ────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    headers: {},
    params: {},
    body: {},
    validatedBody: {},
    requestId: 'test-req-id',
    apiKey: { permissions: { 'releases:write': true } },
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

// ── Tests: PATCH /releases/:id/status ───────────────────────────────────────

describe('PATCH /releases/:id/status (update status)', () => {
  const handler = getRouteHandler(router, 'patch', '/releases/:id/status');

  it('route handler exists', () => {
    assert.ok(handler, 'PATCH /releases/:id/status handler should exist');
  });

  it('returns 404 when release not found', async () => {
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
      validatedBody: { status: 'em_qa', reason: '' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 404);
    assert.equal(res._json.error.code, 'NOT_FOUND');
  });

  it('returns 409 when release is concluded', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'rel-1', data: { status: 'concluida', statusHistory: [] } },
              error: null,
            }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: 'rel-1' },
      validatedBody: { status: 'rollback', reason: 'critical bug' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 409);
    assert.equal(res._json.error.code, 'RELEASE_CONCLUDED');
  });

  it('updates status successfully', async () => {
    let updatedPayload = null;
    const supabase = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'rel-1', status: 'em_qa', data: { status: 'em_qa', statusHistory: [] } },
              error: null,
            }),
          }),
        }),
        update: (payload) => {
          updatedPayload = payload;
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
      }),
    };

    const req = mockReq({
      params: { id: 'rel-1' },
      validatedBody: { status: 'aprovada', reason: 'QA passed' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.equal(res._json.data.status, 'aprovada');
    assert.equal(res._json.data.previousStatus, 'em_qa');
    assert.equal(res._json.data.id, 'rel-1');

    // Verify statusHistory was appended
    assert.equal(updatedPayload.data.statusHistory.length, 1);
    assert.equal(updatedPayload.data.statusHistory[0].from, 'em_qa');
    assert.equal(updatedPayload.data.statusHistory[0].to, 'aprovada');
    assert.equal(updatedPayload.status, 'aprovada');
  });
});

// ── Tests: PATCH /releases/:id/rollout ──────────────────────────────────────

describe('PATCH /releases/:id/rollout (update rollout)', () => {
  const handler = getRouteHandler(router, 'patch', '/releases/:id/rollout');

  it('route handler exists', () => {
    assert.ok(handler, 'PATCH /releases/:id/rollout handler should exist');
  });

  it('returns 404 when release not found', async () => {
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
      validatedBody: { rolloutPct: 50 },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 404);
  });

  it('returns 409 when release is not in production', async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'rel-1', data: { status: 'em_qa' } },
              error: null,
            }),
          }),
        }),
      }),
    };

    const req = mockReq({
      params: { id: 'rel-1' },
      validatedBody: { rolloutPct: 50 },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, 409);
    assert.equal(res._json.error.code, 'NOT_IN_PRODUCTION');
  });

  it('updates rollout successfully when release is em_producao', async () => {
    let updatedPayload = null;
    const supabase = {
      from: (table) => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({
              data: { id: 'rel-1', data: { status: 'em_producao', rolloutPct: 10 } },
              error: null,
            }),
          }),
        }),
        update: (payload) => {
          updatedPayload = payload;
          return {
            eq: () => Promise.resolve({ error: null }),
          };
        },
      }),
    };

    const req = mockReq({
      params: { id: 'rel-1' },
      validatedBody: { rolloutPct: 75 },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    await handler(req, res, () => {});

    assert.equal(res._status, null); // 200 default
    assert.equal(res._json.data.rolloutPct, 75);
    assert.equal(res._json.data.id, 'rel-1');
    assert.equal(updatedPayload.data.rolloutPct, 75);
  });
});
