#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
export IMAGE_NAMESPACE="${IMAGE_NAMESPACE:?IMAGE_NAMESPACE is required}"
state_dir=".deploy-state"
tag="${1:-}"
if [[ -z "$tag" && -f "$state_dir/previous-image-tag" ]]; then tag="$(cat "$state_dir/previous-image-tag")"; fi
: "${tag:?Usage: $0 sha-<known-good-commit>}"
[[ "$tag" == sha-* ]] || { echo "Rollback tag must be immutable sha-*" >&2; exit 1; }
export IMAGE_TAG="$tag"
docker compose -f docker-compose.production.yml pull
docker compose -f docker-compose.production.yml up -d --remove-orphans
./scripts/prod-verify.sh
printf '%s' "$tag" > "$state_dir/current-image-tag"
echo "Rollback successful: $tag"
