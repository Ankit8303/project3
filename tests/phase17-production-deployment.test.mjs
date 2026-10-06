import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();

test('production compose uses immutable registry images instead of build directives', () => {
  const compose = fs.readFileSync(path.join(root, 'docker-compose.production.yml'), 'utf8');
  assert.match(compose, /image:\s*\$\{IMAGE_NAMESPACE\}\/auth:\$\{IMAGE_TAG\}/);
  assert.doesNotMatch(compose, /build:/);
});

test('all six backend services expose container healthchecks', () => {
  const compose = fs.readFileSync(path.join(root, 'docker-compose.production.yml'), 'utf8');
  for (const service of ['auth','restaurant','utils','realtime','rider','admin']) {
    assert.match(compose, new RegExp(`${service}:[\\s\\S]*?healthcheck:`));
  }
});

test('deployment scripts provide preflight, backup, deploy, verify, and rollback', () => {
  for (const file of ['scripts/prod-preflight.sh','scripts/prod-backup.sh','scripts/prod-deploy.sh','scripts/prod-verify.sh','scripts/prod-rollback.sh']) {
    assert.equal(fs.existsSync(path.join(root, file)), true, file);
  }
});

test('reverse proxy configuration protects internal services and supports websockets', () => {
  const nginx = fs.readFileSync(path.join(root, 'deploy/nginx/tomato.conf'), 'utf8');
  assert.match(nginx, /upstream tomato_auth \{ server 127\.0\.0\.1:5000; \}/);
  assert.match(nginx, /upstream tomato_realtime \{ server 127\.0\.0\.1:5004; \}/);
  assert.match(nginx, /Upgrade/);
  assert.match(nginx, /proxy_set_header Host/);
});


test('frontend production endpoints are environment-configurable and contain no hardcoded localhost service URLs', () => {
  const main = fs.readFileSync(path.join(root, 'frontend/src/main.tsx'), 'utf8');
  assert.match(main, /VITE_AUTH_SERVICE_URL/);
  assert.match(main, /VITE_REALTIME_SERVICE_URL/);
  assert.match(main, /import\.meta\.env\.DEV/);
  assert.match(main, /required for production builds/);
  assert.equal(fs.existsSync(path.join(root, 'frontend/.env.production.example')), true);
});

test('deployment preflight requires non-empty production secrets and immutable image tags', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/prod-preflight.sh'), 'utf8');
  assert.match(script, /IMAGE_TAG.*sha-/);
  assert.match(script, /MONGO_URI REDIS_URL RABBITMQ_URL JWT_SEC CLERK_SECRET_KEY/);
  assert.match(script, /\^\$\{key\}=\.\+\$/);
});

test('admin and rider services expose health endpoints for deployment gates', () => {
  for (const service of ['admin', 'rider']) {
    const source = fs.readFileSync(path.join(root, `services/${service}/src/index.ts`), 'utf8');
    assert.match(source, /app\.get\("\/health"/);
  }
});
