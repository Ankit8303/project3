# Tomato Production Deployment Runbook

## Architecture

Internet -> host Nginx/TLS -> localhost-bound Docker services -> MongoDB/Redis/RabbitMQ/third-party APIs.

The frontend is deployed separately (for example, Vercel) and receives the public API URL through `VITE_*_SERVICE_URL` variables.

## Prerequisites

- Docker Engine + Compose plugin
- `mongodump` installed for logical backups (or an equivalent managed-backup policy)
- GitHub Container Registry access
- `/etc/nginx/proxy_params` and Nginx installed on the host
- Certbot-managed TLS certificates for the production API hostname
- `.env.production` stored only on the host with restrictive permissions (`chmod 600`)

## First deployment

1. Copy `.env.production.example` to `.env.production` and fill every required value.
2. Set the immutable image namespace and commit tag:

```bash
export IMAGE_NAMESPACE=ghcr.io/<github-owner>/tomato
export IMAGE_TAG=sha-<verified-commit>
```

3. Authenticate Docker to GHCR.
4. Run:

```bash
./scripts/prod-preflight.sh
./scripts/prod-deploy.sh "$IMAGE_TAG"
```

5. Install `deploy/nginx/tomato.conf` under the host's Nginx `conf.d` directory, replace `api.example.com`, install the real certificate paths, then run `nginx -t && systemctl reload nginx`.
6. Configure the frontend's production `VITE_*_SERVICE_URL` values to the public API hostname and deploy the frontend.

## Deployment behavior

`prod-deploy.sh` performs a preflight check, creates a MongoDB logical backup, pulls the immutable images, starts the stack, and waits for all six service healthchecks. A failed health gate does not silently promote the release.

## Rollback

Use the previous recorded image tag or provide a known-good immutable commit:

```bash
./scripts/prod-rollback.sh sha-<known-good-commit>
```

The rollback is image-based; it does not rebuild source.

## Backup policy

Logical MongoDB backups are created before each deployment. This is a deployment safety net, not a replacement for continuous managed database backups, point-in-time recovery, and off-host retention.

## Secrets

Never commit `.env.production`, Docker registry credentials, TLS private keys, Stripe secrets, Clerk secrets, or PII encryption keys. Keep host secret files outside Git and restrict permissions to the deployment operator.

## Post-deploy checks

- `./scripts/prod-verify.sh`
- `curl https://api.example.com/health/auth`
- `curl https://api.example.com/health/restaurant`
- `curl https://api.example.com/health/utils`
- `curl https://api.example.com/health/realtime`
- `curl https://api.example.com/health/rider`
- `curl https://api.example.com/health/admin`
- Verify Socket.IO connection through the TLS endpoint.
- Inspect application logs and Phase-12 telemetry.
- Confirm Stripe webhook delivery and signature verification.

## Recovery

If health checks fail, stop exposing the unhealthy release through the reverse proxy and rollback to the last known-good immutable image tag. Investigate dependency health before retrying.
