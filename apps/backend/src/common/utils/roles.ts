import { UserRole } from '@prisma/client';

export const SUPER_ADMIN_ROLE = UserRole.SUPER_ADMIN;

export function isSuperAdmin(role?: UserRole | string | null): boolean {
  return role === SUPER_ADMIN_ROLE;
}

/** Perfis de cliente (não Super Admin). */
export const CLIENT_ROLES: UserRole[] = [
  UserRole.ADMIN_CLIENTE,
  UserRole.GERENTE_FAZENDA,
  UserRole.OPERADOR,
  UserRole.FINANCEIRO,
  UserRole.AGRONOMO,
];

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_CLIENTE: 'Administrador do Cliente',
  GERENTE_FAZENDA: 'Gerente de Fazenda',
  OPERADOR: 'Operador',
  FINANCEIRO: 'Financeiro',
  AGRONOMO: 'Agrônomo',
};
