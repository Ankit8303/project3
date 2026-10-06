import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidSocketUser,
  isValidOrderId,
  normalizeLocationUpdate,
  normalizeChatMessage,
  createEventRateLimiter,
} from '../dist/policy.js';

test('rejects socket identities with missing or privileged role data', () => {
  assert.equal(isValidSocketUser({ _id: 'user-1', name: 'A', role: 'customer' }), true);
  assert.equal(isValidSocketUser({ _id: '', name: 'A', role: 'customer' }), false);
  assert.equal(isValidSocketUser({ _id: 'u', name: 'A', role: 'admin' }), false);
  assert.equal(isValidSocketUser({ _id: 'u', name: 'A', role: null }), false);
});

test('accepts only Mongo ObjectId order identifiers', () => {
  assert.equal(isValidOrderId('507f1f77bcf86cd799439011'), true);
  assert.equal(isValidOrderId('order-1'), false);
  assert.equal(isValidOrderId(''), false);
});

test('rejects invalid or out-of-range rider coordinates', () => {
  assert.deepEqual(normalizeLocationUpdate({ orderId: '507f1f77bcf86cd799439011', latitude: 28.6, longitude: 77.2 }), {
    orderId: '507f1f77bcf86cd799439011', latitude: 28.6, longitude: 77.2,
  });
  assert.equal(normalizeLocationUpdate({ orderId: '507f1f77bcf86cd799439011', latitude: 91, longitude: 77 }), null);
  assert.equal(normalizeLocationUpdate({ orderId: '507f1f77bcf86cd799439011', latitude: 28, longitude: 181 }), null);
});

test('normalizes chat messages and enforces size', () => {
  assert.deepEqual(normalizeChatMessage({ orderId: '507f1f77bcf86cd799439011', message: '  hello  ' }), {
    orderId: '507f1f77bcf86cd799439011', message: 'hello',
  });
  assert.equal(normalizeChatMessage({ orderId: '507f1f77bcf86cd799439011', message: 'x'.repeat(2001) }), null);
});

test('rate limiter rejects bursts and recovers after the window', () => {
  let now = 1000;
  const limit = createEventRateLimiter({ maxEvents: 2, windowMs: 1000, now: () => now });
  assert.equal(limit.allow(), true);
  assert.equal(limit.allow(), true);
  assert.equal(limit.allow(), false);
  now += 1001;
  assert.equal(limit.allow(), true);
});
