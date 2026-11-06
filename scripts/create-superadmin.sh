#!/usr/bin/env bash
# Cria o primeiro Super Admin do AgroGestor IA
set -euo pipefail

cd "$(dirname "$0")/.."

if docker compose version >/dev/null 2>&1 && [ -f .env ]; then
  docker compose exec backend npx prisma db seed
else
  cd apps/backend
  npx prisma db seed
fi
