# ADR 0009 — Failure Engineering and Recovery Policy

## Status
Accepted

## Context

A distributed food-delivery system must remain correct when dependencies fail, messages are duplicated, responses are lost, or a process crashes between two state changes. Happy-path tests are insufficient for these conditions.

## Decision

Tomato uses explicit failure classes and bounded resilience policies:

- Retry only dependency/transient failures (timeouts, connection failures, HTTP 408/425/429/5xx).
- Treat validation and authorization failures as permanent; do not retry them.
- Use capped exponential backoff with jitter to avoid retry storms.
- Bound retry attempts; exhausted transient failures must enter an operator-visible dead-letter/recovery path rather than retry forever.
- Deduplicate event IDs within a bounded retention window.
- Use circuit breakers for repeatedly failing dependencies so failures fail fast and allow cooldown-based recovery.
- Preserve rider reservations when assignment state is uncertain; reconcile before releasing them.
- Treat RabbitMQ delivery as at-least-once and require idempotent consumers.

## Failure drills

CI executes deterministic, non-destructive drills covering:

1. dependency connection failure classification;
2. transient HTTP 5xx classification;
3. permanent validation failure classification;
4. exponential backoff and jitter bounds;
5. retry-budget exhaustion;
6. duplicate-event suppression;
7. circuit-breaker open/cooldown/recovery.

Production chaos experiments remain controlled runbooks rather than automatically destructive CI jobs.

## Consequences

Positive:
- Prevents infinite retry loops and retry storms.
- Makes duplicate delivery safe at the policy layer.
- Gives operators explicit failure/recovery semantics.
- Provides deterministic regression coverage for resilience behavior.

Trade-off:
- Circuit breakers and bounded retries can surface failures sooner instead of hiding them behind indefinite retries.
- Real infrastructure chaos still requires staging/production safeguards and cannot be fully simulated by unit tests.
