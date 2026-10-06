# ADR-0007: Docker and Runtime Hardening

## Status
Accepted

## Context
Tomato services previously used multi-stage builds but ran production processes as root, used mutable root filesystems, lacked container healthchecks and resource controls, and did not provide a production Compose baseline. The utils service also created a local uploads directory unconditionally, which is incompatible with a read-only production filesystem.

## Decision
- Build with `npm ci`; runtime images install production dependencies only.
- Pin the Node/Alpine image to an explicit version tag.
- Run services as the built-in non-root `node` user.
- Set `NODE_ENV=production` and explicit service ports.
- Add HTTP `/health` liveness endpoints and Docker healthchecks.
- Use `read_only`, `tmpfs /tmp`, `cap_drop: ALL`, `no-new-privileges`, `init`, restart policies, and CPU/memory limits in production Compose.
- Bind application ports to loopback in the Compose baseline so exposure is delegated to the API gateway/reverse proxy.
- Inject secrets through a protected `.env.production`/deployment secret manager; never bake secrets into images.
- Disable local uploads in production and only create the uploads directory when the explicit non-production fallback is enabled.

## Consequences
The containers have a smaller attack surface and constrained blast radius. Applications must not rely on arbitrary filesystem writes. Persistent state belongs in external managed services or explicitly mounted storage, not the container root filesystem.
