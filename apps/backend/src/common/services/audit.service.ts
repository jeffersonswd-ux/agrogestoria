import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../decorators';

export interface AuditInput {
  action: string;
  entity: string;
  entityId?: string;
  companyId?: string | null;
  actor?: AuthUser | null;
  before?: any;
  after?: any;
  ip?: string;
  userAgent?: string;
}

/**
 * Auditoria central. Nunca lança exceção (não deve quebrar a operação de negócio),
 * mas registra tudo em AuditLog — inclusive acessos do Super Admin a dados de clientes.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput): Promise<void> {
    try {
      const sanitize = (v: any) => this.sanitize(v);
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          companyId: input.companyId ?? input.actor?.companyId ?? null,
          userId: input.actor?.id ?? null,
          actorRole: input.actor?.role ?? null,
          before: input.before ? sanitize(input.before) : undefined,
          after: input.after ? sanitize(input.after) : undefined,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
        },
      });
    } catch (err) {
      this.logger.error(`Falha ao registrar auditoria: ${(err as Error).message}`);
    }
  }

  private sanitize(value: any): any {
    const sensitive = /password|passwordHash|senha|token|apiKey|secret/i;
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map((v) => this.sanitize(v));
    if (typeof value === 'object') {
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = sensitive.test(k) ? '[REDACTED]' : this.sanitize(v);
      }
      // Evita payloads gigantes
      const json = JSON.stringify(out);
      if (json.length > 8000) return { _truncated: true, preview: json.slice(0, 8000) };
      return out;
    }
    return value;
  }
}
