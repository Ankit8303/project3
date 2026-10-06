# ADR-0001: Clerk Identity Boundary and Tomato Application Sessions

- Status: Accepted
- Date: 2026-10-06
- Scope: Authentication service and all authenticated backend services

## Context

The original authentication flow accepted client-supplied email, Clerk ID, name, image, and role values and then minted a Tomato JWT. That made the browser an authority for identity and role claims.

The browser also contained an internal service credential used to call the realtime service. That credential could therefore be extracted by any user of the frontend bundle.

## Decision

1. Clerk is the external identity authority.
2. `/api/auth/login-clerk` accepts only a Clerk session token in `Authorization: Bearer <token>`.
3. The auth service verifies the Clerk JWT signature, RS256 algorithm, subject, expiration/not-before claims, and authorized party (`azp`).
4. User profile identity is retrieved server-to-server from Clerk using `CLERK_SECRET_KEY` rather than trusting request-body identity fields.
5. Tomato persists the verified Clerk user ID as `clerkId` with a unique sparse index.
6. Tomato may issue a short-lived internal application JWT for downstream services. The token is signed with `JWT_SEC`, uses issuer `tomato-auth`, audience `tomato-services`, and expires after 15 minutes.
7. Every backend consumer validates the same issuer, audience, algorithm, and secret contract.
8. Self-service roles are limited to customer, rider, and seller. Administrator accounts are provisioned separately.
9. Browser code must never receive `INTERNAL_SERVICE_KEY` or call internal service endpoints with it.
10. Environment files are local configuration only; `.env.example` files are committed templates.

## Alternatives considered

### Keep the existing passwordless client-asserted login

Rejected. It does not establish proof of identity and permits account takeover by supplying another user's email.

### Use Clerk tokens directly in every service

Deferred. It would reduce the internal session layer but would force every service to understand and validate the external identity provider. The current application JWT is retained temporarily to minimize the migration surface.

### Install the Clerk backend SDK immediately

Not required for this phase. The service performs documented Clerk JWT verification using RS256/JWKS and uses the Clerk Backend API for server-side profile retrieval. The implementation can be replaced with `@clerk/backend` later without changing the domain contract.

## Consequences

### Positive

- Client-supplied identity is no longer trusted.
- Admin cannot be self-assigned.
- Internal tokens have explicit issuer/audience and a shorter lifetime.
- Downstream services share one verifiable application-token contract.
- Service credentials are removed from browser code.

### Negative

- Login now depends on a valid Clerk session.
- First login requires a server-to-server Clerk user lookup.
- Existing local accounts need to be linked to Clerk by verified email during migration.
- Operators must configure Clerk verification variables.

## Required configuration

- `CLERK_SECRET_KEY`
- `CLERK_AUTHORIZED_PARTIES`
- `CLERK_JWT_KEY` (recommended for networkless verification) or `CLERK_JWKS_URL`
- `CLERK_ISSUER` when issuer pinning is configured
- `JWT_SEC` with at least 32 characters, shared by the current application-token consumers

## Verification

- Auth service TypeScript build passes.
- Clerk token tests cover valid signatures, unknown signing keys, unauthorized parties, and missing subjects.
- Admin, restaurant, rider, realtime, and utils backend builds pass.
- Frontend TypeScript compilation passes.
