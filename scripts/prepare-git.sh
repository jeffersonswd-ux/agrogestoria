#!/usr/bin/env bash
# Prepara o primeiro commit do AgroGestor IA para o GitHub.
# O .gitignore exclui .env, node_modules, dist e .tools, portanto
# apenas os .env.example (modelos sem segredo) entram no repositório.
set -euo pipefail
cd "$(dirname "$0")/.."

GIT=(git -c "safe.directory=D:/AgroGestor IA")

"${GIT[@]}" add \
  .gitignore \
  .nvmrc \
  README.md \
  PROGRESSO.md \
  DEPLOY.md \
  package.json \
  docker-compose.yml \
  docker-compose.prod.yml \
  apps \
  scripts \
  .claude

echo "Arquivos preparados: $("${GIT[@]}" diff --cached --name-only | wc -l)"
echo "Confere que nenhum .env real entrou:"
if "${GIT[@]}" diff --cached --name-only | grep -E '(^|/)\.env$'; then
  echo "ERRO: arquivo .env real foi preparado. Abortando."
  exit 1
else
  echo "  ok — nenhum .env real no commit"
fi
