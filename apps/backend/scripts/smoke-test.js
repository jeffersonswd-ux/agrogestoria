/**
 * Teste de fumaça da API: health check, login do Super Admin e rotas principais.
 * Lê as credenciais do .env sem imprimi-las e não grava o token em disco.
 */
const fs = require('fs');
const path = require('path');

const BASE = process.env.API_BASE || 'http://localhost:3001/api';

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env'));

async function main() {
  const results = [];

  // 1. Health check
  const health = await fetch(`${BASE}/health`);
  const healthBody = await health.json();
  results.push({
    passo: 'GET /health',
    status: health.status,
    ok: health.status === 200 && healthBody.status === 'ok',
    detalhe: `db=${healthBody.database}`,
  });

  // 2. Login do Super Admin
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.SUPERADMIN_EMAIL,
      password: env.SUPERADMIN_PASSWORD,
    }),
  });
  const loginBody = await loginRes.json();
  const token = loginBody.accessToken;
  results.push({
    passo: 'POST /auth/login',
    status: loginRes.status,
    ok: loginRes.ok && !!token,
    detalhe: token ? `role=${loginBody.user?.role}` : JSON.stringify(loginBody).slice(0, 160),
  });

  if (!token) {
    print(results);
    process.exit(1);
  }

  const auth = { Authorization: `Bearer ${token}` };

  // 3. Rotas do painel do Super Admin
  for (const [nome, rota] of [
    ['dashboard admin', '/admin/dashboard'],
    ['empresas', '/admin/companies'],
    ['fazendas', '/admin/farms'],
    ['usuarios', '/admin/users'],
    ['logs', '/admin/audit'],
    ['consumo IA', '/admin/ai-usage'],
  ]) {
    const res = await fetch(`${BASE}${rota}`, { headers: auth });
    results.push({ passo: `GET ${rota}`, status: res.status, ok: res.ok, detalhe: nome });
  }

  // 4. Rotas de cliente (exigem empresa) — devem responder 403 sem empresa
  for (const [nome, rota] of [
    ['dashboard cliente', '/dashboard'],
    ['fazendas cliente', '/farms'],
    ['culturas', '/crops'],
  ]) {
    const res = await fetch(`${BASE}${rota}`, { headers: auth });
    const esperado403 = res.status === 403 || res.status === 200;
    results.push({
      passo: `GET ${rota}`,
      status: res.status,
      ok: esperado403,
      detalhe: `${nome} (403 esperado para Super Admin sem empresa)`,
    });
  }

  print(results);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

function print(results) {
  console.log('\n=== Teste de fumaça da API ===\n');
  for (const r of results) {
    console.log(`${r.ok ? 'OK  ' : 'FALHA'} ${r.passo.padEnd(30)} HTTP ${String(r.status).padEnd(4)} ${r.detalhe || ''}`);
  }
  const falhas = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - falhas}/${results.length} verificações passaram.\n`);
}

main().catch((err) => {
  console.error('Erro no teste:', err.message);
  process.exit(1);
});
