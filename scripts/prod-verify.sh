#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
services=(auth restaurant utils realtime rider admin)
for service in "${services[@]}"; do
  cid="$(docker compose -f docker-compose.production.yml ps -q "$service")"
  [[ -n "$cid" ]] || { echo "${service}: container missing" >&2; exit 1; }
  status=""
  for _ in $(seq 1 60); do
    status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$cid")"
    [[ "$status" == healthy ]] && break
    sleep 2
  done
  [[ "$status" == healthy ]] || { echo "${service}: unhealthy (${status})" >&2; exit 1; }
  echo "${service}: healthy"
done

echo "All backend services are healthy."
