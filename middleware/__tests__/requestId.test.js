'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { requestId } = require('../requestId');

describe('requestId middleware', () => {
  function mockReq() {
    return {};
  }

  function mockRes() {
    const headers = {};
    return {
      setHeader(key, value) { headers[key] = value; },
      _headers: headers,
    };
  }

  it('sets req.requestId starting with "req_"', () => {
    const req = mockReq();
    const res = mockRes();
    let nextCalled = false;

    requestId(req, res, () => { nextCalled = true; });

    assert.ok(req.requestId.startsWith('req_'), `Expected req.requestId to start with "req_", got "${req.requestId}"`);
    assert.equal(nextCalled, true);
  });

  it('sets X-Request-Id response header', () => {
    const req = mockReq();
    const res = mockRes();

    requestId(req, res, () => {});

    assert.equal(res._headers['X-Request-Id'], req.requestId);
  });

  it('generates unique IDs on each call', () => {
    const req1 = mockReq();
    const req2 = mockReq();
    const res1 = mockRes();
    const res2 = mockRes();

    requestId(req1, res1, () => {});
    requestId(req2, res2, () => {});

    assert.notEqual(req1.requestId, req2.requestId);
  });

  it('requestId has expected format (req_ + 16 hex chars)', () => {
    const req = mockReq();
    const res = mockRes();

    requestId(req, res, () => {});

    assert.match(req.requestId, /^req_[0-9a-f]{16}$/);
  });
});
