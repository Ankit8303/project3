# ADR-0002: Resource Authorization and Realtime Room Security

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Phase 1 established verified identity and short-lived Tomato application JWTs. Phase 2 addresses authorization: an authenticated principal must only access or mutate resources they are entitled to access.

The previous implementation contained several trust-boundary gaps: restaurant order listing trusted a client-supplied restaurant ID, Socket.IO allowed arbitrary room joins, realtime events trusted client-supplied identity fields, and rider-only APIs relied primarily on controller checks rather than explicit role middleware.

## Decision

Authorization is enforced at the resource boundary using four rules:

1. Customers may access, cancel, and review only their own orders, with cancellation/review additionally constrained by order state.
2. Sellers may access or mutate orders only when they own the restaurant associated with the order.
3. Rider APIs require an authenticated `rider` role. Rider-specific order operations remain service-mediated and use server-side rider identity.
4. Socket.IO room membership is allowlisted. User rooms are self-owned, seller restaurant rooms require ownership, and order rooms require a server-side authorization check against the Restaurant service. Client-supplied sender identity is ignored.

Internal service endpoints use a dedicated middleware with constant-time comparison of the configured service credential.

## Alternatives considered

### Frontend-only authorization
Rejected. Browser checks are not a security boundary.

### Role-only authorization
Rejected. A seller role alone does not establish ownership of a particular restaurant or order.

### Database access directly from Realtime
Rejected. It would couple Realtime to the Restaurant service's persistence model and violate service ownership boundaries.

### Realtime → Restaurant authorization endpoint
Accepted. It preserves domain ownership while allowing Realtime to ask the owning service for a narrow authorization decision.

## Consequences

### Positive

- Prevents horizontal privilege escalation across customer orders.
- Prevents sellers from reading another seller's orders by changing URL parameters.
- Prevents arbitrary Socket.IO room subscriptions.
- Prevents forged sender names/roles in chat events.
- Prevents riders from publishing location for arbitrary orders.
- Makes authorization rules explicit and testable.

### Negative

- Order-room Socket.IO joins add a network authorization call.
- Realtime availability depends on the Restaurant authorization endpoint for order-scoped operations.
- More middleware/policy code must be maintained consistently across services.

## Follow-up actions

- Add centralized policy/error handling.
- Replace shared internal service key with service identity/mTLS or signed service JWTs at a later infrastructure phase.
- Add integration tests using real MongoDB/RabbitMQ/Socket.IO boundaries.
- Add authorization audit events and metrics.
