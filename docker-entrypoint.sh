#!/bin/sh
set -e

# Ensure the SQLite directory exists.
DB_PATH="$(echo "$DATABASE_URL" | sed 's|file:||')"
DB_DIR="$(dirname "$DB_PATH")"
case "$DB_DIR" in
  /*) mkdir -p "$DB_DIR" ;;
  *)  mkdir -p "/app/$DB_DIR" ;;
esac
mkdir -p "$UPLOAD_DIR"

# Sync schema to DB. db push is idempotent and avoids needing committed
# migration files for a single-instance self-hosted deployment.
node ./node_modules/prisma/build/index.js db push \
  --schema=./prisma/schema.prisma \
  --skip-generate \
  --accept-data-loss

# Optional one-time seed (controlled by SEED=1 env).
if [ "${SEED:-0}" = "1" ]; then
  echo "SEED=1 — running prisma db seed..."
  node ./node_modules/prisma/build/index.js db seed --schema=./prisma/schema.prisma || \
    echo "Seed failed (continuing). To seed manually: docker exec -it sbt npx tsx prisma/seed.ts"
fi

exec "$@"
