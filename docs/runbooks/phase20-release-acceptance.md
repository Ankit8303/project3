# Phase 20 — Release Acceptance Runbook

## 1. Source acceptance

- Run `bash scripts/release-acceptance.sh`.
- Run the complete repository regression/security suite.
- Verify no secret-bearing files are included in the release artifact.

## 2. CI/CD acceptance

- Confirm all required GitHub checks are green.
- Confirm the release images use the commit SHA tag.
- Verify SBOM and build provenance were attached.
- Verify GitHub artifact provenance/attestation for every published image.

## 3. Staging acceptance

- Pull the exact immutable image manifest.
- Run production Compose in staging.
- Verify all six service health endpoints.
- Verify Nginx TLS and WebSocket behavior.
- Execute the k6 smoke/load profile.
- Inspect p95/p99/error budgets.
- Exercise MongoDB, Redis, and RabbitMQ failure/recovery drills.
- Perform a MongoDB backup and restore drill.
- Verify Stripe webhook processing with test-mode credentials.

## 4. Production acceptance

- Obtain required production environment approval.
- Execute `scripts/prod-preflight.sh`.
- Capture a backup before deployment.
- Deploy the exact immutable release manifest.
- Run `scripts/prod-verify.sh`.
- Confirm logs, metrics, RabbitMQ backlog, Redis health, and MongoDB health.
- Keep the previous known-good release manifest available for rollback.

## 5. GO / NO-GO

GO only if all mandatory checks pass. Any critical security finding, failed health gate, failed backup/restore, unverified release provenance, or performance-budget violation is an immediate NO-GO.
