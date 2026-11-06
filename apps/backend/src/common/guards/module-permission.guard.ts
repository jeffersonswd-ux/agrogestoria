import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { MODULE_KEY } from '../decorators';
import { AuthUser } from '../decorators';
import { isSuperAdmin } from '../utils/roles';

/**
 * Impede o acesso a APIs de módulos não liberados para a empresa.
 * O Super Admin ignora esta restrição (precisa enxergar tudo para suporte).
 */
@Injectable()
export class ModulePermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const moduleKey = this.reflector.getAllAndOverride<string>(MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!moduleKey) return true;

    const request = context.switchToHttp().getRequest();
    const user: AuthUser = request.user;
    if (!user) return true;
    if (isSuperAdmin(user.role)) return true;
    if (!user.companyId) return true;

    const permission = await this.prisma.modulePermission.findUnique({
      where: { companyId_module: { companyId: user.companyId, module: moduleKey } },
      select: { enabled: true },
    });
    // Módulo sem registro explícito é considerado liberado (padrão),
    // a menos que a empresa tenha uma lista explícita que o exclua.
    if (!permission) {
      const others = await this.prisma.modulePermission.count({
        where: { companyId: user.companyId },
      });
      if (others === 0) return true;
      return false;
    }
    if (!permission.enabled) {
      throw new ForbiddenException(`O módulo "${moduleKey}" não está liberado para esta empresa`);
    }
    return true;
  }
}
