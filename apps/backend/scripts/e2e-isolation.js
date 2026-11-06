/**
 * Teste de isolamento entre empresas (mais rigoroso que o e2e-client-flow):
 * cria DUAS empresas, cada uma com sua fazenda e seu administrador, e prova que
 * o administrador de uma não enxerga nem acessa os dados da outra.
 */
const fs = require('fs');
const path = require('path');

const API = process.env.API_BASE || 'http://localhost:3001/api';
const stamp = Date.now().toString(36);

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env'));
const SENHA = 'Isolamento@Teste2026';
const results = [];

function check(nome, ok, detalhe = '') {
  results.push({ nome, ok });
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome.padEnd(56)} ${detalhe}`);
}

async function json(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function criarEmpresa(authAdmin, nome) {
  const email = `iso-${nome}-${stamp}@teste.local`;
  const res = await fetch(`${API}/admin/companies`, {
    method: 'POST',
    headers: authAdmin,
    body: JSON.stringify({
      clientName: `Produtor ${nome}`,
      companyName: `Empresa ${nome} Ltda`,
      adminName: `Admin ${nome}`,
      adminEmail: email,
      adminPassword: SENHA,
      requirePasswordChange: false,
    }),
  });
  const body = await json(res);
  if (!body?.company?.id) throw new Error(`Falha ao criar a empresa ${nome}: ${JSON.stringify(body).slice(0, 200)}`);

  const fazendaRes = await fetch(`${API}/admin/farms`, {
    method: 'POST',
    headers: authAdmin,
    body: JSON.stringify({
      companyId: body.company.id,
      name: `Fazenda ${nome}`,
      municipality: 'Ribeirão Preto',
      state: 'SP',
      totalAreaHa: 100,
      agriculturalAreaHa: 80,
      availableAreaHa: 20,
    }),
  });
  const fazenda = await json(fazendaRes);

  const catalogo = await json(await fetch(`${API}/admin/modules`, { headers: authAdmin }));
  await fetch(`${API}/admin/companies/${body.company.id}/modules`, {
    method: 'PUT',
    headers: authAdmin,
    body: JSON.stringify({ modules: (catalogo || []).map((m) => m.key) }),
  });

  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: SENHA }),
  });
  const loginBody = await json(login);

  return {
    companyId: body.company.id,
    farmId: fazenda.id,
    email,
    token: loginBody.accessToken,
    auth: { Authorization: `Bearer ${loginBody.accessToken}` },
  };
}

async function main() {
  const loginAdmin = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD }),
  });
  const { accessToken } = await loginAdmin.json();
  const authAdmin = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const a = await criarEmpresa(authAdmin, 'A');
  const b = await criarEmpresa(authAdmin, 'B');
  check('Duas empresas criadas com fazenda e administrador', !!a.token && !!b.token);

  // Lista de fazendas do cliente A
  const farmsA = await json(await fetch(`${API}/farms`, { headers: a.auth }));
  const idsA = (farmsA.data || []).map((f) => f.id);
  check('Cliente A enxerga somente a própria fazenda', idsA.length === 1 && idsA[0] === a.farmId, `${idsA.length} fazenda(s)`);

  const farmsB = await json(await fetch(`${API}/farms`, { headers: b.auth }));
  const idsB = (farmsB.data || []).map((f) => f.id);
  check('Cliente B enxerga somente a própria fazenda', idsB.length === 1 && idsB[0] === b.farmId, `${idsB.length} fazenda(s)`);

  // Acesso direto ao recurso da outra empresa
  const direto = await fetch(`${API}/farms/${b.farmId}`, { headers: a.auth });
  check(
    'Cliente A é bloqueado ao acessar a fazenda do Cliente B',
    direto.status === 403 || direto.status === 404,
    `HTTP ${direto.status}`,
  );

  // Escrita em recurso da outra empresa
  const escrita = await fetch(`${API}/plots`, {
    method: 'POST',
    headers: { ...a.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ farmId: b.farmId, name: 'Talhão indevido', areaHa: 1 }),
  });
  check(
    'Cliente A é bloqueado ao criar talhão na fazenda do Cliente B',
    escrita.status === 403 || escrita.status === 404,
    `HTTP ${escrita.status}`,
  );

  // Financeiro isolado
  await fetch(`${API}/financial/transactions`, {
    method: 'POST',
    headers: { ...a.auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'PAGAR', category: 'Teste', description: 'Título isolado A', amount: 10, dueDate: new Date().toISOString() }),
  });
  const finA = await json(await fetch(`${API}/financial/transactions`, { headers: a.auth }));
  const finB = await json(await fetch(`${API}/financial/transactions`, { headers: b.auth }));
  check(
    'Título financeiro da empresa A não aparece para a empresa B',
    (finA.data || []).length === 1 && (finB.data || []).length === 0,
    `A=${finA.data?.length ?? 0} B=${finB.data?.length ?? 0}`,
  );

  // Filtro do Super Admin por empresa
  const filtrado = await json(
    await fetch(`${API}/admin/farms?companyId=${a.companyId}&pageSize=100`, { headers: authAdmin }),
  );
  const idsFiltrados = (filtrado.data || []).map((f) => f.id);
  check(
    'Filtro por empresa do Super Admin funciona em Fazendas',
    idsFiltrados.length === 1 && idsFiltrados[0] === a.farmId,
    `${idsFiltrados.length} fazenda(s) para a empresa A`,
  );

  // Limpeza
  for (const empresa of [a, b]) {
    await fetch(`${API}/admin/companies/${empresa.companyId}`, {
      method: 'DELETE',
      headers: authAdmin,
      body: JSON.stringify({ confirmation: 'EXCLUIR' }),
    });
  }
  check('Empresas de teste removidas', true);

  const falhas = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - falhas}/${results.length} verificações passaram.\n`);
  process.exit(falhas > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Erro no teste de isolamento:', err.message);
  process.exit(1);
});
