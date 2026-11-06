import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'agro:roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const MODULE_KEY = 'agro:module';
/** Exige que o módulo esteja liberado para a empresa do usuário. */
export const RequireModule = (moduleKey: string) => SetMetadata(MODULE_KEY, moduleKey);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
}

/** Injeta o usuário autenticado no handler. */
export const CurrentUser = createParamDecorator((data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  const user: AuthUser = request.user;
  return data ? user?.[data] : user;
});
