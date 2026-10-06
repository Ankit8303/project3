#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
: "${MONGO_URI:?MONGO_URI is required}"
backup_dir="${BACKUP_DIR:-./backups/mongodb}"
mkdir -p "$backup_dir"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
archive="$backup_dir/tomato-${timestamp}.archive.gz"
command -v mongodump >/dev/null || { echo "mongodump is required for logical backups" >&2; exit 1; }
mongodump --uri="$MONGO_URI" --archive="$archive" --gzip >/dev/null
chmod 600 "$archive"
echo "MongoDB backup created: $archive"
