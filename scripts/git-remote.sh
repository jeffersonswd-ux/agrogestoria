#!/usr/bin/env bash
# Configura o remote origin e a branch main do repositório local.
set -euo pipefail
cd "$(dirname "$0")/.."
REPO_URL="https://github.com/jeffersonswd-ux/agrogestoria.git"
GIT=(git -c "safe.directory=D:/AgroGestor IA")

if "${GIT[@]}" remote get-url origin >/dev/null 2>&1; then
  "${GIT[@]}" remote set-url origin "$REPO_URL"
else
  "${GIT[@]}" remote add origin "$REPO_URL"
fi
"${GIT[@]}" branch -M main

echo "origin  = $("${GIT[@]}" remote get-url origin)"
echo "branch  = $("${GIT[@]}" branch --show-current)"
echo "commit  = $("${GIT[@]}" log --oneline -1)"
