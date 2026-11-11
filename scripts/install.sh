#!/usr/bin/env bash
# Instalação do AgroGestor IA em servidor Linux com Docker
set -euo pipefail

cd "$(dirname "$0")/.."

echo "═══════ AgroGestor IA — Instalação ═══════"

if ! command -v docker >/dev/null 2>&1; then
  echo "✗ Docker não encontrado. Instale Docker Engine antes de continuar."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "✗ Docker Compose v2 não encontrado."
  exit 1
fi

if [ ! -f .env ]; then
  echo "→ Criando .env a partir do .env.example..."
  cp .env.example .env
  echo "⚠ Edite o arquivo .env com as credenciais reais antes de continuar."
  exit 1
fi

echo "→ Construindo as imagens..."
docker compose build

echo "→ Subindo os containers..."
docker compose up -d

echo "→ Executando as migrations do banco..."
docker compose exec backend npx prisma migrate deploy

echo "→ Verificando a saúde dos serviços..."
sleep 10
docker compose ps

HEALTH="$(curl -fsS http://localhost:3000/api/health 2>/dev/null || echo 'sem-resposta')"
echo "Health do backend: $HEALTH"

cat <<'EOF'

══════════════════════════════════════════════════════
 Instalação concluída.

 Próximos passos:
  1. Crie o primeiro Super Admin:
       docker compose exec backend npx prisma db seed
  2. Acesse o painel em http://<IP-DO-SERVIDOR>:8080
  3. Configure o proxy reverso e o HTTPS (veja DEPLOY.md)
  4. Agende o backup diário (veja scripts/backup.sh)
══════════════════════════════════════════════════════
EOF
