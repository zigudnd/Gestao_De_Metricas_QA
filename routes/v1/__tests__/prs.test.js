'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const router = require('../prs.routes');

// ── Test helpers ────────────────────────────────────────────────────────────

const RELEASE_UUID = '00000000-0000-0000-0000-000000000001';
const PR_UUID = '00000000-0000-0000-0000-000000000002';
const SQUAD_UUID = '00000000-0000-0000-0000-000000000010';
const USER_UUID = '00000000-0000-0000-0000-000000000099';

function mockReq(overrides = {}) {
  return {
    requestId: 'req_test_prs',
    headers: { authorization: 'Bearer admin-token' },
    params: {},
    query: {},
    body: {},
    validatedParams: {},
    validatedBody: {},
    validatedQuery: {},
    caller: { id: USER_UUID },
    callerProfile: { global_role: 'admin' },
    app: { locals: { supabase: null } },
    ...overrides,
  };
}

function mockRes() {
  const res = {
    _status: null,
    _json: null,
    _sent: false,
    req: { requestId: 'req_test_prs' },
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
    send() {
      res._sent = true;
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

function mockPrRow(overrides = {}) {
  return {
    id: PR_UUID,
    release_id: RELEASE_UUID,
    pr_link: 'https://github.com/org/repo/pull/1',
    repository: 'org/repo',
    description: 'Add login feature',
    change_type: 'feature',
    squad_id: SQUAD_UUID,
    user_id: USER_UUID,
    review_status: 'pending',
    reviewed_by: null,
    reviewed_at: null,
    review_observation: null,
    created_at: '2026-04-06T00:00:00Z',
    updated_at: '2026-04-06T00:00:00Z',
    ...overrides,
  };
}

/**
 * Creates a mock supabase that returns the given release for findRelease calls,
 * and delegates insert/select/update/delete to the provided tableHandler.
 */
function mockSupabaseWithRelease(release, tableHandlers = {}) {
  return {
    from: (table) => {
      if (table === 'releases') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: release,
                error: release ? null : { message: 'not found' },
              }),
            }),
          }),
        };
      }
      if (table === 'release_prs' && tableHandlers.release_prs) {
        return tableHandlers.release_prs();
      }
      return {};
    },
  };
}

// ── POST /:releaseId/prs ────────────────────────────────────────────────────

describe('POST /releases/:releaseId/prs (create PR)', () => {
  const handler = getRouteHandler(router, 'post', '/:releaseId/prs');

  it('route handler exists', () => {
    assert.ok(handler, 'POST /:releaseId/prs handler should exist');
  });

  it('returns 503 when supabase is not configured', async () => {
    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedBody: {
        pr_link: 'https://github.com/org/repo/pull/1',
        repository: 'org/repo',
        change_type: 'feature',
      },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 503);
    assert.equal(res._json.error.code, 'SERVICE_UNAVAILABLE');
  });

  it('returns 201 with PR data on success', async () => {
    const insertedPr = mockPrRow();

    const supabase = mockSupabaseWithRelease(
      { id: RELEASE_UUID, status: 'corte', cutoff_date: '2099-12-31' },
      {
        release_prs: () => ({
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: insertedPr, error: null }),
            }),
          }),
        }),
      },
    );

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedBody: {
        pr_link: 'https://github.com/org/repo/pull/1',
        repository: 'org/repo',
        change_type: 'feature',
        description: 'Add login feature',
        squad_id: SQUAD_UUID,
      },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 201);
    assert.ok(res._json.data);
    assert.equal(res._json.data.id, PR_UUID);
    assert.equal(res._json.data.pr_link, 'https://github.com/org/repo/pull/1');
    assert.equal(res._json.data.change_type, 'feature');
  });

  it('returns 404 when release does not exist', async () => {
    const supabase = mockSupabaseWithRelease(null);

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedBody: {
        pr_link: 'https://github.com/org/repo/pull/1',
        repository: 'org/repo',
        change_type: 'feature',
      },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 404);
    assert.equal(res._json.error.code, 'NOT_FOUND');
  });

  it('returns 409 when release is not in corte status', async () => {
    const supabase = mockSupabaseWithRelease(
      { id: RELEASE_UUID, status: 'em_producao', cutoff_date: null },
    );

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedBody: {
        pr_link: 'https://github.com/org/repo/pull/1',
        repository: 'org/repo',
        change_type: 'feature',
      },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 409);
    assert.equal(res._json.error.code, 'INVALID_STATUS');
  });

  it('returns 409 when release is past cutoff date', async () => {
    const supabase = mockSupabaseWithRelease(
      { id: RELEASE_UUID, status: 'corte', cutoff_date: '2020-01-01' },
    );

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedBody: {
        pr_link: 'https://github.com/org/repo/pull/1',
        repository: 'org/repo',
        change_type: 'feature',
      },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 409);
    assert.equal(res._json.error.code, 'CUTOFF_PASSED');
  });
});

