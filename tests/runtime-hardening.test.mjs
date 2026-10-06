import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const services = ['auth','restaurant','utils','realtime','rider','admin'];

for (const service of services) {
  test(`${service} runtime image uses a non-root user and healthcheck`, () => {
    const dockerfile = fs.readFileSync(path.join(root, 'services', service, 'Dockerfile'), 'utf8');
    assert.match(dockerfile, /^USER\s+\S+/m, 'Dockerfile must declare a non-root USER');
    assert.match(dockerfile, /^HEALTHCHECK\s+/m, 'Dockerfile must declare a HEALTHCHECK');
    assert.doesNotMatch(dockerfile, /npm install\s*$/m, 'production image must not run an unbounded npm install');
  });
}

test('production compose applies least privilege and resource controls', () => {
  const compose = fs.readFileSync(path.join(root, 'docker-compose.production.yml'), 'utf8');
  for (const token of ['read_only: true','cap_drop:','no-new-privileges:true','mem_limit:','cpus:','restart: unless-stopped']) {
    assert.match(compose, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${token}`);
  }
});

test('utils production mode does not create a writable uploads directory', () => {
  const source = fs.readFileSync(path.join(root, 'services', 'utils', 'src', 'index.ts'), 'utf8');
  assert.match(source, /ALLOW_LOCAL_UPLOADS/);
  assert.match(source, /if \(process\.env\.NODE_ENV !== "production" && process\.env\.ALLOW_LOCAL_UPLOADS === "true"\)/);
  assert.match(source, /mkdirSync\(uploadsDir/);
  assert.match(source, /if \(process\.env\.NODE_ENV !== "production" && process\.env\.ALLOW_LOCAL_UPLOADS === "true"\)\s*\{[\s\S]*?mkdirSync\(uploadsDir/);
});
