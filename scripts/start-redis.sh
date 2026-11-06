#!/usr/bin/env bash
# Inicia o Redis local (portable) usado no desenvolvimento.
# Em produção o Redis é um serviço do docker-compose.
set -uo pipefail
cd "$(dirname "$0")/.."

REDIS_DIR=".tools/redis"
REDIS_BIN="$REDIS_DIR/redis-server.exe"
CLI_BIN="$REDIS_DIR/redis-cli.exe"

if [ ! -f "$REDIS_BIN" ]; then
  echo "Redis portable não encontrado em $REDIS_DIR"
  exit 1
fi

if "$CLI_BIN" ping 2>/dev/null | grep -q PONG; then
  echo "Redis já está em execução na porta 6379."
  exit 0
fi

echo "→ Iniciando o Redis na porta 6379..."
(cd "$REDIS_DIR" && ./redis-server.exe --port 6379 --save "" --appendonly no > redis.log 2>&1 &)

for i in $(seq 1 20); do
  sleep 1
  if "$CLI_BIN" ping 2>/dev/null | grep -q PONG; then
    echo "✓ Redis no ar (PONG)."
    exit 0
  fi
done

echo "✗ O Redis não respondeu. Veja $REDIS_DIR/redis.log"
exit 1
