import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();

function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }

test('order history queries have compound indexes matching filter and sort patterns', () => {
  const src = read('services/restaurant/src/models/Order.ts');
  assert.match(src, /OrderSchema\.index\(\{ userId: 1, paymentStatus: 1, createdAt: -1 \}\)/);
  assert.match(src, /OrderSchema\.index\(\{ restaurantId: 1, paymentStatus: 1, createdAt: -1 \}\)/);
  assert.match(src, /OrderSchema\.index\(\{ status: 1, paymentStatus: 1, riderId: 1, createdAt: -1 \}\)/);
});

test('rider discovery has a compound geospatial index matching availability filters', () => {
  const src = read('services/rider/src/model/Rider.ts');
  assert.match(src, /schema\.index\(\{ isAvailble: 1, isVerified: 1, location: "2dsphere" \}\)/);
});

test('performance test suite defines realistic API thresholds and staged load', () => {
  const script = read('performance/k6-critical-paths.js');
  assert.match(script, /target:\s*10/);
  assert.match(script, /target:\s*50/);
  assert.match(script, /target:\s*100/);
  assert.match(script, /http_req_duration:[\s\S]*p\(95\)<500/);
  assert.match(script, /http_req_failed:[\s\S]*rate<0\.01/);
});

test('performance harness never embeds production credentials', () => {
  const script = read('performance/k6-critical-paths.js');
  assert.doesNotMatch(script, /(sk_live_|JWT_SECRET=|password\s*[:=])/i);
  assert.match(script, /__ENV\./);
});

test('performance runbook separates smoke, load, and stress tests', () => {
  const runbook = read('docs/runbooks/performance-testing.md');
  assert.match(runbook, /smoke/i);
  assert.match(runbook, /load/i);
  assert.match(runbook, /stress/i);
  assert.match(runbook, /staging/i);
  assert.match(runbook, /never.*production|production.*never/i);
});
