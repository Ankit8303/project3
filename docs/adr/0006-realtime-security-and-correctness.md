# ADR-0006: Realtime Security and Correctness

## Status
Accepted

## Context

Socket.IO is an externally reachable application boundary. Authentication alone is insufficient: clients must not choose identities, subscribe to arbitrary private rooms, spoof rider coordinates, impersonate chat senders, or exhaust the realtime service with unbounded events.

## Decision

1. Authenticate every Socket.IO connection with the Tomato internal JWT.
2. Validate the decoded identity shape before attaching it to `socket.data`.
3. Accept only the application roles `customer`, `seller`, and `rider` at the realtime boundary.
4. Permit only explicitly authorized user, seller-restaurant, and order rooms.
5. Re-authorize order access through the restaurant service before sensitive order-room operations.
6. Derive chat sender identity exclusively from the authenticated socket identity.
7. Derive rider identity exclusively from the authenticated socket identity; client payloads cannot select a rider identity.
8. Validate order IDs and geographic coordinate ranges before processing location updates.
9. Apply per-connection rate limits to room joins, rider location updates, and chat sends.
10. Reject oversized/empty chat messages.
11. Do not treat Socket.IO delivery as durable business state. Durable domain events continue to use the transactional outbox and RabbitMQ reliability mechanisms from Phases 6–7.

## Consequences

### Positive

- Private rooms cannot be enumerated by arbitrary room joins.
- Client-controlled sender identity is eliminated.
- Invalid geographic values cannot propagate to consumers.
- Socket floods are bounded per connection.
- Realtime failures do not become a source of financial or order-state truth.

### Trade-offs

- Order-room authorization requires an inter-service call and therefore adds latency.
- Per-connection rate limits do not provide a global distributed quota across multiple realtime instances.
- Socket.IO event delivery remains transient; durable notifications must use the event pipeline.

## Guarantees

The realtime subsystem provides authenticated, authorized, bounded event ingress and identity integrity. It does not claim exactly-once socket delivery.
