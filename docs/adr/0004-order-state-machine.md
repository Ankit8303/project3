# ADR-0004: Explicit Order State Machine

Status: Accepted

## Context

Order status previously changed through controller-specific conditionals. That allowed business transitions to be duplicated and made concurrent requests vulnerable to stale reads followed by unconditional writes.

## Decision

Model order lifecycle transitions explicitly and enforce each mutation with an atomic MongoDB compare-and-set predicate containing the expected current status.

Allowed transitions:

`placed -> accepted -> preparing -> ready_for_rider -> rider_assigned -> picked_up -> delivered`

The customer may cancel only from `placed`.

## Consequences

Positive: illegal transitions become explicit, concurrent updates fail with HTTP 409 rather than silently overwriting each other, and the same transition graph can be reused by tests and future event consumers.

Negative: clients must refresh/retry after a concurrent state change, and future exceptional flows such as refunds or restaurant rejection need explicit states rather than ad-hoc writes.

## Follow-up

Phase 6/7 will add durable event delivery and an outbox so state changes and domain events cannot diverge.
