# Tomato Performance Testing Runbook

## Purpose

Measure API latency, error rate, saturation, and recovery behavior before production releases. Performance tests must run against an isolated **staging** environment with production-like limits and representative data.

## Profiles

### Smoke

Small validation after deployment. Default target: 10 virtual users for 30 seconds.

```bash
k6 run -e BASE_URL=https://staging.example.com -e PROFILE=smoke performance/k6-critical-paths.js
```

### Load

Expected operating load: 10 → 50 → 100 virtual users. This is the normal release-gate profile.

```bash
k6 run -e BASE_URL=https://staging.example.com -e PROFILE=load performance/k6-critical-paths.js
```

### Stress

Find the saturation point by exceeding the expected load. Run only when investigating capacity or before a planned scale change.

```bash
k6 run -e BASE_URL=https://staging.example.com -e PROFILE=stress performance/k6-critical-paths.js
```

## Budgets

- p95 request latency: **< 500 ms**
- p99 request latency: **< 1,000 ms**
- HTTP error rate: **< 1%**
- No sustained memory growth across the test window
- No unbounded RabbitMQ backlog
- MongoDB CPU/connection pool must remain below the staging capacity ceiling

A failure of these thresholds blocks promotion until investigated.

## Authenticated testing

Provide a short-lived staging token through the environment only:

```bash
k6 run \
  -e BASE_URL=https://staging.example.com \
  -e AUTH_TOKEN="$STAGING_TOKEN" \
  -e PROFILE=load \
  performance/k6-critical-paths.js
```

Never commit tokens, cookies, production credentials, Stripe secrets, or database passwords into the performance suite.

## Analysis checklist

Correlate k6 results with:

- HTTP p50/p95/p99
- Node.js CPU and heap
- MongoDB query latency, connections, CPU, and slow queries
- Redis hit rate and latency
- RabbitMQ publish latency and queue depth
- Socket.IO connection/event rates
- container CPU/memory limits
- Nginx upstream latency and 5xx responses

If latency rises while CPU is low, inspect database/network contention before increasing CPU limits. If CPU saturates with healthy dependency latency, scale the affected service horizontally.

## Safety

**Never run stress tests against production.** Use staging or a dedicated performance environment. Production verification should use smoke-level health checks only.
