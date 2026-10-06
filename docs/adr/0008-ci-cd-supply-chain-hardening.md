# ADR 0008: CI/CD and Supply-Chain Hardening

## Status
Accepted

## Context
Tomato needs a repeatable release process that prevents untested source and mutable container tags from reaching production. Runtime hardening from Phase 14 is only useful if the delivery pipeline preserves those guarantees.

## Decision
- Every PR and main-branch change runs locked dependency installation, high/critical dependency auditing, service tests, builds, repository secret scanning, and container vulnerability scanning.
- Production container images are published to GHCR using immutable `sha-<commit>` tags only.
- Docker BuildKit emits SBOM and provenance attestations for release images.
- The release job requires the GitHub `production` environment, allowing repository administrators to configure required reviewers and deployment protection rules.
- GitHub Actions permissions are deny-by-default at workflow scope; package publishing and OIDC token permissions are granted only to the release job.
- Release artifacts are identified by commit SHA; no `latest` deployment tag is trusted.
- The release manifest is retained as an immutable CI artifact for rollback/reference.

## Consequences
- Releases are reproducible and traceable to a Git commit.
- A compromised or vulnerable dependency can fail the pipeline before release.
- Production promotion can require human approval through GitHub environment protection.
- Rollback can reference a previously published `sha-<commit>` image rather than rebuilding mutable source.
- Container builds are repeated in the release job after the security-gated build; registry-side digest verification remains an operational recommendation.
