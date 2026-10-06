# ADR 0010: Immutable Production Deployment and Rollback

## Status
Accepted

## Decision
Production backend releases use immutable GHCR images tagged with the Git commit SHA. Docker Compose consumes those images rather than rebuilding on the production host. Host Nginx terminates TLS and proxies only to loopback-bound containers. Deployment is gated by a pre-deploy MongoDB backup and six container healthchecks.

## Consequences
- Production is reproducible from a verified commit.
- Rollback can restore a known-good image without rebuilding.
- The production host does not need the application source tree or build toolchain.
- Database rollback remains a separate concern; destructive schema/data migrations require their own compatibility strategy.
- Logical backups complement, but do not replace, managed database PITR/backups.
