'use strict';

const rateLimit = require('express-rate-limit');

const generalLimiter = rateLimit({ windowMs: 60_000, max: 100 });
const adminLimiter = rateLimit({ windowMs: 60_000, max: 10 });
const flushLimiter = rateLimit({ windowMs: 60_000, max: 30 });

module.exports = { generalLimiter, adminLimiter, flushLimiter };
