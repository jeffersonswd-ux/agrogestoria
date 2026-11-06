import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthService } from '../src/auth/auth.service';
import { CompaniesService } from '../src/super-admin/companies.service';
import { FarmsService } from '../src/agriculture/farms.service';
import { FinanceService } from '../src/finance/finance.service';
import { UserRole } from '@prisma/client';

jest.setTimeout(30000);

describe('AgroGestor IA — isolamento multiempresa e permissões', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: AuthService;
  let companies: CompaniesService;
  let farms: FarmsService;
  let finance: FinanceService;

  const suffix = Date.now().toString(36);
  const emails = {
    adminA: `admin-a-${suffix}@teste.com`,
    adminB: `admin-b-${suffix}@teste.com`,
  };
  let companyA: any;
  let companyB: any;
  let farmA: any;
  let farmB: any;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = moduleRef.get(PrismaService);
    auth = moduleRef.get(AuthService);
    companies = moduleRef.get(CompaniesService);
    farms = moduleRef.get(FarmsService);
    finance = moduleRef.get(FinanceService);

    const created = await companies.create(
      {
        clientName: 'Cliente A Teste',
        companyName: 'Empresa A Teste',
        adminName: 'Admin A',
        adminEmail: emails.adminA,
        adminPassword: 'SenhaTeste123',
        requirePasswordChange: false,
      } as any,
      { id: 'test', email: 'test@teste.com', name: 'Teste', role: UserRole.SUPER_ADMIN, companyId: null },
      {},
    );
    companyA = created.company;

    const createdB = await companies.create(
      {
        clientName: 'Cliente B Teste',
        companyName: 'Empresa B Teste',
        adminName: 'Admin B',
        adminEmail: emails.adminB,
        adminPassword: 'SenhaTeste123',
        requirePasswordChange: false,
      } as any,
      { id: 'test', email: 'test@teste.com', name: 'Teste', role: UserRole.SUPER_ADMIN, companyId: null },
      {},
    );
    companyB = createdB.company;

    const userA = await prisma.user.findUniqueOrThrow({ where: { email: emails.adminA } });
    const userB = await prisma.user.findUniqueOrThrow({ where: { email: emails.adminB } });

    farmA = await farms.create(
      { id: userA.id, email: userA.email, name: userA.name, role: userA.role, companyId: companyA.id },
      { name: 'Fazenda A', totalAreaHa: 100, agriculturalAreaHa: 80, availableAreaHa: 20 },
    );
    farmB = await farms.create(
      { id: userB.id, email: userB.email, name: userB.name, role: userB.role, companyId: companyB.id },
      { name: 'Fazenda B', totalAreaHa: 50, agriculturalAreaHa: 40, availableAreaHa: 10 },
    );

    const loginA = await auth.login({ email: emails.adminA, password: 'SenhaTeste123' }, {});
    const loginB = await auth.login({ email: emails.adminB, password: 'SenhaTeste123' }, {});
    tokenA = loginA.accessToken;
    tokenB = loginB.accessToken;
  });

  afterAll(async () => {
    if (companyA) await prisma.company.delete({ where: { id: companyA.id } }).catch(() => undefined);
    if (companyB) await prisma.company.delete({ where: { id: companyB.id } }).catch(() => undefined);
    await app?.close();
  });

  it('faz login e devolve o perfil com módulos', async () => {
    const res = await auth.login({ email: emails.adminA, password: 'SenhaTeste123' }, {});
    expect(res.accessToken).toBeTruthy();
    expect(res.user.role).toBe(UserRole.ADMIN_CLIENTE);
    expect(res.user.modules.length).toBeGreaterThan(0);
    expect(res.user.companyId).toBe(companyA.id);
  });

  it('recusa senha errada', async () => {
    await expect(auth.login({ email: emails.adminA, password: 'senha-errada' }, {})).rejects.toThrow();
  });

  it('lista apenas as fazendas da própria empresa', async () => {
    const userA = await prisma.user.findUniqueOrThrow({ where: { email: emails.adminA } });
    const userB = await prisma.user.findUniqueOrThrow({ where: { email: emails.adminB } });
    const listA = await farms.list({ id: userA.id, email: userA.email, name: userA.name, role: userA.role, companyId: companyA.id }, {} as any);
    expect(listA.data.every((f: any) => f.companyId === companyA.id)).toBe(true);
    expect(listA.data.some((f: any) => f.id === farmB.id)).toBe(false);

    const listB = await farms.list({ id: userB.id, email: userB.email, name: userB.name, role: userB.role, companyId: companyB.id }, {} as any);
    expect(listB.data.every((f: any) => f.companyId === companyB.id)).toBe(true);
    expect(listB.data.some((f: any) => f.id === farmA.id)).toBe(false);
  });

  it('impede o acesso a fazenda de outra empresa', async () => {
    const userA = await prisma.user.findUniqueOrThrow({ where: { email: emails.adminA } });
    await expect(
      farms.findOne({ id: userA.id, email: userA.email, name: userA.name, role: userA.role, companyId: companyA.id }, farmB.id),
    ).rejects.toThrow(/não pertence|não encontrada/i);
  });

  it('mantém títulos financeiros isolados por empresa', async () => {
    const userA = await prisma.user.findUniqueOrThrow({ where: { email: emails.adminA } });
    const userB = await prisma.user.findUniqueOrThrow({ where: { email: emails.adminB } });
    const ctxA = { id: userA.id, email: userA.email, name: userA.name, role: userA.role, companyId: companyA.id };
    const ctxB = { id: userB.id, email: userB.email, name: userB.name, role: userB.role, companyId: companyB.id };

    await finance.create(ctxA, {
      type: 'PAGAR' as any,
      category: 'Teste',
      description: 'Título da empresa A',
      amount: 100,
      dueDate: new Date().toISOString(),
    });
    const listA = await finance.list(ctxA, {} as any);
    const listB = await finance.list(ctxB, {} as any);
    expect(listA.data.length).toBeGreaterThan(0);
    expect(listB.data.length).toBe(0);
  });

  it('bloqueia o cliente e revoga as sessões ativas', async () => {
    const adminActor = { id: 'sa', email: 'sa@teste.com', name: 'SA', role: UserRole.SUPER_ADMIN, companyId: null };
    await companies.block(companyB.id, 'Teste de bloqueio', adminActor as any, {});
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyB.id } });
    expect(company.status).toBe('BLOQUEADO');

    const active = await prisma.refreshToken.count({ where: { companyId: companyB.id, revokedAt: null } });
    expect(active).toBe(0);

    await expect(auth.login({ email: emails.adminB, password: 'SenhaTeste123' }, {})).rejects.toThrow(/bloqueado/i);

    await companies.unblock(companyB.id, adminActor as any, {});
    const login = await auth.login({ email: emails.adminB, password: 'SenhaTeste123' }, {});
    expect(login.accessToken).toBeTruthy();
  });

  it('impede o acesso a rotas administrativas sem perfil Super Admin', async () => {
    await app.init();
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(res.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'GET',
      url: '/api/dashboard',
      headers: { authorization: `Bearer ${tokenA}` },
    });
    expect(ok.statusCode).toBe(200);
  });

  it('exige autenticação nas rotas protegidas', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/dashboard' });
    expect(res.statusCode).toBe(401);
  });
});
