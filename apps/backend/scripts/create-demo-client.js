/**
 * Cria (ou recria) um cliente de demonstração para conferir o painel agrícola no navegador.
 * Uso: node scripts/create-demo-client.js
 * Para remover depois: node scripts/create-demo-client.js --remove
 */
const fs = require('fs');
const path = require('path');

const API = process.env.API_BASE || 'http://localhost:3001/api';
const EMAIL = 'demo@agrogestor.local';
const SENHA = 'Demo@Teste2026';
const NOME_EMPRESA = 'Fazenda Demonstração';

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

async function json(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

(async () => {
  const env = readEnv(path.join(__dirname, '..', '.env'));
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD }),
  });
  const { accessToken } = await json(login);
  const H = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const lista = await json(await fetch(`${API}/admin/companies?search=${encodeURIComponent(NOME_EMPRESA)}&pageSize=100`, { headers: H }));
  const existente = (lista.data || []).find((c) => c.companyName === NOME_EMPRESA);

  if (existente) {
    await fetch(`${API}/admin/companies/${existente.id}`, {
      method: 'DELETE',
      headers: H,
      body: JSON.stringify({ confirmation: 'EXCLUIR' }),
    });
    console.log('Cliente de demonstração anterior removido.');
    if (process.argv.includes('--remove')) process.exit(0);
  } else if (process.argv.includes('--remove')) {
    console.log('Nenhum cliente de demonstração encontrado.');
    process.exit(0);
  }

  const criado = await json(
    await fetch(`${API}/admin/companies`, {
      method: 'POST',
      headers: H,
      body: JSON.stringify({
        clientName: 'Produtor Demonstração',
        companyName: NOME_EMPRESA,
        email: EMAIL,
        whatsapp: '16999990000',
        city: 'Ribeirão Preto',
        state: 'SP',
        adminName: 'Produtor Demonstração',
        adminEmail: EMAIL,
        adminPassword: SENHA,
        requirePasswordChange: false,
      }),
    }),
  );
  const companyId = criado?.company?.id;
  if (!companyId) throw new Error('Não foi possível criar o cliente de demonstração');

  await fetch(`${API}/admin/farms`, {
    method: 'POST',
    headers: H,
    body: JSON.stringify({
      companyId,
      name: 'Fazenda Santa Maria',
      code: 'FSM-01',
      municipality: 'Ribeirão Preto',
      state: 'SP',
      latitude: -21.1789,
      longitude: -47.8107,
      totalAreaHa: 350,
      agriculturalAreaHa: 300,
      availableAreaHa: 50,
      predominantProduction: 'Grãos',
    }),
  });

  const catalogo = await json(await fetch(`${API}/admin/modules`, { headers: H }));
  await fetch(`${API}/admin/companies/${companyId}/modules`, {
    method: 'PUT',
    headers: H,
    body: JSON.stringify({ modules: (catalogo || []).map((m) => m.key) }),
  });

  console.log('Cliente de demonstração criado.');
  console.log('  E-mail:', EMAIL);
  console.log('  Senha :', SENHA);
  console.log('  Para remover depois: node scripts/create-demo-client.js --remove');
})().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
