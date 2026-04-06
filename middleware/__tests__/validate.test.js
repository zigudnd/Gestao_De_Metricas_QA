'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateBody,
  createUserSchema,
  resetPasswordSchema,
  dashboardPayloadSchema,
} = require('../validate');

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(body) {
  return { body };
}

function makeRes() {
  const res = {
    _status: null,
    _json: null,
    status(code) { res._status = code; return res; },
    json(body) { res._json = body; return res; },
  };
  return res;
}

// ── validateBody generic behavior ───────────────────────────────────────────

describe('validateBody', () => {
  it('calls next() and sets req.validatedBody on valid input', () => {
    const middleware = validateBody(createUserSchema);
    const req = makeReq({ email: 'a@b.com', display_name: 'Test' });
    const res = makeRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.validatedBody.email, 'a@b.com');
    assert.equal(req.validatedBody.display_name, 'Test');
  });

  it('returns 400 with details on invalid input', () => {
    const middleware = validateBody(createUserSchema);
    const req = makeReq({ email: 'not-an-email' }); // missing display_name
    const res = makeRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
    assert.equal(res._json.error, 'Dados inválidos');
    assert.ok(Array.isArray(res._json.details));
    assert.ok(res._json.details.length > 0);
  });
});

// ── createUserSchema ────────────────────────────────────────────────────────

describe('createUserSchema', () => {
  it('accepts valid input with optional global_role', () => {
    const result = createUserSchema.safeParse({
      email: 'qa@test.com',
      display_name: 'QA User',
      global_role: 'gerente',
    });
    assert.equal(result.success, true);
  });

  it('rejects invalid email', () => {
    const result = createUserSchema.safeParse({
      email: 'invalid',
      display_name: 'QA',
    });
    assert.equal(result.success, false);
  });

  it('rejects empty display_name', () => {
    const result = createUserSchema.safeParse({
      email: 'a@b.com',
      display_name: '',
    });
    assert.equal(result.success, false);
  });

  it('rejects invalid global_role enum value', () => {
    const result = createUserSchema.safeParse({
      email: 'a@b.com',
      display_name: 'Test',
      global_role: 'superadmin',
    });
    assert.equal(result.success, false);
  });
});

// ── resetPasswordSchema ─────────────────────────────────────────────────────

describe('resetPasswordSchema', () => {
  it('accepts valid UUID', () => {
    const result = resetPasswordSchema.safeParse({
      user_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    assert.equal(result.success, true);
  });

  it('rejects non-UUID string', () => {
    const result = resetPasswordSchema.safeParse({
      user_id: 'not-a-uuid',
    });
    assert.equal(result.success, false);
  });
});

// ── dashboardPayloadSchema (via validateBody middleware) ─────────────────────

describe('dashboardPayloadSchema via validateBody', () => {
  it('accepts valid object payload and sets validatedBody', () => {
    const middleware = validateBody(dashboardPayloadSchema);
    const req = makeReq({ payload: { sprints: [], bugs: 5 } });
    const res = makeRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.deepEqual(req.validatedBody.payload, { sprints: [], bugs: 5 });
  });

  it('rejects array payload with 400', () => {
    const middleware = validateBody(dashboardPayloadSchema);
    const req = makeReq({ payload: [1, 2, 3] });
    const res = makeRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });

  it('rejects missing payload with 400', () => {
    const middleware = validateBody(dashboardPayloadSchema);
    const req = makeReq({});
    const res = makeRes();
    let nextCalled = false;

    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res._status, 400);
  });
});