// ── GET /:releaseId/prs ─────────────────────────────────────────────────────

describe('GET /releases/:releaseId/prs (list PRs)', () => {
  const handler = getRouteHandler(router, 'get', '/:releaseId/prs');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:releaseId/prs handler should exist');
  });

  it('returns list of PRs', async () => {
    const rows = [
      { ...mockPrRow(), profiles: { email: 'dev@test.com' }, squads: { name: 'Alpha' } },
      { ...mockPrRow({ id: '00000000-0000-0000-0000-000000000003' }), profiles: { email: 'dev2@test.com' }, squads: { name: 'Alpha' } },
    ];

    const supabase = {
      from: (table) => {
        if (table === 'releases') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: RELEASE_UUID, status: 'corte', cutoff_date: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        // release_prs — both count and data queries
        return {
          select: (cols, opts) => {
            const result = (opts && opts.head)
              ? { count: 2, error: null }
              : { data: rows, error: null };
            const chain = {
              eq: () => chain,
              order: () => chain,
              range: () => chain,
              then: (cb) => Promise.resolve(result).then(cb),
              catch: () => chain,
            };
            return chain;
          },
        };
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedQuery: { page: 1, per_page: 20 },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, null); // 200 default
    assert.ok(Array.isArray(res._json.data));
    assert.equal(res._json.data.length, 2);
    assert.equal(res._json.meta.total, 2);
    assert.equal(res._json.meta.page, 1);
    // Check joined fields are mapped
    assert.equal(res._json.data[0].user_email, 'dev@test.com');
    assert.equal(res._json.data[0].squad_name, 'Alpha');
  });

  it('filters by squad_id', async () => {
    let capturedFilters = {};

    const supabase = {
      from: (table) => {
        if (table === 'releases') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: RELEASE_UUID, status: 'corte', cutoff_date: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: (cols, opts) => {
            const chain = {
              eq: (field, value) => { capturedFilters[field] = value; return chain; },
              order: () => chain,
              range: () => chain,
            };
            if (opts && opts.head) {
              return { ...chain, then: (cb) => cb({ count: 0, error: null }), catch: () => {} };
            }
            return { ...chain, then: (cb) => cb({ data: [], error: null }), catch: () => {} };
          },
        };
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedQuery: { page: 1, per_page: 20, squad_id: SQUAD_UUID },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(capturedFilters.squad_id, SQUAD_UUID);
  });

  it('filters by review_status', async () => {
    let capturedFilters = {};

    const supabase = {
      from: (table) => {
        if (table === 'releases') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: RELEASE_UUID, status: 'corte', cutoff_date: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: (cols, opts) => {
            const chain = {
              eq: (field, value) => { capturedFilters[field] = value; return chain; },
              order: () => chain,
              range: () => chain,
            };
            if (opts && opts.head) {
              return { ...chain, then: (cb) => cb({ count: 0, error: null }), catch: () => {} };
            }
            return { ...chain, then: (cb) => cb({ data: [], error: null }), catch: () => {} };
          },
        };
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedQuery: { page: 1, per_page: 20, review_status: 'approved' },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(capturedFilters.review_status, 'approved');
  });

  it('returns empty array when no PRs exist', async () => {
    const supabase = {
      from: (table) => {
        if (table === 'releases') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: RELEASE_UUID, status: 'corte', cutoff_date: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {
          select: (cols, opts) => {
            const chain = {
              eq: () => chain,
              order: () => chain,
              range: () => chain,
            };
            if (opts && opts.head) {
              return { ...chain, then: (cb) => cb({ count: 0, error: null }), catch: () => {} };
            }
            return { ...chain, then: (cb) => cb({ data: [], error: null }), catch: () => {} };
          },
        };
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      validatedQuery: { page: 1, per_page: 20 },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, null); // 200 default
    assert.ok(Array.isArray(res._json.data));
    assert.equal(res._json.data.length, 0);
    assert.equal(res._json.meta.total, 0);
  });
});

// ── PATCH /:releaseId/prs/:prId/review ──────────────────────────────────────

describe('PATCH /releases/:releaseId/prs/:prId/review (review PR)', () => {
  const handler = getRouteHandler(router, 'patch', '/:releaseId/prs/:prId/review');

  it('route handler exists', () => {
    assert.ok(handler, 'PATCH /:releaseId/prs/:prId/review handler should exist');
  });

  it('returns 200 with updated status on approve', async () => {
    const updatedPr = mockPrRow({
      review_status: 'approved',
      reviewed_by: USER_UUID,
      reviewed_at: '2026-04-06T12:00:00Z',
    });

    const supabase = {
      from: (table) => {
        if (table === 'release_prs') {
          return {
            select: () => ({
              eq: function (field, value) {
                return {
                  eq: () => ({
                    single: () => Promise.resolve({ data: { id: PR_UUID }, error: null }),
                  }),
                  single: () => Promise.resolve({ data: { id: PR_UUID }, error: null }),
                };
              },
            }),
            update: () => ({
              eq: function () {
                return {
                  eq: () => ({
                    select: () => ({
                      single: () => Promise.resolve({ data: updatedPr, error: null }),
                    }),
                  }),
                };
              },
            }),
          };
        }
        return {};
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID, prId: PR_UUID },
      validatedBody: { status: 'approved' },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, null); // 200 default via success()
    assert.ok(res._json.data);
    assert.equal(res._json.data.review_status, 'approved');
    assert.equal(res._json.data.reviewed_by, USER_UUID);
  });

  it('returns 200 with updated status on reject (with observation)', async () => {
    const updatedPr = mockPrRow({
      review_status: 'rejected',
      reviewed_by: USER_UUID,
      reviewed_at: '2026-04-06T12:00:00Z',
      review_observation: 'Missing tests for edge cases',
    });

    const supabase = {
      from: (table) => {
        if (table === 'release_prs') {
          return {
            select: () => ({
              eq: function () {
                return {
                  eq: () => ({
                    single: () => Promise.resolve({ data: { id: PR_UUID }, error: null }),
                  }),
                };
              },
            }),
            update: () => ({
              eq: function () {
                return {
                  eq: () => ({
                    select: () => ({
                      single: () => Promise.resolve({ data: updatedPr, error: null }),
                    }),
                  }),
                };
              },
            }),
          };
        }
        return {};
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID, prId: PR_UUID },
      validatedBody: { status: 'rejected', review_observation: 'Missing tests for edge cases' },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, null); // 200 default
    assert.ok(res._json.data);
    assert.equal(res._json.data.review_status, 'rejected');
    assert.equal(res._json.data.review_observation, 'Missing tests for edge cases');
  });

  it('returns 404 for non-existent PR', async () => {
    const supabase = {
      from: (table) => {
        if (table === 'release_prs') {
          return {
            select: () => ({
              eq: function () {
                return {
                  eq: () => ({
                    single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
                  }),
                };
              },
            }),
          };
        }
        return {};
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID, prId: PR_UUID },
      validatedBody: { status: 'approved' },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 404);
    assert.equal(res._json.error.code, 'NOT_FOUND');
  });
});

// ── DELETE /:releaseId/prs/:prId ────────────────────────────────────────────

describe('DELETE /releases/:releaseId/prs/:prId (remove PR)', () => {
  const handler = getRouteHandler(router, 'delete', '/:releaseId/prs/:prId');

  it('route handler exists', () => {
    assert.ok(handler, 'DELETE /:releaseId/prs/:prId handler should exist');
  });

  it('returns 204 on success', async () => {
    const supabase = {
      from: (table) => {
        if (table === 'release_prs') {
          return {
            delete: () => ({
              eq: function () {
                return {
                  eq: () => ({
                    select: () => ({
                      single: () => Promise.resolve({ data: { id: PR_UUID }, error: null }),
                    }),
                  }),
                };
              },
            }),
          };
        }
        return {};
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID, prId: PR_UUID },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 204);
    assert.equal(res._sent, true);
  });

  it('returns 404 for non-existent PR', async () => {
    const supabase = {
      from: (table) => {
        if (table === 'release_prs') {
          return {
            delete: () => ({
              eq: function () {
                return {
                  eq: () => ({
                    select: () => ({
                      single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
                    }),
                  }),
                };
              },
            }),
          };
        }
        return {};
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID, prId: PR_UUID },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, 404);
    assert.equal(res._json.error.code, 'NOT_FOUND');
  });
});

// ── GET /:releaseId/squads-summary ──────────────────────────────────────────

describe('GET /releases/:releaseId/squads-summary', () => {
  const handler = getRouteHandler(router, 'get', '/:releaseId/squads-summary');

  it('route handler exists', () => {
    assert.ok(handler, 'GET /:releaseId/squads-summary handler should exist');
  });

  it('returns aggregated squad data', async () => {
    const prs = [
      { squad_id: SQUAD_UUID, review_status: 'approved', change_type: 'feature', squads: { name: 'Alpha' } },
      { squad_id: SQUAD_UUID, review_status: 'pending', change_type: 'fix', squads: { name: 'Alpha' } },
      { squad_id: SQUAD_UUID, review_status: 'rejected', change_type: 'refactor', squads: { name: 'Alpha' } },
      { squad_id: '00000000-0000-0000-0000-000000000020', review_status: 'pending', change_type: 'docs', squads: { name: 'Beta' } },
    ];

    const supabase = {
      from: (table) => {
        if (table === 'releases') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: RELEASE_UUID, status: 'corte', cutoff_date: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'release_prs') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: prs, error: null }),
            }),
          };
        }
        return {};
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, null); // 200 default
    assert.ok(Array.isArray(res._json.data));
    assert.equal(res._json.data.length, 2);

    // Sorted by total_prs descending: Alpha (3) first, Beta (1) second
    const alpha = res._json.data[0];
    assert.equal(alpha.squad_name, 'Alpha');
    assert.equal(alpha.total_prs, 3);
    assert.equal(alpha.approved, 1);
    assert.equal(alpha.pending, 1);
    assert.equal(alpha.rejected, 1);
    assert.equal(alpha.has_tests, true); // feature + bugfix

    const beta = res._json.data[1];
    assert.equal(beta.squad_name, 'Beta');
    assert.equal(beta.total_prs, 1);
    assert.equal(beta.pending, 1);
    assert.equal(beta.has_tests, false); // docs only
  });

  it('returns empty array when no PRs', async () => {
    const supabase = {
      from: (table) => {
        if (table === 'releases') {
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: { id: RELEASE_UUID, status: 'corte', cutoff_date: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'release_prs') {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        return {};
      },
    };

    const req = mockReq({
      validatedParams: { releaseId: RELEASE_UUID },
      app: { locals: { supabase } },
    });
    const res = mockRes();

    await handler(req, res);

    assert.equal(res._status, null); // 200 default
    assert.ok(Array.isArray(res._json.data));
    assert.equal(res._json.data.length, 0);
  });
});
