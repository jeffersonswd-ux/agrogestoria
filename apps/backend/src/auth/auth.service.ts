import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import {
  hashPassword,
  verifyPassword,
  randomToken,
  sha256,
} from '../common/utils/crypto';
import { AuthUser } from '../common/decorators';
import { APP_MODULES, SIMPLE_MODE_MODULES } from '../common/constants/modules';
import { ChangePasswordDto, LoginDto } from './dto/auth.dto';

const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
  ) {}

  private ttlToMs(ttl: string): number {
    const m = /^(\d+)([smhd])$/.exec(ttl || '7d');
    if (!m) return 7 * 24 * 3600 * 1000;
    const n = Number(m[1]);
    const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[m[2]] as number;
    return n * unit;
  }

  private async issueTokens(
    userId: string,
    companyId: string | null,
    meta: { ip?: string; userAgent?: string },
  ) {
    const accessToken = await this.jwt.signAsync({ sub: userId, cid: companyId });
    const refreshRaw = randomToken(48);
    const ttl = process.env.JWT_REFRESH_TTL || '7d';
    await this.prisma.refreshToken.create({
      data: {
        userId,
        companyId,
        tokenHash: sha256(refreshRaw),
        expiresAt: new Date(Date.now() + this.ttlToMs(ttl)),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
    return { accessToken, refreshToken: refreshRaw };
  }

  async login(dto: LoginDto, meta: { ip?: string; userAgent?: string }) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { company: { select: { id: true, status: true, blockedReason: true, simpleMode: true } } },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Conta temporariamente bloqueada por tentativas inválidas. Tente novamente em alguns minutos.');
    }
    const valid = await verifyPassword(dto.password, user.passwordHash);
    if (!valid) {
      const failed = user.failedAttempts + 1;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAttempts: failed,
          lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
        },
      });
      await this.audit.log({
        action: 'LOGIN_FALHA',
        entity: 'User',
        entityId: user.id,
        companyId: user.companyId,
        before: null,
        after: null,
        ip: meta.ip,
        userAgent: meta.userAgent,
        actor: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId },
      });
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    if (user.company && user.company.status === 'BLOQUEADO') {
      throw new ForbiddenException(
        `Acesso bloqueado pelo administrador da plataforma${user.company.blockedReason ? `: ${user.company.blockedReason}` : ''}`,
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, user.companyId, meta);
    const profile = await this.buildProfile(user.id, user.company);
    await this.audit.log({
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      companyId: user.companyId,
      ip: meta.ip,
      actor: { id: user.id, email: user.email, name: user.name, role: user.role, companyId: user.companyId },
    });
    return { ...tokens, user: profile };
  }

  private async buildProfile(userId: string, company?: any) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        mustChangePassword: true,
        lastLoginAt: true,
      },
    });
    let modules: string[] = APP_MODULES.map((m) => m.key);
    let companyInfo = null;
    if (company || user.companyId) {
      const c =
        company ||
        (await this.prisma.company.findUnique({
          where: { id: user.companyId! },
          select: { id: true, clientName: true, companyName: true, status: true, simpleMode: true },
        }));
      companyInfo = c;
      const perms = await this.prisma.modulePermission.findMany({
        where: { companyId: user.companyId!, enabled: true },
        select: { module: true },
      });
      if (perms.length) modules = perms.map((p) => p.module);
      if (c?.simpleMode) modules = modules.filter((m) => SIMPLE_MODE_MODULES.includes(m));
    }
    return { ...user, company: companyInfo, modules };
  }

  async refresh(refreshToken: string, meta: { ip?: string; userAgent?: string }) {
    const hash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: { select: { id: true, active: true, companyId: true } } },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sessão expirada. Faça login novamente.');
    }
    if (!stored.user.active) throw new UnauthorizedException('Usuário inativo');
    if (stored.user.companyId) {
      const company = await this.prisma.company.findUnique({
        where: { id: stored.user.companyId },
        select: { status: true },
      });
      if (!company || company.status === 'BLOQUEADO') {
        await this.revokeAllForCompany(stored.user.companyId);
        throw new ForbiddenException('Acesso bloqueado pelo administrador da plataforma');
      }
    }
    // Rotação: revoga o token usado e emite um novo par
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    return this.issueTokens(stored.userId, stored.user.companyId, meta);
  }

  async logout(refreshToken: string, user: AuthUser) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: sha256(refreshToken), userId: user.id },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit.log({ action: 'LOGOUT', entity: 'User', entityId: user.id, actor: user });
    return { ok: true };
  }

  async me(user: AuthUser) {
    return this.buildProfile(user.id);
  }

  async changePassword(user: AuthUser, dto: ChangePasswordDto) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const ok = await verifyPassword(dto.currentPassword, dbUser.passwordHash);
    if (!ok) throw new BadRequestException('Senha atual incorreta');
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual');
    }
    const passwordHash = await hashPassword(dto.newPassword);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: false },
    });
    // Revoga outras sessões por segurança
    await this.prisma.refreshToken.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.log({ action: 'SENHA_ALTERADA', entity: 'User', entityId: user.id, actor: user });
    return { ok: true };
  }

  /** Revoga todas as sessões de uma empresa (usado ao bloquear cliente). */
  async revokeAllForCompany(companyId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { companyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
