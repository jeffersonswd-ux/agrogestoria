#!/usr/bin/env bash
# Cria o commit inicial, configura o remote e envia para o GitHub.
# As credenciais sao fornecidas pelo Git Credential Manager (ja configurado no Windows).
set -euo pipefail
cd "$(dirname "$0")/.."

REPO_URL="https://github.com/jeffersonswd-ux/agrogestoria.git"
BRANCH="main"
GIT=(git -c "safe.directory=D:/AgroGestor IA")

echo "1/4 — commit"
if "${GIT[@]}" rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "   já existe um commit; nada a fazer nesta etapa"
else
  "${GIT[@]}" commit -q -F .git-commit-message.txt
  echo "   commit $("${GIT[@]}" rev-parse --short HEAD) criado"
fi

echo "2/4 — remote"
if "${GIT[@]}" remote get-url origin >/dev/null 2>&1; then
  "${GIT[@]}" remote set-url origin "$REPO_URL"
else
  "${GIT[@]}" remote add origin "$REPO_URL"
fi
echo "   origin = $("${GIT[@]}" remote get-url origin)"

echo "3/4 — branch $BRANCH"
"${GIT[@]}" branch -M "$BRANCH"
echo "   branch atual: $("${GIT[@]}" branch --show-current)"

echo "4/4 — push"
"${GIT[@]}" push -u origin "$BRANCH"

echo
echo "Enviado. Resumo:"
"${GIT[@]}" log --oneline -1
"${GIT[@]}" ls-remote --heads origin | head -5
