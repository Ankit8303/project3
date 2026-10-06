# ADR 0012: Final Security Audit and Release Gate

## Decision
The Tomato release gate requires explicit CORS allowlisting, memory-only browser storage for the short-lived application JWT, internal authentication for operational endpoints, runtime/deployment environment-variable parity, immutable container releases, and the full regression/security policy suite.

## Security controls verified
- Wildcard CORS removed from all six backend services.
- CORS is configured through `CORS_ORIGINS`; production preflight requires it.
- Restaurant cache status is internal-service protected.
- Browser application JWT is memory-only; Clerk re-establishes the short-lived token after reload.
- Production uses `JWT_SEC`, matching the runtime consumers.
- Secret examples contain placeholders only.
- Existing authentication, authorization, payment, PII, realtime, runtime, CI/CD, failure, deployment, and performance gates remain covered by regression tests.

## Residual operational requirements
Live Docker, TLS, external dependency, vulnerability-database, and k6 load verification must be executed in staging/production infrastructure before public launch.
