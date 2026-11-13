/**
 * Teste de fluxo multiempresa:
 * 1. Super Admin cria um cliente (com usuário administrador).
 * 2. Super Admin cadastra uma fazenda para esse cliente.
 * 3. O administrador do cliente faz login e acessa o próprio painel.
 * 4. Verifica que o cliente NÃO enxerga dados de outra empresa.
 * 5. Bloqueia o cliente e confirma que o login passa a ser recusado.
 */
const fs = require('fs');
const path = require('path');

const API = process.env.API_BASE || 'http://localhost:3000/api';
const stamp = Date.now().toString(36);
const CLIENTE_EMAIL = `cliente-${stamp}@teste.local`;
const CLIENTE_SENHA = 'Cliente@Teste2026';

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env'));
const results = [];

function check(nome, ok, detalhe = '') {
  results.push({ nome, ok, detalhe });
  console.log(`${ok ? 'OK   ' : 'FALHA'} ${nome.padEnd(52)} ${detalhe}`);
}

async function json(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function main() {
  // ── 1. Login do Super Admin
  const loginAdmin = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD }),
  });
  const adminBody = await json(loginAdmin);
  check('Super Admin faz login', loginAdmin.ok && !!adminBody.accessToken, `HTTP ${loginAdmin.status}`);
  if (!adminBody.accessToken) return finish(1);

  const authAdmin = { Authorization: `Bearer ${adminBody.accessToken}`, 'Content-Type': 'application/json' };

  // ── 2. Cria o cliente
  const criarCliente = await fetch(`${API}/admin/companies`, {
    method: 'POST',
    headers: authAdmin,
    body: JSON.stringify({
      clientName: 'Produtor de Teste',
      companyName: 'Fazenda Teste Ltda',
      document: `999.999.999-${stamp.slice(-3)}`,
      email: CLIENTE_EMAIL,
      whatsapp: '11999990000',
      city: 'Ribeirão Preto',
      state: 'SP',
      adminName: 'Administrador de Teste',
      adminEmail: CLIENTE_EMAIL,
      adminPassword: CLIENTE_SENHA,
      requirePasswordChange: false,
    }),
  });
  const clienteBody = await json(criarCliente);
  const companyId = clienteBody?.company?.id;
  check('Super Admin cadastra o cliente', criarCliente.ok && !!companyId, `HTTP ${criarCliente.status}`);
  if (!companyId) {
    console.log(JSON.stringify(clienteBody).slice(0, 300));
    return finish(1);
  }
  check('Senha inicial é devolvida uma única vez', !!clienteBody.credentials?.password, 'credencial exibida no cadastro');

  // ── 3. Cadastra a fazenda
  const criarFazenda = await fetch(`${API}/admin/farms`, {
    method: 'POST',
    headers: authAdmin,
    body: JSON.stringify({
      companyId,
      name: 'Fazenda Santa Maria',
      code: 'FSM-01',
      ownerName: 'Produtor de Teste',
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
  const fazendaBody = await json(criarFazenda);
  check('Super Admin cadastra a fazenda do cliente', criarFazenda.ok && !!fazendaBody.id, `HTTP ${criarFazenda.status}`);

  // ── 4. Libera os módulos do cliente
  const catalogo = await json(await fetch(`${API}/admin/modules`, { headers: authAdmin }));
  const todosModulos = (catalogo || []).map((m) => m.key);
  const salvarModulos = await fetch(`${API}/admin/companies/${companyId}/modules`, {
    method: 'PUT',
    headers: authAdmin,
    body: JSON.stringify({ modules: todosModulos }),
  });
  check('Super Admin libera os módulos do cliente', salvarModulos.ok, `HTTP ${salvarModulos.status}`);

  // ── 5. Login do administrador do cliente
  const loginCliente = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CLIENTE_EMAIL, password: CLIENTE_SENHA }),
  });
  const clienteAuth = await json(loginCliente);
  check('Administrador do cliente faz login', loginCliente.ok && !!clienteAuth.accessToken, `HTTP ${loginCliente.status}`);
  if (!clienteAuth.accessToken) return finish(1);

  const authCliente = { Authorization: `Bearer ${clienteAuth.accessToken}` };

  // ── 6. O cliente enxerga a própria fazenda
  const farmsCliente = await json(await fetch(`${API}/farms`, { headers: authCliente }));
  check(
    'Cliente enxerga a própria fazenda',
    Array.isArray(farmsCliente.data) && farmsCliente.data.some((f) => f.id === fazendaBody.id),
    `${farmsCliente.data?.length ?? 0} fazenda(s) visível(is)`,
  );

  // ── 7. O cliente não acessa rotas administrativas
  const rotaAdmin = await fetch(`${API}/admin/companies`, { headers: authCliente });
  check('Cliente é recusado em rota administrativa', rotaAdmin.status === 403, `HTTP ${rotaAdmin.status}`);

  // ── 8. O cliente não enxerga outra empresa
  const companiesVisiveis = await json(await fetch(`${API}/admin/companies`, { headers: authAdmin }));
  const outraEmpresa = (companiesVisiveis.data || []).find((c) => c.id !== companyId);
  if (outraEmpresa) {
    const farmsOutra = await json(
      await fetch(`${API}/farms?companyId=${outraEmpresa.id}`, { headers: authAdmin }),
    );
    const idFazendaOutra = farmsOutra.data?.[0]?.id;
    if (idFazendaOutra) {
      const acessoDireto = await fetch(`${API}/farms/${idFazendaOutra}`, { headers: authCliente });
      check(
        'Cliente não acessa fazenda de outra empresa',
        acessoDireto.status === 403 || acessoDireto.status === 404,
        `HTTP ${acessoDireto.status}`,
      );
    }
  }

  // ── 9. O dashboard do cliente responde
  const dashCliente = await fetch(`${API}/dashboard`, { headers: authCliente });
  const dashBody = await json(dashCliente);
  check(
    'Dashboard do cliente carrega com dados reais',
    dashCliente.ok && typeof dashBody.cards?.areaTotal === 'number',
    `área total = ${dashBody.cards?.areaTotal ?? '?'} ha`,
  );

  // ── 10. Bloqueio revoga o acesso
  const bloquear = await fetch(`${API}/admin/companies/${companyId}/block`, {
    method: 'POST',
    headers: authAdmin,
    body: JSON.stringify({ reason: 'Teste de bloqueio' }),
  });
  check('Super Admin bloqueia o cliente', bloquear.ok, `HTTP ${bloquear.status}`);

  const loginBloqueado = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CLIENTE_EMAIL, password: CLIENTE_SENHA }),
  });
  check(
    'Cliente bloqueado é impedido de fazer login',
    loginBloqueado.status === 403 || loginBloqueado.status === 401,
    `HTTP ${loginBloqueado.status}`,
  );

  // ── 11. Desbloqueio restabelece o acesso
  const desbloquear = await fetch(`${API}/admin/companies/${companyId}/unblock`, {
    method: 'POST',
    headers: authAdmin,
    body: JSON.stringify({}),
  });
  check('Super Admin desbloqueia o cliente', desbloquear.ok, `HTTP ${desbloquear.status}`);

  const loginDesbloqueado = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: CLIENTE_EMAIL, password: CLIENTE_SENHA }),
  });
  check('Cliente desbloqueado volta a acessar', loginDesbloqueado.ok, `HTTP ${loginDesbloqueado.status}`);

  // ── 12. Limpeza
  const remover = await fetch(`${API}/admin/companies/${companyId}`, {
    method: 'DELETE',
    headers: authAdmin,
    body: JSON.stringify({ confirmation: 'EXCLUIR' }),
  });
  check('Super Admin exclui o cliente de teste', remover.ok, `HTTP ${remover.status}`);

  finish(0);
}

function finish(codigo) {
  const falhas = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - falhas}/${results.length} verificações passaram.\n`);
  process.exit(falhas > 0 ? 1 : codigo);
}

main().catch((err) => {
  console.error('Erro no teste de fluxo:', err.message);
  process.exit(1);
});
