#!/usr/bin/env bash
# Envia a branch main para o origin (GitHub).
# As credenciais vêm do Git Credential Manager, já configurado neste computador.
set -euo pipefail
cd "$(dirname "$0")/.."
GIT=(git -c "safe.directory=D:/AgroGestor IA")

"${GIT[@]}" push -u origin main

echo
echo "Branches no origin:"
"${GIT[@]}" ls-remote --heads origin
