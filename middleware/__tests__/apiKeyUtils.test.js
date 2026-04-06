'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateApiKey, hashApiKey } = require('../apiKeyUtils');

describe('generateApiKey', () => {
  it('returns an object with raw, hash, and prefix', () => {
    const result = generateApiKey();
    assert.ok(result.raw, 'raw should be defined');
    assert.ok(result.hash, 'hash should be defined');
    assert.ok(result.prefix, 'prefix should be defined');
  });

  it('raw starts with tok_', () => {
    const { raw } = generateApiKey();
    assert.ok(raw.startsWith('tok_'), `Expected raw to start with "tok_", got "${raw.slice(0, 10)}"`);
  });

  it('raw length is 52 (4 prefix + 48 random)', () => {
    const { raw } = generateApiKey();
    assert.equal(raw.length, 52, `Expected raw length 52, got ${raw.length}`);
  });

  it('hash is a 64-character hex string', () => {
    const { hash } = generateApiKey();
    assert.equal(hash.length, 64, `Expected hash length 64, got ${hash.length}`);
    assert.match(hash, /^[0-9a-f]{64}$/, 'hash should be lowercase hex');
  });

  it('prefix ends with "..."', () => {
    const { prefix } = generateApiKey();
    assert.ok(prefix.endsWith('...'), `Expected prefix to end with "...", got "${prefix}"`);
  });

  it('prefix is first 12 chars of raw + "..."', () => {
    const { raw, prefix } = generateApiKey();
    assert.equal(prefix, raw.slice(0, 12) + '...');
  });
});

describe('hashApiKey', () => {
  it('hashApiKey(raw) matches the hash from generateApiKey', () => {
    const { raw, hash } = generateApiKey();
    const computed = hashApiKey(raw);
    assert.equal(computed, hash, 'hashApiKey(raw) should equal the generated hash');
  });

  it('returns a 64-character hex string', () => {
    const result = hashApiKey('tok_test123');
    assert.equal(result.length, 64);
    assert.match(result, /^[0-9a-f]{64}$/);
  });
});

describe('generateApiKey uniqueness', () => {
  it('two calls generate different keys', () => {
    const a = generateApiKey();
    const b = generateApiKey();
    assert.notEqual(a.raw, b.raw, 'Two generated keys should differ');
    assert.notEqual(a.hash, b.hash, 'Two generated hashes should differ');
  });
});
