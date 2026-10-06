# ADR-0005: Rider Delivery State and Atomic Reservation

- Status: Accepted
- Date: 2026-10-06

## Context

A rider can receive multiple realtime order offers concurrently. A naive read-then-update flow allows the same rider to accept two orders, while the order service can independently race two riders for one order. The two services also cannot atomically commit a rider reservation and an order assignment in one MongoDB transaction because they own separate databases.

## Decision

Use a small saga with an atomic rider reservation followed by an atomic order assignment.

1. Rider service atomically reserves an available, verified rider with `activeOrderId`, `reservationId`, and a short reservation lease.
2. Restaurant service atomically changes an eligible order from `ready_for_rider` to `rider_assigned` with `riderId`.
3. On confirmed assignment, rider service clears only the reservation lease while retaining `activeOrderId`.
4. On a definite order rejection (404/409), rider service releases the reservation.
5. On an ambiguous network failure, rider service does not release the reservation; it reconciles against the restaurant service first. This prevents a second assignment after an unknown commit outcome.
6. Expired reservations are reconciled against the restaurant service before a rider can claim another order.
7. Delivery completion clears `activeOrderId` and returns the rider to availability.

## Invariants

- A rider has at most one `activeOrderId`.
- An order has at most one `riderId`.
- Only paid `ready_for_rider` orders can be assigned.
- A rider can only pick up an order in `rider_assigned` state.
- A rider can only complete an order in `picked_up` state and with the correct delivery OTP when configured.
- A completed delivery releases the rider.

## Alternatives considered

### Distributed transaction across services
Rejected because the services have separate persistence boundaries and introducing a distributed transaction coordinator would add significant operational complexity for this workflow.

### Order-first assignment
Rejected because two orders could be assigned to the same rider before the rider service serializes the rider's availability.

### Rider-first reservation without reconciliation
Rejected because a process crash or timeout after a successful order assignment could leave an inconsistent reservation and later duplicate assignment risk.

## Consequences

Positive:

- Concurrent rider acceptance is serialized at the rider database boundary.
- Concurrent order acceptance is serialized at the order database boundary.
- Ambiguous network failures fail closed rather than releasing an uncertain reservation.
- Recovery has an explicit reconciliation path.

Negative:

- The workflow is a saga and can temporarily hold a reservation.
- A reconciliation call is required after ambiguous failures.
- A later phase should add durable event/outbox-based reconciliation for stronger recovery guarantees.
