#!/usr/bin/env bash
# Backup do banco PostgreSQL do AgroGestor IA
# Uso: ./scripts/backup.sh [destino]
set -euo pipefail

cd "$(dirname "$0")/.."

DEST="${1:-./backups}"
mkdir -p "$DEST"

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

: "${POSTGRES_USER:=agrogestor}"
: "${POSTGRES_DB:=agrogestor}"
: "${POSTGRES_PASSWORD:=postgres}"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="$DEST/agrogestor-$TIMESTAMP.sql.gz"

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "→ Gerando backup do banco '$POSTGRES_DB'..."
pg_dump -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists | gzip > "$FILE"

# Backup dos uploads
if [ -d "${UPLOAD_DIR:-./uploads}" ]; then
  tar -czf "$DEST/agrogestor-uploads-$TIMESTAMP.tar.gz" "${UPLOAD_DIR:-./uploads}"
  echo "→ Uploads exportados."
fi

SIZE="$(du -h "$FILE" | cut -f1)"
echo "✓ Backup concluído: $FILE ($SIZE)"

# Retenção: remove backups com mais de 30 dias
find "$DEST" -name 'agrogestor-*.sql.gz' -mtime +30 -delete
find "$DEST" -name 'agrogestor-uploads-*.tar.gz' -mtime +30 -delete
echo "→ Backups antigos (mais de 30 dias) removidos."
