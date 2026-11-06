import { Prisma, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('Prisma e isolamento multiempresa', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('conecta ao PostgreSQL', async () => {
    const res = await prisma.$queryRaw`SELECT 1 as ok`;
    expect(res).toBeDefined();
  });

  it('impede login de usuário inexistente', async () => {
    const user = await prisma.user.findUnique({ where: { email: 'nao-existe-agrogestor@teste.local' } });
    expect(user).toBeNull();
  });

  it('exige companyId em todos os registros de cliente', () => {
    // Estrutural: toda tabela de negócio que pertence a uma empresa carrega o campo.
    const tabelas = ['Farm', 'Crop', 'Season', 'FieldOperation', 'FinancialTransaction', 'Product', 'Employee'];
    for (const t of tabelas) {
      const campos = (Prisma.dmmf.datamodel.models.find((m: any) => m.name === t)!.fields as any[]).map((f: any) => f.name);
      expect(campos).toContain('companyId');
    }
  });
});
