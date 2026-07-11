#!/bin/sh
# PostgreSQL backup script — run via cron or docker compose backup profile
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="fitora_${TIMESTAMP}.sql.gz"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
PGUSER="${POSTGRES_USER:-fitora}"
PGDATABASE="${POSTGRES_DB:-fitora}"

mkdir -p "$BACKUP_DIR"

echo "[backup] Starting backup to ${BACKUP_DIR}/${FILENAME}"
pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "[backup] Backup complete ($(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1))"

# Prune old backups
find "$BACKUP_DIR" -name 'fitora_*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
echo "[backup] Pruned backups older than ${RETENTION_DAYS} days"

# Optional: upload to S3
if [ -n "${AWS_S3_BACKUP_BUCKET:-}" ]; then
  echo "[backup] Uploading to s3://${AWS_S3_BACKUP_BUCKET}/"
  aws s3 cp "${BACKUP_DIR}/${FILENAME}" "s3://${AWS_S3_BACKUP_BUCKET}/postgres/${FILENAME}"
fi
