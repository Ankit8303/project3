# ADR 0011: Performance Budgets and Indexed Hot Paths

## Status
Accepted

## Context

Tomato has high-volume reads for customer order history, restaurant order queues, and rider discovery. Performance engineering also needs reproducible load profiles without placing production credentials in test artifacts.

## Decision

1. Add compound MongoDB indexes matching the application's filter + sort patterns:
   - `Order(userId, paymentStatus, createdAt desc)`
   - `Order(restaurantId, paymentStatus, createdAt desc)`
   - `Order(status, paymentStatus, riderId, createdAt desc)`
   - `Rider(isAvailble, isVerified, location 2dsphere)`
2. Maintain a k6 harness with smoke, load, and stress profiles.
3. Establish initial release budgets of p95 < 500 ms, p99 < 1 s, and HTTP error rate < 1%.
4. Run load/stress testing only against staging or a dedicated performance environment.
5. Pass credentials only through environment variables; never commit secrets to the harness.

## Consequences

- Common order and rider reads can use index-backed plans instead of collection scans.
- Performance regressions become measurable and repeatable.
- Additional indexes increase write/storage cost; they must be reviewed against actual query plans and production-like data.
- The 500 ms budget is an initial engineering target, not a claim about current production latency.
