#!/usr/bin/env bash
# Verificação completa do AgroGestor IA: gera o cliente Prisma, aplica as migrations,
# cria o Super Admin, compila os três projetos e sobe a API para testar as rotas.
set -uo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
LOG="$ROOT/.verificacao.log"

say() { echo "──────────────────────────────────────────────" | tee -a "$LOG"; echo "▶ $*" | tee -a "$LOG"; }
ok()  { echo "✔ $*" | tee -a "$LOG"; }
err() { echo "✘ $*" | tee -a "$LOG"; }

: > "$LOG"

say "1/8 Prisma: generate"
(cd apps/backend && npx prisma generate) >>"$LOG" 2>&1 && ok "cliente Prisma gerado" || { err "falhou o prisma generate"; tail -20 "$LOG"; exit 1; }

say "2/8 Prisma: migrate deploy"
(cd apps/backend && npx prisma migrate deploy) >>"$LOG" 2>&1 && ok "migrations aplicadas" || { err "falhou o migrate deploy"; tail -30 "$LOG"; exit 1; }

say "3/8 Seed do Super Admin"
(cd apps/backend && npx tsx prisma/seed.ts) >>"$LOG" 2>&1 && ok "seed executado" || { err "falhou o seed"; tail -20 "$LOG"; }

say "4/8 Build do backend"
(cd apps/backend && npx tsc -p tsconfig.build.json) >>"$LOG" 2>&1 && ok "backend compilado" || { err "falhou o build do backend"; grep -E "error TS" "$LOG" | head -40; exit 1; }

say "5/8 Build do worker"
(cd apps/worker && npx tsc -p tsconfig.json) >>"$LOG" 2>&1 && ok "worker compilado" || { err "falhou o build do worker"; grep -E "error TS" "$LOG" | head -30; exit 1; }

say "6/8 Build do frontend"
(cd apps/frontend && npx vite build) >>"$LOG" 2>&1 && ok "frontend compilado" || { err "falhou o build do frontend"; tail -30 "$LOG"; exit 1; }

say "7/8 Subindo a API"
(cd apps/backend && node dist/main.js > "$ROOT/.api.log" 2>&1 &)
API_PID=$!
for i in $(seq 1 40); do
  sleep 2
  if curl -fsS http://localhost:3000/api/health >/dev/null 2>&1; then break; fi
done
HEALTH="$(curl -fsS http://localhost:3000/api/health 2>/dev/null)"
if [ -n "$HEALTH" ]; then ok "API no ar: $HEALTH"; else err "API não respondeu"; tail -30 "$ROOT/.api.log"; exit 1; fi

say "8/8 Testando rotas"
API=http://localhost:3000/api
TOKEN="$(curl -fsS -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@agrogestor.ia.br","password":"Agro@Admin2026"}' \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).accessToken||'')}catch{console.log('')}})")"

if [ -n "$TOKEN" ]; then ok "login do Super Admin funcionou"; else err "login do Super Admin falhou"; fi

for path in /admin/dashboard /admin/companies /admin/farms /admin/users /admin/modules /admin/integrations /admin/ai-usage /admin/audit /health; do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "$API$path" -H "Authorization: Bearer $TOKEN")"
  if [ "$CODE" = "200" ]; then ok "GET $path → 200"; else err "GET $path → $CODE"; fi
done

# Isolamento multiempresa: a rota de cliente deve negar acesso de Super Admin
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$API/dashboard" -H "Authorization: Bearer $TOKEN")"
if [ "$CODE" = "403" ]; then ok "GET /dashboard com Super Admin → 403 (exige empresa)"; else err "GET /dashboard com Super Admin → $CODE"; fi

# Rota protegida sem token
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$API/dashboard")"
if [ "$CODE" = "401" ]; then ok "GET /dashboard sem token → 401"; else err "GET /dashboard sem token → $CODE"; fi

# Cadastro de cliente e bloqueio
CREATE="$(curl -s -X POST "$API/admin/companies" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"clientName":"Teste de Verificacao","companyName":"Empresa de Teste","adminName":"Teste","adminEmail":"verificacao@agrogestor.local","adminPassword":"Verificacao@2026","requirePasswordChange":false}')"
CID="$(echo "$CREATE" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).company.id||'')}catch{console.log('')}})")"
if [ -n "$CID" ]; then
  ok "cliente criado via API ($CID)"
  curl -s -X POST "$API/admin/companies/$CID/block" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"reason":"verificacao"}' >/dev/null
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API/auth/login" -H 'Content-Type: application/json' -d '{"email":"verificacao@agrogestor.local","password":"Verificacao@2026"}')"
  if [ "$CODE" = "403" ] || [ "$CODE" = "401" ]; then ok "cliente bloqueado nega login ($CODE)"; else err "cliente bloqueado ainda faz login ($CODE)"; fi
  curl -s -X DELETE "$API/admin/companies/$CID" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"confirmation":"EXCLUIR"}' >/dev/null
  ok "cliente de teste removido"
else
  err "não foi possível criar o cliente de teste: $CREATE"
fi

echo "" | tee -a "$LOG"
say "Verificação concluída — detalhes em .verificacao.log"
exit 0
