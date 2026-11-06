/**
 * Cria ou atualiza o Super Admin da plataforma.
 * Uso:
 *   node scripts/set-superadmin.js <email> <senha> [nome]
 */
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

function readEnv(file) {
  const env = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}

const env = readEnv(path.join(__dirname, '..', '.env'));
process.env.DATABASE_URL = process.env.DATABASE_URL || env.DATABASE_URL;

const prisma = new PrismaClient();

(async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();
  const senha = process.argv[3] || '';
  const nome = (process.argv[4] || 'Super Administrador').trim();

  if (!email || !senha) {
    console.error('Uso: node scripts/set-superadmin.js <email> <senha> [nome]');
    process.exit(1);
  }
  if (senha.length < 8) {
    console.error('A senha precisa ter pelo menos 8 caracteres.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(senha, 12);

  // Empresa técnica da plataforma (onde fica o Super Admin)
  let empresa = await prisma.company.findFirst({ where: { companyName: 'AgroGestor IA — Administração da Plataforma' } });
  if (!empresa) {
    empresa = await prisma.company.create({
      data: {
        clientName: 'Plataforma AgroGestor',
        companyName: 'AgroGestor IA — Administração da Plataforma',
        notes: 'Empresa técnica da plataforma, usada para o Super Admin. Não representa um cliente.',
      },
    });
  }

  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    await prisma.user.update({
      where: { id: existente.id },
      data: {
        name: nome,
        passwordHash,
        role: 'SUPER_ADMIN',
        active: true,
        mustChangePassword: false,
        failedAttempts: 0,
        lockedUntil: null,
        companyId: existente.companyId ?? empresa.id,
      },
    });
    // Encerra sessões antigas do usuário
    await prisma.refreshToken.updateMany({ where: { userId: existente.id }, data: { revokedAt: new Date() } });
    console.log(`Super Admin atualizado: ${email}`);
  } else {
    // Remove e-mails antigos de Super Admin que não sejam esta conta
    const antigos = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', email: { not: email } }, select: { id: true, email: true } });
    for (const a of antigos) {
      await prisma.user.delete({ where: { id: a.id } });
      console.log(`Super Admin anterior removido: ${a.email}`);
    }
    await prisma.user.create({
      data: {
        companyId: empresa.id,
        name: nome,
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        active: true,
        mustChangePassword: false,
      },
    });
    console.log(`Super Admin criado: ${email}`);
  }

  console.log(`Nome  : ${nome}`);
  console.log(`Senha : ${senha}`);
  await prisma.$disconnect();
})().catch(async (err) => {
  console.error('Erro:', err.message);
  await prisma.$disconnect();
  process.exit(1);
});
