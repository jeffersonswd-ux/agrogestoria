import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { generatePassword, hashPassword } from '../common/utils/crypto';
import { AuthUser } from '../common/decorators';
import { isSuperAdmin } from '../common/utils/roles';

export interface CreateTenantUserDto {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  farmIds?: string[];
  mustChangePassword?: boolean;
  active?: boolean;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private companyOf(user: AuthUser) {
    if (isSuperAdmin(user.role) || !user.companyId) {
      throw new BadRequestException('Operação disponível apenas para usuários de empresas clientes');
    }
    return user.companyId;
  }

  async list(user: AuthUser) {
    const companyId = this.companyOf(user);
    const data = await this.prisma.user.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, name: true, email: true, role: true, active: true, phone: true,
        lastLoginAt: true, createdAt: true, mustChangePassword: true,
        farms: { select: { farm: { select: { id: true, name: true } } } },
      },
    });
    return data.map((u) => ({ ...u, farms: u.farms.map((f) => f.farm) }));
  }

  private async validateFarmIds(companyId: string, farmIds?: string[]) {
    if (!farmIds?.length) return [];
    const found = await this.prisma.farm.count({ where: { id: { in: farmIds }, companyId } });
    if (found !== farmIds.length) throw new BadRequestException('Fazenda inválida para esta empresa');
    return farmIds;
  }

  async create(user: AuthUser, dto: CreateTenantUserDto) {
    const companyId = this.companyOf(user);
    if (dto.role === UserRole.SUPER_ADMIN) throw new BadRequestException('Perfil inválido');
    const company = await this.prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    if (company.userLimit) {
      const count = await this.prisma.user.count({ where: { companyId, active: true } });
      if (count >= company.userLimit) throw new BadRequestException(`Limite de ${company.userLimit} usuários atingido`);
    }
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('E-mail já cadastrado');
    const farmIds = await this.validateFarmIds(companyId, dto.farmIds);
    const password = dto.password && dto.password.length >= 8 ? dto.password : generatePassword(14);
    const created = await this.prisma.user.create({
      data: {
        companyId,
        name: dto.name,
        email,
        role: dto.role,
        phone: dto.phone || null,
        passwordHash: await hashPassword(password),
        mustChangePassword: dto.mustChangePassword ?? true,
        farms: { create: farmIds.map((farmId) => ({ farmId })) },
      },
      select: { id: true, name: true, email: true, role: true },
    });
    await this.audit.log({ action: 'USUARIO_CRIADO', entity: 'User', entityId: created.id, actor: user, after: created });
    return { user: created, credentials: { email, password, generatedPassword: !dto.password } };
  }

  async update(user: AuthUser, id: string, dto: Partial<CreateTenantUserDto>) {
    const companyId = this.companyOf(user);
    const target = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (target.role === UserRole.SUPER_ADMIN) throw new BadRequestException('Perfil protegido');
    if (dto.role === UserRole.SUPER_ADMIN) throw new BadRequestException('Perfil inválido');
    if (dto.email && dto.email.toLowerCase() !== target.email) {
      if (await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })) {
        throw new ConflictException('E-mail já cadastrado');
      }
    }
    const data: any = {
      name: dto.name, role: dto.role, phone: dto.phone, active: dto.active,
      email: dto.email?.toLowerCase(),
    };
    if (dto.password && dto.password.length >= 8) {
      data.passwordHash = await hashPassword(dto.password);
      data.mustChangePassword = dto.mustChangePassword ?? true;
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id }, data });
      if (dto.farmIds !== undefined) {
        const farmIds = await this.validateFarmIds(companyId, dto.farmIds);
        await tx.userFarm.deleteMany({ where: { userId: id } });
        if (farmIds.length) await tx.userFarm.createMany({ data: farmIds.map((farmId) => ({ userId: id, farmId })) });
      }
      if (dto.active === false || data.passwordHash) {
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return u;
    });
    await this.audit.log({ action: 'USUARIO_ATUALIZADO', entity: 'User', entityId: id, actor: user, after: { ...updated, passwordHash: undefined } });
    return updated;
  }

  async remove(user: AuthUser, id: string) {
    const companyId = this.companyOf(user);
    if (id === user.id) throw new BadRequestException('Você não pode desativar seu próprio usuário');
    const target = await this.prisma.user.findFirst({ where: { id, companyId } });
    if (!target) throw new NotFoundException('Usuário não encontrado');
    if (target.role === UserRole.SUPER_ADMIN) throw new BadRequestException('Perfil protegido');
    await this.prisma.user.update({ where: { id }, data: { active: false } });
    await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
    await this.audit.log({ action: 'USUARIO_DESATIVADO', entity: 'User', entityId: id, actor: user });
    return { ok: true };
  }
}
