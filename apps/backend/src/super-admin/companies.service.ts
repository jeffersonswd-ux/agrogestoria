import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AuthService } from '../auth/auth.service';
import { generatePassword, hashPassword } from '../common/utils/crypto';
import { AuthUser } from '../common/decorators';
import { APP_MODULES } from '../common/constants/modules';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import {
  CompanyQueryDto,
  CreateCompanyDto,
  ResetPasswordDto,
  UpdateCompanyDto,
  UpdateModulesDto,
} from './dto/company.dto';
import { UserRole } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
  ) {}

  private async ensureEmailFree(email: string, ignoreUserId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing && existing.id !== ignoreUserId) {
      throw new ConflictException('Este e-mail já está em uso por outro usuário');
    }
  }

  async list(q: CompanyQueryDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = {};
    if (q.status) where.status = q.status;
    if (q.state) where.state = { equals: q.state, mode: 'insensitive' };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { clientName: { contains: s, mode: 'insensitive' } },
        { companyName: { contains: s, mode: 'insensitive' } },
        { document: { contains: s } },
        { whatsapp: { contains: s } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { farms: true, users: true } },
          users: { where: { role: UserRole.ADMIN_CLIENTE }, select: { email: true, name: true }, take: 1 },
        },
      }),
      this.prisma.company.count({ where }),
    ]);
    return paginate(
      data.map((c) => ({
        ...c,
        farmsCount: c._count.farms,
        usersCount: c._count.users,
        adminUser: c.users[0] ?? null,
      })),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: {
        farms: { orderBy: { createdAt: 'desc' } },
        users: {
          select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        modulePermissions: true,
        evolutionServer: { select: { id: true, name: true, baseUrl: true, status: true } },
        whatsappInstances: true,
        _count: { select: { farms: true, users: true } },
      },
    });
    if (!company) throw new NotFoundException('Cliente não encontrado');
    return company;
  }

  async create(dto: CreateCompanyDto, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
    const adminEmail = dto.adminEmail.trim().toLowerCase();
    await this.ensureEmailFree(adminEmail);
    if (dto.document) {
      const dup = await this.prisma.company.findUnique({ where: { document: dto.document } });
      if (dup) throw new ConflictException('Já existe um cliente com este CPF/CNPJ');
    }
    const plainPassword = dto.adminPassword && dto.adminPassword.length >= 8 ? dto.adminPassword : generatePassword(14);
    const passwordHash = await hashPassword(plainPassword);
    const modules = dto.modules?.length ? Array.from(new Set(dto.modules)) : APP_MODULES.map((m) => m.key);
    const validKeys = new Set(APP_MODULES.map((m) => m.key));
    for (const m of modules) if (!validKeys.has(m)) throw new BadRequestException(`Módulo inválido: ${m}`);

    const company = await this.prisma.$transaction(async (tx) => {
      const c = await tx.company.create({
        data: {
          clientName: dto.clientName,
          companyName: dto.companyName,
          legalName: dto.legalName ?? null,
          document: dto.document || null,
          email: dto.email || null,
          whatsapp: dto.whatsapp || null,
          phone: dto.phone || null,
          city: dto.city || null,
          state: dto.state || null,
          address: dto.address || null,
          notes: dto.notes || null,
          status: dto.status || 'ATIVO',
          simpleMode: !!dto.simpleMode,
          userLimit: dto.userLimit ?? null,
          aiMonthlyLimit: dto.aiMonthlyLimit ?? null,
          evolutionServerId: dto.evolutionServerId || null,
        },
      });
      await tx.user.create({
        data: {
          companyId: c.id,
          name: dto.adminName,
          email: adminEmail,
          passwordHash,
          role: UserRole.ADMIN_CLIENTE,
          mustChangePassword: dto.requirePasswordChange ?? true,
        },
      });
      await tx.modulePermission.createMany({
        data: APP_MODULES.map((m) => ({ companyId: c.id, module: m.key, enabled: modules.includes(m.key) })),
      });
      return c;
    });

    await this.audit.log({
      action: 'CLIENTE_CRIADO',
      entity: 'Company',
      entityId: company.id,
      companyId: company.id,
      actor,
      after: { companyName: company.companyName, clientName: company.clientName, adminEmail, modules },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      company,
      credentials: {
        email: adminEmail,
        password: plainPassword,
        generatedPassword: !dto.adminPassword,
      },
    };
  }

  async update(id: string, dto: UpdateCompanyDto, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
    const before = await this.prisma.company.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Cliente não encontrado');

    if (dto.document && dto.document !== before.document) {
      const dup = await this.prisma.company.findUnique({ where: { document: dto.document } });
      if (dup) throw new ConflictException('Já existe um cliente com este CPF/CNPJ');
    }

    const { adminName, adminEmail, adminPassword, requirePasswordChange, modules, ...companyData } = dto as any;

    const company = await this.prisma.company.update({
      where: { id },
      data: {
        clientName: companyData.clientName,
        companyName: companyData.companyName,
        legalName: companyData.legalName,
        document: companyData.document || null,
        email: companyData.email,
        whatsapp: companyData.whatsapp,
        phone: companyData.phone,
        city: companyData.city,
        state: companyData.state,
        address: companyData.address,
        notes: companyData.notes,
        simpleMode: companyData.simpleMode,
        userLimit: companyData.userLimit,
        aiMonthlyLimit: companyData.aiMonthlyLimit,
        evolutionServerId: companyData.evolutionServerId,
      },
    });

    if (modules?.length) {
      await this.setModules(id, modules, actor, meta);
    }

    // Atualização de dados do administrador principal do cliente
    if (adminName || adminEmail) {
      const admin = await this.prisma.user.findFirst({
        where: { companyId: id, role: UserRole.ADMIN_CLIENTE },
        orderBy: { createdAt: 'asc' },
      });
      if (admin) {
        if (adminEmail && adminEmail.toLowerCase() !== admin.email) {
          await this.ensureEmailFree(adminEmail, admin.id);
        }
        await this.prisma.user.update({
          where: { id: admin.id },
          data: {
            name: adminName || admin.name,
            email: adminEmail ? adminEmail.toLowerCase() : admin.email,
            ...(adminPassword && adminPassword.length >= 8
              ? {
                  passwordHash: await hashPassword(adminPassword),
                  mustChangePassword: requirePasswordChange ?? true,
                }
              : {}),
          },
        });
        if (adminPassword && adminPassword.length >= 8) {
          await this.prisma.refreshToken.updateMany({ where: { userId: admin.id }, data: { revokedAt: new Date() } });
        }
      }
    }

    await this.audit.log({
      action: 'CLIENTE_ATUALIZADO',
      entity: 'Company',
      entityId: id,
      companyId: id,
      actor,
      before,
      after: company,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return company;
  }

  async block(id: string, reason: string | undefined, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
    const before = await this.prisma.company.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Cliente não encontrado');
    const company = await this.prisma.company.update({
      where: { id },
      data: { status: 'BLOQUEADO', blockedReason: reason || null, blockedAt: new Date() },
    });
    await this.auth.revokeAllForCompany(id);
    await this.audit.log({
      action: 'CLIENTE_BLOQUEADO',
      entity: 'Company',
      entityId: id,
      companyId: id,
      actor,
      before: { status: before.status },
      after: { status: 'BLOQUEADO', reason },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return company;
  }

  async unblock(id: string, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
    const before = await this.prisma.company.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Cliente não encontrado');
    const company = await this.prisma.company.update({
      where: { id },
      data: { status: 'ATIVO', blockedReason: null, blockedAt: null },
    });
    await this.audit.log({
      action: 'CLIENTE_DESBLOQUEADO',
      entity: 'Company',
      entityId: id,
      companyId: id,
      actor,
      before: { status: before.status },
      after: { status: 'ATIVO' },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return company;
  }

  async resetAdminPassword(
    id: string,
    dto: ResetPasswordDto,
    actor: AuthUser,
    meta: { ip?: string; userAgent?: string },
    userId?: string,
  ) {
    const user = userId
      ? await this.prisma.user.findFirst({ where: { id: userId, companyId: id } })
      : await this.prisma.user.findFirst({
          where: { companyId: id, role: UserRole.ADMIN_CLIENTE },
          orderBy: { createdAt: 'asc' },
        });
    if (!user) throw new NotFoundException('Usuário administrador não encontrado');
    const plainPassword = dto.password && dto.password.length >= 8 ? dto.password : generatePassword(14);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(plainPassword),
        mustChangePassword: dto.requirePasswordChange ?? true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
    await this.prisma.refreshToken.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await this.audit.log({
      action: 'SENHA_REDEFINIDA_SUPERADMIN',
      entity: 'User',
      entityId: user.id,
      companyId: id,
      actor,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return { email: user.email, password: plainPassword, generatedPassword: !dto.password };
  }

  async getModules(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      select: { id: true, simpleMode: true, modulePermissions: true },
    });
    if (!company) throw new NotFoundException('Cliente não encontrado');
    const map = new Map(company.modulePermissions.map((p) => [p.module, p.enabled]));
    return {
      simpleMode: company.simpleMode,
      modules: APP_MODULES.map((m) => ({ ...m, enabled: map.has(m.key) ? map.get(m.key) : false })),
    };
  }

  async setModules(
    id: string,
    modules: string[],
    actor: AuthUser,
    meta: { ip?: string; userAgent?: string } = {},
  ) {
    const validKeys = new Set(APP_MODULES.map((m) => m.key));
    for (const m of modules) if (!validKeys.has(m)) throw new BadRequestException(`Módulo inválido: ${m}`);
    const enabled = new Set(modules);
    await this.prisma.$transaction(
      APP_MODULES.map((m) =>
        this.prisma.modulePermission.upsert({
          where: { companyId_module: { companyId: id, module: m.key } },
          create: { companyId: id, module: m.key, enabled: enabled.has(m.key) },
          update: { enabled: enabled.has(m.key) },
        }),
      ),
    );
    await this.audit.log({
      action: 'MODULOS_ATUALIZADOS',
      entity: 'Company',
      entityId: id,
      companyId: id,
      actor,
      after: { modules },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return this.getModules(id);
  }

  async remove(id: string, confirmation: string, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
    if (confirmation !== 'EXCLUIR') {
      throw new BadRequestException('Confirmação inválida. Digite EXCLUIR para remover o cliente.');
    }
    const company = await this.prisma.company.findUnique({ where: { id }, select: { id: true, companyName: true } });
    if (!company) throw new NotFoundException('Cliente não encontrado');
    // Retenção: o registro da auditoria é mantido (companyId fica nulo via SetNull)
    await this.auth.revokeAllForCompany(id);
    await this.audit.log({
      action: 'CLIENTE_EXCLUIDO',
      entity: 'Company',
      entityId: id,
      companyId: id,
      actor,
      before: company,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await this.prisma.company.delete({ where: { id } });
    return { ok: true };
  }

  async history(id: string, page = 1, pageSize = 50) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where: { companyId: id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where: { companyId: id } }),
    ]);
    return paginate(data, total, page, pageSize);
  }
}
