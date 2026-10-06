import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const services = ['auth','admin','rider','utils','restaurant','realtime'];

test('all public HTTP services reject wildcard CORS and use explicit origins', () => {
  for (const service of services) {
    const source = fs.readFileSync(path.join(root, 'services', service, 'src', 'index.ts'), 'utf8');
    assert.doesNotMatch(source, /app\.use\(cors\(\)\)\)/, `${service} still enables wildcard CORS`);
    const cors = fs.readFileSync(path.join(root, 'services', service, 'src', 'security', 'cors.ts'), 'utf8');
    assert.match(cors, /CORS_ORIGINS/, `${service} must derive CORS from CORS_ORIGINS`);
  }
});

test('restaurant cache status is protected by internal service authentication', () => {
  const source = fs.readFileSync(path.join(root, 'services/restaurant/src/index.ts'), 'utf8');
  assert.match(source, /requireInternalService/);
  assert.match(source, /cache\/status.*requireInternalService/s);
});

test('production environment documents the runtime JWT variable actually consumed by services', () => {
  const env = fs.readFileSync(path.join(root, '.env.production.example'), 'utf8');
  assert.match(env, /^JWT_SEC=/m);
  assert.doesNotMatch(env, /^JWT_SECRET=/m);
});

test('production preflight validates the same JWT and CORS variables used by runtime', () => {
  const script = fs.readFileSync(path.join(root, 'scripts/prod-preflight.sh'), 'utf8');
  assert.match(script, /JWT_SEC/);
  assert.doesNotMatch(script, /JWT_SECRET/);
  assert.match(script, /CORS_ORIGINS/);
});

test('frontend does not persist the application JWT in localStorage', () => {
  const sourceFiles = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(full);
    }
  };
  walk(path.join(root, 'frontend/src'));
  const combined = sourceFiles.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  assert.doesNotMatch(combined, /localStorage\.(getItem|setItem|removeItem)\(['"]token['"]\)/);
});
