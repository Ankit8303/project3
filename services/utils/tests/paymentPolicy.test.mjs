import assert from 'node:assert/strict';
import test from 'node:test';
import { getPaymentMode, parseDemoSession, amountsMatch } from '../dist/controllers/paymentPolicy.js';

test('payment mode defaults to Stripe and only explicit demo enables simulation', () => {
  assert.equal(getPaymentMode(undefined), 'stripe');
  assert.equal(getPaymentMode('stripe'), 'stripe');
  assert.equal(getPaymentMode('demo'), 'demo');
  assert.equal(getPaymentMode('anything-else'), 'stripe');
});

test('demo sessions must contain a real ObjectId and nonce', () => {
  assert.equal(parseDemoSession('demo_session_507f1f77bcf86cd799439011_abc123'), '507f1f77bcf86cd799439011');
  assert.equal(parseDemoSession('demo_session_507f1f77bcf86cd799439011'), null);
  assert.equal(parseDemoSession('demo_session_not-an-order_abc123'), null);
});

test('payment amount and currency must match the server-side order', () => {
  assert.equal(amountsMatch(499.99, 49999, 'INR'), true);
  assert.equal(amountsMatch(499.99, 49998, 'INR'), false);
  assert.equal(amountsMatch(499.99, 49999, 'USD'), false);
});
