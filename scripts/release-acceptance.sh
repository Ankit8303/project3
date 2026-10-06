#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
errors=0
check() {
  local label="$1"; shift
  if "$@"; then
    printf 'PASS  %s\n' "$label"
  else
    printf 'FAIL  %s\n' "$label"
    errors=$((errors + 1))
  fi
}

check_file() { test -f "$ROOT/$1"; }
check_nonempty_env_example() {
  local f="$ROOT/.env.production.example"
  test -s "$f" && grep -q '^JWT_SEC=' "$f" && grep -q '^PII_ENCRYPTION_KEY=' "$f" && grep -q '^CORS_ORIGINS=' "$f"
}
check_compose_policy() {
  local f="$ROOT/docker-compose.production.yml"
  grep -q 'read_only: true' "$f" && grep -q 'no-new-privileges:true' "$f" && grep -q 'cap_drop:' "$f" && grep -q 'restart: unless-stopped' "$f"
}
check_workflow_policy() {
  local f="$ROOT/.github/workflows/ci-cd.yml"
  grep -q 'actions/attest-build-provenance@v2' "$f" && grep -q 'provenance: true' "$f" && grep -q 'sbom: true' "$f" && grep -q 'type=raw,value=sha-${{ github.sha }}' "$f"
}

check 'production deployment runbook exists' check_file docs/runbooks/production-deployment.md
check 'final audit runbook exists' check_file docs/runbooks/final-production-audit.md
check 'production rollback exists' check_file scripts/prod-rollback.sh
check 'production preflight exists' check_file scripts/prod-preflight.sh
check 'production environment contract exists' check_file .env.production.example
check 'production environment contract has required security settings' check_nonempty_env_example
check 'runtime least-privilege policy exists' check_compose_policy
check 'CI provenance/SBOM/immutable-tag policy exists' check_workflow_policy
check 'final audit test exists' check_file tests/phase19-final-audit.test.mjs

if (( errors > 0 )); then
  printf '\nRELEASE ACCEPTANCE: NO-GO (%d failed checks)\n' "$errors"
  exit 1
fi
printf '\nRELEASE ACCEPTANCE: READY FOR STAGING/CONTROLLED PRODUCTION GATE\n'
