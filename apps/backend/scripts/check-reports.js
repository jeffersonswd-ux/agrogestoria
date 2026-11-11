/**
 * Confere as rotas de relatórios do Super Admin usando as credenciais do .env.
 */
const fs = require('fs');
const path = require('path');

const API = process.env.API_BASE || 'http://localhost:3000/api';

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env'));

(async () => {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD }),
  });
  const body = await login.json();
  if (!body.accessToken) {
    console.log('login falhou: HTTP', login.status);
    process.exit(1);
  }
  console.log('login do Super Admin: HTTP', login.status, '| role:', body.user?.role);
  const H = { Authorization: `Bearer ${body.accessToken}` };

  const chaves = [
    'financial', 'payables', 'receivables', 'cashflow', 'cost-per-ha', 'cost-per-culture',
    'cost-per-season', 'production', 'harvests', 'inventory', 'purchases', 'sales',
    'machines', 'fuel', 'maintenance', 'operations', 'applications', 'employees', 'season-comparison',
  ];
  let ok = 0;
  for (const k of chaves) {
    const ini = Date.now();
    const res = await fetch(`${API}/reports/${k}?format=json`, { headers: H });
    const json = await res.json();
    const good = res.ok && Array.isArray(json.columns) && Array.isArray(json.rows);
    if (good) ok++;
    console.log(`${good ? 'OK   ' : 'FALHA'} ${k.padEnd(18)} HTTP ${res.status} ${Date.now() - ini}ms`);
  }

  for (const formato of ['csv', 'xlsx', 'pdf']) {
    const res = await fetch(`${API}/reports/financial?format=${formato}`, { headers: H });
    const buf = await res.arrayBuffer();
    console.log(`${res.ok ? 'OK   ' : 'FALHA'} export ${formato.padEnd(13)} HTTP ${res.status} ${buf.byteLength} bytes`);
  }

  console.log(`\n${ok}/${chaves.length} relatórios em JSON responderam corretamente.`);
  process.exit(ok === chaves.length ? 0 : 1);
})().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
