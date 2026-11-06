import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { encryptSecret, decryptSecret } from '../common/utils/crypto';
import { AuthUser } from '../common/decorators';
import { CreateEvolutionServerDto, UpdateEvolutionServerDto } from './dto/integration.dto';

const TIMEOUT_MS = 10000;

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private safe(server: any) {
    return {
      ...server,
      apiKey: undefined,
      apiKeyMasked: server.apiKey ? `${decryptSecret(server.apiKey).slice(0, 4)}••••••••` : '',
      hasApiKey: !!server.apiKey,
    };
  }

  async list() {
    const data = await this.prisma.evolutionServer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { companies: true, instances: true } },
        instances: { select: { status: true } },
      },
    });
    return data.map((s) => ({
      ...this.safe(s),
      companiesCount: s._count.companies,
      instancesCount: s._count.instances,
      connectedInstances: s.instances.filter((i) => i.status === 'CONECTADO').length,
    }));
  }

  async create(dto: CreateEvolutionServerDto, actor: AuthUser) {
    const server = await this.prisma.evolutionServer.create({
      data: {
        name: dto.name,
        baseUrl: dto.baseUrl.replace(/\/+$/, ''),
        apiKey: encryptSecret(dto.apiKey),
        status: dto.status || 'ATIVO',
        notes: dto.notes || null,
      },
    });
    await this.audit.log({
      action: 'INTEGRACAO_EVOLUTION_CRIADA',
      entity: 'EvolutionServer',
      entityId: server.id,
      actor,
      after: { name: server.name, baseUrl: server.baseUrl },
    });
    return this.safe(server);
  }

  async update(id: string, dto: UpdateEvolutionServerDto, actor: AuthUser) {
    const before = await this.prisma.evolutionServer.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Servidor Evolution não encontrado');
    const server = await this.prisma.evolutionServer.update({
      where: { id },
      data: {
        name: dto.name,
        baseUrl: dto.baseUrl?.replace(/\/+$/, ''),
        ...(dto.apiKey && dto.apiKey !== '********' ? { apiKey: encryptSecret(dto.apiKey) } : {}),
        status: dto.status,
        notes: dto.notes,
      },
    });
    await this.audit.log({
      action: 'INTEGRACAO_EVOLUTION_ATUALIZADA',
      entity: 'EvolutionServer',
      entityId: id,
      actor,
      before: { name: before.name, baseUrl: before.baseUrl, status: before.status },
      after: { name: server.name, baseUrl: server.baseUrl, status: server.status },
    });
    return this.safe(server);
  }

  async remove(id: string, actor: AuthUser) {
    const server = await this.prisma.evolutionServer.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { companies: true } } },
    });
    if (!server) throw new NotFoundException('Servidor Evolution não encontrado');
    if (server._count.companies > 0) {
      throw new BadRequestException('Este servidor está vinculado a clientes. Desvincule antes de excluí-lo.');
    }
    await this.prisma.evolutionServer.delete({ where: { id } });
    await this.audit.log({ action: 'INTEGRACAO_EVOLUTION_EXCLUIDA', entity: 'EvolutionServer', entityId: id, actor, before: server });
    return { ok: true };
  }

  async testConnection(id: string) {
    const server = await this.prisma.evolutionServer.findUnique({ where: { id } });
    if (!server) throw new NotFoundException('Servidor Evolution não encontrado');
    const baseUrl = server.baseUrl.replace(/\/+$/, '');
    const apiKey = decryptSecret(server.apiKey);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
        headers: { apikey: apiKey },
        signal: ctrl.signal,
      });
      const ok = res.ok;
      const body = ok ? await res.json().catch(() => []) : null;
      return {
        ok,
        statusCode: res.status,
        instances: Array.isArray(body) ? body.length : null,
        message: ok ? 'Conexão com o servidor Evolution estabelecida' : `Servidor respondeu com status ${res.status}`,
      };
    } catch (err) {
      return {
        ok: false,
        statusCode: null,
        instances: null,
        message: (err as Error).name === 'AbortError' ? 'Tempo esgotado ao conectar' : `Falha: ${(err as Error).message}`,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  async aiUsage(q: { companyId?: string; from?: string; to?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 20));
    const where: any = {};
    if (q.companyId) where.companyId = q.companyId;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(`${q.to}T23:59:59.999Z`);
    }
    const [grouped, total, companies] = await Promise.all([
      this.prisma.aiUsage.groupBy({
        by: ['companyId'],
        where,
        _count: { id: true },
        _sum: { promptTokens: true, completionTokens: true, totalTokens: true, costUsd: true },
      }),
      this.prisma.aiUsage.count({ where }),
      this.prisma.company.findMany({ select: { id: true, companyName: true, clientName: true, aiMonthlyLimit: true } }),
    ]);
    const byCompany = grouped
      .map((g) => {
        const c = companies.find((x) => x.id === g.companyId);
        return {
          companyId: g.companyId,
          companyName: c?.companyName ?? '—',
          clientName: c?.clientName ?? '—',
          monthlyLimit: c?.aiMonthlyLimit ?? null,
          requests: g._count.id,
          promptTokens: g._sum.promptTokens ?? 0,
          completionTokens: g._sum.completionTokens ?? 0,
          totalTokens: g._sum.totalTokens ?? 0,
          costUsd: g._sum.costUsd ?? 0,
        };
      })
      .sort((a, b) => b.costUsd - a.costUsd);
    const start = (page - 1) * pageSize;
    return {
      summary: {
        totalRequests: total,
        totalTokens: byCompany.reduce((s, x) => s + x.totalTokens, 0),
        totalCostUsd: byCompany.reduce((s, x) => s + x.costUsd, 0),
      },
      data: byCompany.slice(start, start + pageSize),
      total: byCompany.length,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(byCompany.length / pageSize)),
    };
  }

  async aiUsageDetails(companyId: string, page = 1, pageSize = 50) {
    const where = { companyId };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.aiUsage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.aiUsage.count({ where }),
    ]);
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async auditLogs(q: {
    companyId?: string;
    action?: string;
    entity?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = Math.max(1, Number(q.page) || 1);
    const pageSize = Math.min(200, Math.max(1, Number(q.pageSize) || 30));
    const where: any = {};
    if (q.companyId) where.companyId = q.companyId;
    if (q.action) where.action = q.action;
    if (q.entity) where.entity = q.entity;
    if (q.from || q.to) {
      where.createdAt = {};
      if (q.from) where.createdAt.gte = new Date(q.from);
      if (q.to) where.createdAt.lte = new Date(`${q.to}T23:59:59.999Z`);
    }
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { action: { contains: s, mode: 'insensitive' } },
        { entity: { contains: s, mode: 'insensitive' } },
        { entityId: { contains: s } },
      ];
    }
    const [data, total, actions] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { name: true, email: true } },
          company: { select: { companyName: true, clientName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    ]);
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      actions: actions.map((a) => a.action),
    };
  }
}
