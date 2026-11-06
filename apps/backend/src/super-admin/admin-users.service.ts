import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { generatePassword, hashPassword } from '../common/utils/crypto';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { AdminUserQueryDto, CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { ResetPasswordDto } from './dto/company.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async validateFarmIds(companyId: string, farmIds?: string[]) {
    if (!farmIds?.length) return [];
    const found = await this.prisma.farm.count({ where: { id: { in: farmIds }, companyId } });
    if (found !== farmIds.length) {
      throw new BadRequestException('Uma ou mais fazendas não pertencem a esta empresa');
    }
    return farmIds;
  }

  async list(q: AdminUserQueryDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = {};
    if (q.companyId) where.companyId = q.companyId;
    if (q.role) where.role = q.role;
    if (q.active !== undefined && q.active !== '') where.active = q.active === 'true';
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { email: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          active: true,
          mustChangePassword: true,
          phone: true,
          lastLoginAt: true,
          createdAt: true,
          company: { select: { id: true, companyName: true, clientName: true } },
          farms: { select: { farmId: true, farm: { select: { id: true, name: true } } } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(
      data.map((u) => ({ ...u, farms: u.farms.map((f) => f.farm) })),
      total,
      page,
      pageSize,
    );
  }

  async create(dto: CreateAdminUserDto, actor: AuthUser) {
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Não é permitido criar outro Super Admin por esta tela');
    }
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    if (company.userLimit) {
      const count = await this.prisma.user.count({ where: { companyId: company.id, active: true } });
      if (count >= company.userLimit) {
        throw new BadRequestException(`Limite de usuários desta empresa atingido (${company.userLimit})`);
      }
    }
    const email = dto.email.trim().toLowerCase();
    const dup = await this.prisma.user.findUnique({ where: { email } });
    if (dup) throw new ConflictException('Este e-mail já está em uso');
    const farmIds = await this.validateFarmIds(dto.companyId, dto.farmIds);
    const password = dto.password && dto.password.length >= 8 ? dto.password : generatePassword(14);
    const user = await this.prisma.user.create({
      data: {
        companyId: dto.companyId,
        name: dto.name,
        email,
        passwordHash: await hashPassword(password),
        role: dto.role,
        phone: dto.phone || null,
        mustChangePassword: dto.mustChangePassword ?? true,
        farms: { create: farmIds.map((farmId) => ({ farmId })) },
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
    await this.audit.log({
      action: 'USUARIO_CRIADO_SUPERADMIN',
      entity: 'User',
      entityId: user.id,
      companyId: dto.companyId,
      actor,
      after: { ...user, farmIds },
    });
    return { user, credentials: { email, password, generatedPassword: !dto.password } };
  }

  async update(id: string, dto: UpdateAdminUserDto, actor: AuthUser) {
    const before = await this.prisma.user.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Usuário não encontrado');
    if (before.role === UserRole.SUPER_ADMIN && dto.role && dto.role !== UserRole.SUPER_ADMIN) {
      throw new BadRequestException('O perfil do Super Admin não pode ser alterado');
    }
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.mustChangePassword !== undefined) data.mustChangePassword = dto.mustChangePassword;
    if (dto.email && dto.email.toLowerCase() !== before.email) {
      const dup = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
      if (dup) throw new ConflictException('Este e-mail já está em uso');
      data.email = dto.email.toLowerCase();
    }
    if (dto.password && dto.password.length >= 8) {
      data.passwordHash = await hashPassword(dto.password);
      data.mustChangePassword = dto.mustChangePassword ?? true;
    }
    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id }, data });
      if (dto.farmIds !== undefined) {
        const farmIds = await this.validateFarmIds(before.companyId!, dto.farmIds);
        await tx.userFarm.deleteMany({ where: { userId: id } });
        if (farmIds.length) {
          await tx.userFarm.createMany({ data: farmIds.map((farmId) => ({ userId: id, farmId })) });
        }
      }
      if (dto.active === false || data.passwordHash) {
        await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      }
      return updated;
    });
    await this.audit.log({
      action: 'USUARIO_ATUALIZADO_SUPERADMIN',
      entity: 'User',
      entityId: id,
      companyId: before.companyId,
      actor,
      before,
      after: user,
    });
    return user;
  }

  async resetPassword(id: string, dto: ResetPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('A senha do Super Admin não pode ser redefinida por esta tela');
    }
    const password = dto.password && dto.password.length >= 8 ? dto.password : generatePassword(14);
    await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: dto.requirePasswordChange ?? true,
        failedAttempts: 0,
        lockedUntil: null,
      },
    });
    await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
    return { email: user.email, password, generatedPassword: !dto.password };
  }

  async remove(id: string, actor: AuthUser) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    if (user.role === UserRole.SUPER_ADMIN) throw new BadRequestException('O Super Admin não pode ser excluído');
    // Exclusão lógica: preserva histórico de auditoria
    await this.prisma.user.update({ where: { id }, data: { active: false } });
    await this.prisma.refreshToken.updateMany({ where: { userId: id }, data: { revokedAt: new Date() } });
    await this.audit.log({
      action: 'USUARIO_DESATIVADO',
      entity: 'User',
      entityId: id,
      companyId: user.companyId,
      actor,
      before: { active: user.active },
      after: { active: false },
    });
    return { ok: true };
  }
}
