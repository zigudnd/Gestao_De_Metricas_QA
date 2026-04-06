'use strict';

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { requireAdminAuth } = require('../requireAuth');

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return res;
}

function makeReq(headers = {}, locals = {}) {
  return {
    headers,
    app: { locals },
  };
}

function makeSupabaseMock({ authUser, authError, profile, profileError } = {}) {
  return {
    auth: {
      getUser: async () => ({
        data: { user: authUser ?? null },
        error: authError ?? null,
      }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: profile ?? null,
            error: profileError ?? null,
          }),
        }),
      }),
    }),
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('requireAdminAuth', () => {
  it('returns 503 when supabase is not configured', async () => {
    const req = makeReq({}, { supabase: null });
    const res = makeRes();

    await requireAdminAuth(req, res, () => {});

    assert.equal(res._status, 503);
    assert.match(res._json.error, /Supabase/);
  });

  it('returns 401 when authorization header is missing', async () => {
    const req = makeReq({}, { supabase: makeSupabaseMock() });
    const res = makeRes();

    await requireAdminAuth(req, res, () => {});

    assert.equal(res._status, 401);
    assert.match(res._json.error, /Token de autenticação/);
  });

  it('returns 401 when authorization header has wrong format', async () => {
    const req = makeReq({ authorization: 'Basic abc' }, { supabase: makeSupabaseMock() });
    const res = makeRes();

    await requireAdminAuth(req, res, () => {});

    assert.equal(res._status, 401);
  });

  it('returns 401 when token is invalid', async () => {
    const supabase = makeSupabaseMock({ authError: new Error('invalid') });
    const req = makeReq({ authorization: 'Bearer bad-token' }, { supabase });
    const res = makeRes();

    await requireAdminAuth(req, res, () => {});

    assert.equal(res._status, 401);
    assert.match(res._json.error, /inválido|expirado/);
  });

  it('returns 403 when user role is not admin or gerente', async () => {
    const supabase = makeSupabaseMock({
      authUser: { id: 'user-1' },
      profile: { global_role: 'user' },
    });
    const req = makeReq({ authorization: 'Bearer valid-token' }, { supabase });
    const res = makeRes();

    await requireAdminAuth(req, res, () => {});

    assert.equal(res._status, 403);
    assert.match(res._json.error, /administradores/);
  });

  it('calls next() and attaches caller for admin role', async () => {
    const user = { id: 'admin-1' };
    const profile = { global_role: 'admin' };
    const supabase = makeSupabaseMock({ authUser: user, profile });
    const req = makeReq({ authorization: 'Bearer valid-token' }, { supabase });
    const res = makeRes();
    let nextCalled = false;

    await requireAdminAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.caller, user);
    assert.deepEqual(req.callerProfile, profile);
  });

  it('calls next() for gerente role', async () => {
    const user = { id: 'gerente-1' };
    const profile = { global_role: 'gerente' };
    const supabase = makeSupabaseMock({ authUser: user, profile });
    const req = makeReq({ authorization: 'Bearer valid-token' }, { supabase });
    const res = makeRes();
    let nextCalled = false;

    await requireAdminAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });

  it('returns 500 when profile lookup fails', async () => {
    const supabase = makeSupabaseMock({
      authUser: { id: 'user-1' },
      profileError: new Error('db down'),
    });
    const req = makeReq({ authorization: 'Bearer valid-token' }, { supabase });
    const res = makeRes();

    await requireAdminAuth(req, res, () => {});

    assert.equal(res._status, 500);
  });
});
