'use strict';

const crypto = require('crypto');

/**
 * Middleware that assigns a unique request ID to each incoming request.
 * Sets `req.requestId` and the `X-Request-Id` response header.
 */
function requestId(req, res, next) {
  req.requestId = 'req_' + crypto.randomBytes(8).toString('hex');
  res.setHeader('X-Request-Id', req.requestId);
  next();
}

module.exports = { requestId };
