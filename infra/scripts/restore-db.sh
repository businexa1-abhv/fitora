#!/bin/sh
# Restore PostgreSQL from backup — USE WITH CAUTION
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

BACKUP_FILE="$1"
PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${POSTGRES_USER:-fitora}"
PGDATABASE="${POSTGRES_DB:-fitora}"

echo "[restore] Restoring ${BACKUP_FILE} to ${PGDATABASE} on ${PGHOST}"
echo "[restore] Press Ctrl+C within 5 seconds to abort..."
sleep 5

gunzip -c "$BACKUP_FILE" | psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE"
echo "[restore] Done"
