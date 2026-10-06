#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export IMAGE_NAMESPACE="${IMAGE_NAMESPACE:?IMAGE_NAMESPACE is required}"
export IMAGE_TAG="${1:?Usage: $0 sha-<commit>}"
[[ "$IMAGE_TAG" == sha-* ]] || { echo "Only immutable sha-* tags may be deployed" >&2; exit 1; }
./scripts/prod-preflight.sh

state_dir=".deploy-state"
mkdir -p "$state_dir"
previous=""
[[ -f "$state_dir/current-image-tag" ]] && previous="$(cat "$state_dir/current-image-tag")"
if [[ -n "$previous" && "$previous" != "$IMAGE_TAG" ]]; then printf '%s' "$previous" > "$state_dir/previous-image-tag"; fi

set -a
source .env.production
set +a
./scripts/prod-backup.sh

docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --remove-orphans

if ! ./scripts/prod-verify.sh; then
  echo "Health gate failed. Current deployment remains available for explicit rollback." >&2
  exit 1
fi
printf '%s' "$IMAGE_TAG" > "$state_dir/current-image-tag"
echo "Deployment successful: $IMAGE_TAG"
