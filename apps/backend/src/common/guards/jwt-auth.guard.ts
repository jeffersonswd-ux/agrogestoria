import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators';
import { AuthUser } from '../decorators';
import { isSuperAdmin } from '../utils/roles';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('IS_PUBLIC_KEY', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const auth = request.headers?.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token de acesso ausente');
    }
    const token = auth.slice(7).trim();
    let payload: any;
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, companyId: true, active: true },
    });
    if (!user || !user.active) throw new UnauthorizedException('Usuário inativo ou inexistente');

    if (user.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: user.companyId },
        select: { status: true, blockedReason: true },
      });
      if (!company) throw new UnauthorizedException('Empresa não encontrada');
      if (company.status === 'BLOQUEADO') {
        throw new ForbiddenException(
          `Acesso bloqueado pelo administrador da plataforma${company.blockedReason ? `: ${company.blockedReason}` : ''}`,
        );
      }
    }

    request.user = user as AuthUser;
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length && !isSuperAdmin(user.role) && !required.includes(user.role)) {
      throw new ForbiddenException('Você não tem permissão para esta operação');
    }
    return true;
  }
}
