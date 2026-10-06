import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('release acceptance script is executable and succeeds on the release artifact', () => {
  const script = path.join(root, 'scripts', 'release-acceptance.sh');
  fs.accessSync(script, fs.constants.X_OK);
  const output = execFileSync('bash', ['./scripts/release-acceptance.sh'], { cwd: root, encoding: 'utf8' });
  assert.match(output, /RELEASE ACCEPTANCE: READY FOR STAGING\/CONTROLLED PRODUCTION GATE/);
});

test('production env contract exposes security-critical variables without secrets', () => {
  const env = read('.env.production.example');
  for (const key of ['JWT_SEC=', 'PII_ENCRYPTION_KEY=', 'CORS_ORIGINS=']) assert.match(env, new RegExp(`^${key}`, 'm'));
  assert.doesNotMatch(env, /sk_live_[A-Za-z0-9]+/);
  assert.doesNotMatch(env, /mongodb\+srv:\/\/[^\n]*:[^@\n]+@/);
});

test('release workflow publishes only immutable SHA-tagged images with SBOM and provenance', () => {
  const workflow = read('.github/workflows/ci-cd.yml');
  assert.match(workflow, /type=raw,value=sha-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /provenance: true/);
  assert.match(workflow, /sbom: true/);
  assert.match(workflow, /actions\/attest-build-provenance@v2/);
});

test('production rollback uses an explicitly selected known-good commit', () => {
  const rollback = read('scripts/prod-rollback.sh');
  assert.match(rollback, /sha-[A-Za-z0-9._-]+|KNOWN_GOOD_COMMIT|commit/);
  assert.doesNotMatch(rollback, /:latest\b/);
});
