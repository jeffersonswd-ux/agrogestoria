#!/usr/bin/env bash
# Cria o commit inicial do repositório local.
set -euo pipefail
cd "$(dirname "$0")/.."
GIT=(git -c "safe.directory=D:/AgroGestor IA")

if "${GIT[@]}" rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "Commit ja existe: $("${GIT[@]}" log --oneline -1)"
else
  "${GIT[@]}" commit -q -F .git-commit-message.txt
  echo "Commit criado: $("${GIT[@]}" log --oneline -1)"
fi

echo "Arquivos no commit: $("${GIT[@]}" show --stat --oneline HEAD | tail -1)"
