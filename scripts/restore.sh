#!/usr/bin/env bash
# Restaura um backup do banco PostgreSQL do AgroGestor IA
# Uso: ./scripts/restore.sh ./backups/agrogestor-20260101-120000.sql.gz
set -euo pipefail

FILE="${1:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Uso: $0 <arquivo-backup.sql.gz>"
  echo "Arquivos disponíveis:"
  ls -1t ./backups/*.sql.gz 2>/dev/null | head -10 || echo "  (nenhum backup encontrado)"
  exit 1
fi

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a; . ./.env; set +a
fi

: "${POSTGRES_USER:=agrogestor}"
: "${POSTGRES_DB:=agrogestor}"
: "${POSTGRES_PASSWORD:=postgres}"

export PGPASSWORD="$POSTGRES_PASSWORD"

echo "⚠ ATENÇÃO: este procedimento APAGARÁ os dados atuais do banco '$POSTGRES_DB'."
read -r -p "Digite RESTAURAR para confirmar: " CONFIRM
if [ "$CONFIRM" != "RESTAURAR" ]; then
  echo "Cancelado."
  exit 1
fi

echo "→ Restaurando $FILE ..."
gunzip -c "$FILE" | psql -h "${PGHOST:-localhost}" -p "${PGPORT:-5432}" -U "$POSTGRES_USER" -d "$POSTGRES_DB"

echo "✓ Restauração concluída."
