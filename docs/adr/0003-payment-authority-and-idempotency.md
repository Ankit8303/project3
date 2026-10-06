# ADR-0003: Server-authoritative payment confirmation

**Status:** Accepted

## Context

The previous payment flow allowed the browser to call a verification endpoint and accepted fabricated `demo_session_<orderId>` values. Real Stripe payment confirmation depended on a browser redirect rather than a server-to-server Stripe webhook.

## Decision

Stripe webhooks are the authoritative source of payment confirmation in `PAYMENT_MODE=stripe`.

The payment service now:

1. Authenticates application users before creating payment sessions.
2. Verifies order ownership through the Restaurant service.
3. Creates Stripe Checkout Sessions with server-derived amount/currency and immutable order/user metadata.
4. Uses Stripe Checkout idempotency keys per order.
5. Validates Stripe webhook signatures using the raw request body.
6. Validates payment status, order metadata, amount and currency before publishing `PAYMENT_SUCCESS`.
7. Uses Stripe payment/session identity as the payment id for downstream idempotency.
8. Allows the success page to observe payment status but never to mutate payment state.

Demo payments remain available only when `PAYMENT_MODE=demo` and are explicitly marked as demo provider events.

## Consequences

Positive:

- Browser redirects cannot forge payment confirmation.
- Payment amount is checked against the server-owned order.
- Stripe retries are safe because the restaurant consumer treats already-paid orders as idempotent.
- Payment session creation is idempotent per order.

Negative:

- Production Stripe configuration now requires `STRIPE_WEBHOOK_SECRET`.
- Local development without Stripe credentials must explicitly use `PAYMENT_MODE=demo`.
- A dedicated server-side wallet ledger is still required before the wallet can be treated as a real financial balance.
