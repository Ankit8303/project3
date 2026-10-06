import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');

test('failure engineering is a required CI gate', () => {
  const workflow = fs.readFileSync(path.join(root, '.github', 'workflows', 'ci-cd.yml'), 'utf8');
  assert.match(workflow, /phase16-failure-engineering\.test\.mjs/);
  assert.match(workflow, /experimental-strip-types/);
});

test('resilience policy is production source code, not only a test fixture', () => {
  const file = path.join(root, 'services', 'utils', 'src', 'resilience', 'failurePolicy.ts');
  assert.ok(fs.existsSync(file));
  const source = fs.readFileSync(file, 'utf8');
  for (const symbol of ['classifyFailure', 'retryDelayMs', 'shouldRetry', 'createEventDeduplicator', 'createCircuitBreaker']) {
    assert.match(source, new RegExp(`export function ${symbol}`));
  }
});
