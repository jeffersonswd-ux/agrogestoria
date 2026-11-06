import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Seed inicial: cria SOMENTE o primeiro Super Admin.
 * Nenhum cliente ou fazenda fictício é criado — o sistema inicia vazio,
 * conforme a regra de não popular o sistema com dados fictícios.
 */
async function main() {
  const email = (process.env.SUPERADMIN_EMAIL || 'admin@agrogestor.ia.br').trim().toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD || 'Agro@Admin2026';
  const name = process.env.SUPERADMIN_NAME || 'Super Administrador';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Super Admin já existe (${email}). Nada a fazer.`);
    await prisma.$disconnect();
    return;
  }

  const company = await prisma.company.create({
    data: {
      clientName: 'Plataforma AgroGestor',
      companyName: 'AgroGestor IA — Administração da Plataforma',
      email,
      notes: 'Empresa técnica da plataforma, usada para o Super Admin. Não representa um cliente.',
      status: 'ATIVO',
    },
  });

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      companyId: company.id,
      name,
      email,
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      mustChangePassword: false,
    },
  });

  console.log('─'.repeat(64));
  console.log(' Super Admin criado com sucesso');
  console.log('─'.repeat(64));
  console.log(` E-mail  : ${email}`);
  console.log(` Senha   : ${password}`);
  console.log(' Troque a senha após o primeiro acesso.');
  console.log('─'.repeat(64));

  await prisma.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
