import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const source = path.resolve('services/utils/src/resilience/failurePolicy.ts');
const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tomato-policy-'));
execFileSync('tsc', [source, '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--outDir', buildDir], { stdio: 'ignore' });
const compiled = path.join(buildDir, 'failurePolicy.js');
const policy = await import(`file://${compiled}`);

test('classifies dependency failures as retryable and validation failures as permanent', () => {
  assert.equal(policy.classifyFailure({ code: 'ECONNRESET' }), 'retryable');
  assert.equal(policy.classifyFailure({ response: { status: 503 } }), 'retryable');
  assert.equal(policy.classifyFailure({ response: { status: 400 } }), 'permanent');
  assert.equal(policy.classifyFailure({ response: { status: 422 } }), 'permanent');
});

test('retry delay is exponential, capped, and includes deterministic jitter', () => {
  assert.equal(policy.retryDelayMs(0, { baseMs: 100, maxMs: 1000, jitterRatio: 0 }), 100);
  assert.equal(policy.retryDelayMs(3, { baseMs: 100, maxMs: 1000, jitterRatio: 0 }), 800);
  assert.equal(policy.retryDelayMs(10, { baseMs: 100, maxMs: 1000, jitterRatio: 0 }), 1000);
  const jittered = policy.retryDelayMs(1, { baseMs: 100, maxMs: 1000, jitterRatio: 0.2, random: () => 1 });
  assert.equal(jittered, 240);
});

test('retry budget routes exhausted transient failures to dead-letter handling', () => {
  assert.equal(policy.shouldRetry(0, 3, 'retryable'), true);
  assert.equal(policy.shouldRetry(2, 3, 'retryable'), true);
  assert.equal(policy.shouldRetry(3, 3, 'retryable'), false);
  assert.equal(policy.shouldRetry(0, 3, 'permanent'), false);
});

test('event deduplicator accepts first event and rejects duplicates within its retention window', () => {
  const dedupe = policy.createEventDeduplicator({ ttlMs: 10_000 });
  assert.equal(dedupe.accept('evt-1'), true);
  assert.equal(dedupe.accept('evt-1'), false);
  assert.equal(dedupe.accept('evt-2'), true);
});

test('circuit breaker opens after consecutive failures and recovers after cooldown', () => {
  let now = 0;
  const breaker = policy.createCircuitBreaker({ failureThreshold: 2, cooldownMs: 1000, now: () => now });
  assert.equal(breaker.allow(), true);
  breaker.recordFailure();
  assert.equal(breaker.allow(), true);
  breaker.recordFailure();
  assert.equal(breaker.allow(), false);
  now = 1001;
  assert.equal(breaker.allow(), true);
  breaker.recordSuccess();
  assert.equal(breaker.allow(), true);
});
