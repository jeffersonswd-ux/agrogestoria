import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators';
import { isSuperAdmin } from '../utils/roles';

/**
 * Isolamento multiempresa.
 * - Usuário de cliente: TODA consulta é limitada a companyId do usuário.
 * - Super Admin: nenhum filtro de empresa (acesso global, sempre auditado pelo caller).
 */
@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  scope(user: AuthUser): { companyId?: string } {
    if (isSuperAdmin(user.role)) return {};
    if (!user.companyId) throw new ForbiddenException('Usuário sem empresa vinculada');
    return { companyId: user.companyId };
  }

  /** Empresa obrigatória para operações de escrita de cliente. */
  requireCompany(user: AuthUser, companyIdOverride?: string): string {
    if (isSuperAdmin(user.role)) {
      if (!companyIdOverride) throw new ForbiddenException('companyId é obrigatório para Super Admin');
      return companyIdOverride;
    }
    if (!user.companyId) throw new ForbiddenException('Usuário sem empresa vinculada');
    return user.companyId;
  }

  /**
   * Garante que o usuário pode operar a fazenda informada.
   * Valida empresa e, para perfis não-admin, o vínculo em UserFarm.
   */
  async assertFarmAccess(user: AuthUser, farmId: string): Promise<void> {
    if (!farmId) return;
    const farm = await this.prisma.farm.findUnique({
      where: { id: farmId },
      select: { companyId: true, status: true },
    });
    if (!farm) throw new ForbiddenException('Fazenda não encontrada');
    if (!isSuperAdmin(user.role)) {
      if (farm.companyId !== user.companyId) throw new ForbiddenException('Fazenda não pertence à sua empresa');
      if (user.role !== 'ADMIN_CLIENTE') {
        const link = await this.prisma.userFarm.findUnique({
          where: { userId_farmId: { userId: user.id, farmId } },
        });
        if (!link) throw new ForbiddenException('Você não tem acesso a esta fazenda');
      }
    }
  }

  /** Restringe campos de escrita: cliente não pode gravar para outro companyId. */
  stampCompany(user: AuthUser, data: Record<string, any>): Record<string, any> {
    if (isSuperAdmin(user.role)) return data;
    return { ...data, companyId: user.companyId };
  }
}
