/**
 * Diagnóstico: o filtro companyId da listagem de fazendas do Super Admin está aplicado?
 */
const fs = require('fs');
const path = require('path');

const API = process.env.API_BASE || 'http://localhost:3001/api';

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
  const { accessToken } = await login.json();
  const auth = { Authorization: `Bearer ${accessToken}` };

  const companies = await (await fetch(`${API}/admin/companies?pageSize=100`, { headers: auth })).json();
  console.log('Empresas cadastradas:', companies.data.length);
  for (const c of companies.data) console.log(`  - ${c.clientName} (${c.id}) fazendas=${c.farmsCount}`);

  const semFiltro = await (await fetch(`${API}/admin/farms?pageSize=100`, { headers: auth })).json();
  console.log('\nGET /admin/farms (sem filtro) ->', semFiltro.data.length, 'fazenda(s)');
  for (const f of semFiltro.data) console.log(`  - ${f.name} | companyId=${f.companyId} | cliente=${f.clientName}`);

  for (const c of companies.data) {
    const filtrado = await (await fetch(`${API}/admin/farms?companyId=${c.id}&pageSize=100`, { headers: auth })).json();
    const ids = filtrado.data.map((f) => f.id);
    const todasDaEmpresa = semFiltro.data.filter((f) => f.companyId === c.id).map((f) => f.id);
    const ok =
      ids.length === todasDaEmpresa.length &&
      ids.every((id) => todasDaEmpresa.includes(id)) &&
      ids.every((id) => semFiltro.data.find((f) => f.id === id).companyId === c.id);
    console.log(
      `\nGET /admin/farms?companyId=${c.clientName} -> ${ids.length} fazenda(s) | filtro correto: ${ok ? 'SIM' : 'NAO'}`,
    );
    if (!ok) {
      console.log('   esperadas:', todasDaEmpresa, '| obtidas:', ids);
    }
  }
})();
