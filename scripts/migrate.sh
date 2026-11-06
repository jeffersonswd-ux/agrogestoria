#!/usr/bin/env bash
# Aplica as migrations do Prisma
set -euo pipefail
cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1 && [ -f .env ]; then
  docker compose exec backend npx prisma migrate deploy
else
  cd apps/backend && npx prisma migrate deploy
fi
