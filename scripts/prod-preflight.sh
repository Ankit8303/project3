#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

: "${IMAGE_NAMESPACE:?IMAGE_NAMESPACE is required}"
: "${IMAGE_TAG:?IMAGE_TAG is required}"

command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
docker compose version >/dev/null || { echo "docker compose plugin is required" >&2; exit 1; }
[[ -f .env.production ]] || { echo ".env.production is missing" >&2; exit 1; }
[[ "${IMAGE_TAG}" == sha-* ]] || { echo "IMAGE_TAG must be an immutable sha-* tag" >&2; exit 1; }

for key in MONGO_URI REDIS_URL RABBITMQ_URL JWT_SEC CLERK_SECRET_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET CLOUD_NAME CLOUD_API_KEY CLOUD_SECRET_KEY INTERNAL_SERVICE_KEY PII_ENCRYPTION_KEY CORS_ORIGINS; do
  grep -Eq "^${key}=.+$" .env.production || { echo "Missing or empty ${key} in .env.production" >&2; exit 1; }
done

echo "Preflight OK: ${IMAGE_NAMESPACE}:${IMAGE_TAG}"
