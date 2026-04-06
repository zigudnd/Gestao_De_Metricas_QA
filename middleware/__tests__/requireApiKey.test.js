'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { requireApiKey } = require('../requireApiKey');
const { generateApiKey } = require('../apiKeyUtils');

// ── Test helpers ────────────────────────────────────────────────────────────

function mockReq(overrides = {}) {
  return {
    headers: {},
    requestId: 'req_test123',
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

function mockSupabase(queryResult) {
  const chain = {
    from: () => chain,
    select: () => chain,
    eq: () => chain,
    single: () => Promise.resolve(queryResult),
    update: () => ({ eq: () => Promise.resolve({}) }),
  };
  return chain;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('requireApiKey middleware', () => {
  it('returns 401 MISSING_API_KEY when no Authorization header', async () => {
    const middleware = requireApiKey('read:metrics');
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;

    await middleware(req, res, () => { nextCalled = true; });

    assert.equal(res._status, 401);
    assert.equal(res._json.error.code, 'MISSING_API_KEY');
    assert.equal(nextCalled, false);
  });

  it('returns 401 MISSING_API_KEY when header does not start with "Bearer tok_"', async () => {
    const middleware = requireApiKey('read:metrics');
    const req = mockReq({ headers: { authorization: 'Bearer eyJhbGciOiJ...' } });
    const res = mockRes();
    let nextCalled = false;

    await middleware(req, res, () => { nextCalled = true; });

    assert.equal(res._status, 401);
    assert.equal(res._json.error.code, 'MISSING_API_KEY');
    assert.equal(nextCalled, false);
  });

  it('returns 503 SERVICE_UNAVAILABLE when supabase is not configured', async () => {
    const middleware = requireApiKey('read:metrics');
    const req = mockReq({
      headers: { authorization: 'Bearer tok_abc123' },
      app: { locals: { supabase: null } },
    });
    const res = mockRes();

    await middleware(req, res, () => {});

    assert.equal(res._status, 503);
    assert.equal(res._json.error.code, 'SERVICE_UNAVAILABLE');
  });

  it('returns 401 INVALID_API_KEY when key is not found in DB', async () => {
    const middleware = requireApiKey('read:metrics');
    const supabase = mockSupabase({ data: null, error: { message: 'not found' } });
    const req = mockReq({
      headers: { authorization: 'Bearer tok_invalidkey123456789012345678901234567890123456' },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await middleware(req, res, () => {});

    assert.equal(res._status, 401);
    assert.equal(res._json.error.code, 'INVALID_API_KEY');
  });

  it('returns 401 EXPIRED_API_KEY when key has expired', async () => {
    const middleware = requireApiKey('read:metrics');
    const expiredKey = {
      id: 'key-uuid',
      permissions: { 'read:metrics': true },
      expires_at: '2020-01-01T00:00:00Z', // expired
      is_active: true,
    };
    const supabase = mockSupabase({ data: expiredKey, error: null });
    const req = mockReq({
      headers: { authorization: 'Bearer tok_validkey12345678901234567890123456789012345678' },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await middleware(req, res, () => {});

    assert.equal(res._status, 401);
    assert.equal(res._json.error.code, 'EXPIRED_API_KEY');
  });

  it('returns 403 INSUFFICIENT_PERMISSIONS when key lacks required permission', async () => {
    const middleware = requireApiKey('write:sprints');
    const keyWithoutPermission = {
      id: 'key-uuid',
      permissions: { 'read:metrics': true },
      expires_at: null,
      is_active: true,
    };
    const supabase = mockSupabase({ data: keyWithoutPermission, error: null });
    const req = mockReq({
      headers: { authorization: 'Bearer tok_validkey12345678901234567890123456789012345678' },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await middleware(req, res, () => {});

    assert.equal(res._status, 403);
    assert.equal(res._json.error.code, 'INSUFFICIENT_PERMISSIONS');
    assert.ok(res._json.error.message.includes('write:sprints'));
  });

  it('calls next() and sets req.apiKey when key is valid with correct permission', async () => {
    const middleware = requireApiKey('read:metrics');
    const validKey = {
      id: 'key-uuid',
      permissions: { 'read:metrics': true },
      expires_at: null,
      is_active: true,
    };
    const supabase = mockSupabase({ data: validKey, error: null });
    const req = mockReq({
      headers: { authorization: 'Bearer tok_validkey12345678901234567890123456789012345678' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    let nextCalled = false;

    await middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true, 'next() should have been called');
    assert.deepEqual(req.apiKey, validKey, 'req.apiKey should be set to the key data');
    assert.equal(res._status, null, 'res.status should not have been called');
  });

  it('calls next() when no requiredPermission is specified', async () => {
    const middleware = requireApiKey(); // no permission required
    const validKey = {
      id: 'key-uuid',
      permissions: {},
      expires_at: null,
      is_active: true,
    };
    const supabase = mockSupabase({ data: validKey, error: null });
    const req = mockReq({
      headers: { authorization: 'Bearer tok_validkey12345678901234567890123456789012345678' },
      app: { locals: { supabase } },
    });
    const res = mockRes();
    let nextCalled = false;

    await middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });
});
