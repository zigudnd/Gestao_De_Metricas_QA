'use strict';

const rateLimit = require('express-rate-limit');

// SEC: M-03 — Use caller ID when available, fallback to IP (with IPv6 normalization).
const keyGenerator = (req) => {
  if (req.caller?.id) return req.caller.id;
  if (req.apiKey?.id) return req.apiKey.id;
  // Normalize IPv6 to avoid bypass
  const ip = req.ip || '127.0.0.1';
  return ip.replace(/^::ffff:/, '');
};

const noIpValidation = { ip: false, trustProxy: false, xForwardedForHeader: false, default: false };
const generalLimiter = rateLimit({ windowMs: 60_000, max: 100, keyGenerator, validate: noIpValidation });
const adminLimiter = rateLimit({ windowMs: 60_000, max: 10, keyGenerator, validate: noIpValidation });
const flushLimiter = rateLimit({ windowMs: 60_000, max: 30, keyGenerator, validate: noIpValidation });

module.exports = { generalLimiter, adminLimiter, flushLimiter };
