'use strict';

const crypto = require('crypto');

/**
 * Generate a new API key with its hash and display prefix.
 * The raw key starts with 'tok_' followed by 48 base64url characters.
 * @returns {{ raw: string, hash: string, prefix: string }}
 */
function generateApiKey() {
  const raw = 'tok_' + crypto.randomBytes(36).toString('base64url').slice(0, 48);
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 12) + '...';
  return { raw, hash, prefix };
}

/**
 * Hash a raw API key using SHA-256.
 * @param {string} raw - The raw API key string
 * @returns {string} Hex-encoded SHA-256 hash
 */
function hashApiKey(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = { generateApiKey, hashApiKey };
