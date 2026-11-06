#!/usr/bin/env bash
# Reproduz o build da Hostinger: instalacao de producao (NODE_ENV=production)
# em uma copia isolada dos tres apps, sem tocar no ambiente local.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="${TMPDIR:-/tmp}/agrogestor-build-teste"
rm -rf "$TMP"
mkdir -p "$TMP"

echo "1. Copiando os manifests (package.json e lockfiles)"
for app in backend worker frontend; do
  mkdir -p "$TMP/$app"
  cp "$ROOT/apps/$app/package.json" "$ROOT/apps/$app/package-lock.json" "$TMP/$app/"
done

echo "2. Instalando com NODE_ENV=production (omitindo devDependencies)"
for app in backend worker frontend; do
  ( cd "$TMP/$app" && NODE_ENV=production npm ci --ignore-scripts --no-audit --no-fund >/dev/null 2>&1 )
  echo "   $app instalado"
done

echo "3. Conferindo se as ferramentas de build foram instaladas"
falha=0
for app in backend worker; do
  if [ -d "$TMP/$app/node_modules/typescript" ]; then
    echo "   OK   $app: typescript presente"
  else
    echo "   FALHA $app: typescript AUSENTE"; falha=1
  fi
done
if [ -d "$TMP/frontend/node_modules/vite" ]; then
  echo "   OK   frontend: vite presente"
else
  echo "   FALHA frontend: vite AUSENTE"; falha=1
fi

echo "4. Rodando os builds de producao"
( cd "$TMP/backend" && npx prisma generate --schema=prisma/schema.prisma >/dev/null 2>&1 ) || true
cp -r "$ROOT/apps/backend/prisma" "$TMP/backend/" 2>/dev/null || true
cp -r "$ROOT/apps/backend/src" "$TMP/backend/" 2>/dev/null || true
cp "$ROOT/apps/backend/tsconfig.build.json" "$TMP/backend/" 2>/dev/null || true
( cd "$TMP/backend" && NODE_ENV=production npx tsc -p tsconfig.build.json 2>&1 | head -5 )
echo "   backend compilado"

( cd "$TMP/worker" && cp -r "$ROOT/apps/worker/src" . && cp "$ROOT/apps/worker/tsconfig.json" . && NODE_ENV=production npx tsc -p tsconfig.json 2>&1 | head -5 )
echo "   worker compilado"

( cd "$TMP/frontend" && cp -r "$ROOT/apps/frontend/src" . && cp "$ROOT/apps/frontend/public" . 2>/dev/null || true && cp "$ROOT/apps/frontend/index.html" . 2>/dev/null || true && cp "$ROOT/apps/frontend/tsconfig.json" "$ROOT/apps/frontend/tsconfig.app.json" "$ROOT/apps/frontend/tsconfig.node.json" . 2>/dev/null || true && cp "$ROOT/apps/frontend/vite.config.ts" "$ROOT/apps/frontend/postcss.config.js" "$ROOT/apps/frontend/tailwind.config.js" . 2>/dev/null || true && NODE_ENV=production npx vite build 2>&1 | tail -4 )
echo "   frontend compilado"

rm -rf "$TMP"
if [ "$falha" -eq 0 ]; then
  echo
  echo "RESULTADO: build de producao funciona."
else
  echo
  echo "RESULTADO: FALHOU — ferramenta de build ausente."
  exit 1
fi
