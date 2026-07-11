#!/bin/sh
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Applying database migrations..."
  if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    npx prisma migrate deploy
  elif [ "${NODE_ENV}" = "production" ]; then
    echo "[entrypoint] ERROR: No Prisma migrations found. Run 'pnpm db:migrate' before deploying to production."
    exit 1
  else
    echo "[entrypoint] No migrations — using prisma db push (development only)"
    npx prisma db push --skip-generate
  fi
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Seeding database..."
  npx ts-node --transpile-only prisma/seed.ts || true
fi

exec "$@"
