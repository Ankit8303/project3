import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const workflow = path.join(root, '.github', 'workflows', 'ci-cd.yml');

test('CI/CD workflow exists with security and release gates', () => {
  assert.ok(fs.existsSync(workflow), 'missing .github/workflows/ci-cd.yml');
  const yml = fs.readFileSync(workflow, 'utf8');
  for (const token of ['npm ci', 'npm audit', 'trivy-action', 'sbom', 'provenance', 'attest-build-provenance', 'sha-${{ github.sha }}']) {
    assert.match(yml, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${token}`);
  }
});

test('release workflow does not deploy mutable latest tags', () => {
  const yml = fs.readFileSync(workflow, 'utf8');
  assert.doesNotMatch(yml, /image:.*:latest/);
  assert.doesNotMatch(yml, /docker push .*:latest/);
});

test('production deployment is protected by an environment gate and manual dispatch', () => {
  const yml = fs.readFileSync(workflow, 'utf8');
  assert.match(yml, /environment:\s*production/);
  assert.match(yml, /workflow_dispatch:/);
});

test('workflow permissions follow least privilege and publish packages explicitly', () => {
  const yml = fs.readFileSync(workflow, 'utf8');
  assert.match(yml, /permissions:\s*\n\s+contents:\s+read/);
  assert.match(yml, /packages:\s+write/);
  assert.match(yml, /attestations:\s+write/);
  assert.match(yml, /id-token:\s+write/);
});
