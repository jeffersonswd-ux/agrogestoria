import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [
      totalClients,
      activeClients,
      blockedClients,
      totalFarms,
      totalUsers,
      recentClients,
      whatsappConnections,
      aiByCompany,
      servers,
      aiUsage,
    ] = await this.prisma.$transaction([
      this.prisma.company.count(),
      this.prisma.company.count({ where: { status: 'ATIVO' } }),
      this.prisma.company.count({ where: { status: 'BLOQUEADO' } }),
      this.prisma.farm.count(),
      this.prisma.user.count({ where: { active: true } }),
      this.prisma.company.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          _count: { select: { farms: true, users: true } },
          users: { where: { role: 'ADMIN_CLIENTE' }, select: { email: true }, take: 1 },
        },
      }),
      this.prisma.whatsappInstance.groupBy({ by: ['status'], _count: { id: true } }) as any,
      this.prisma.aiUsage.groupBy({
        by: ['companyId'],
        _sum: { totalTokens: true, costUsd: true },
        _count: { id: true },
        orderBy: { _sum: { costUsd: 'desc' } },
        take: 10,
      }) as any,
      this.prisma.evolutionServer.findMany({ select: { id: true, name: true, baseUrl: true, status: true, _count: { select: { instances: true } } } }),
      this.prisma.aiUsage.aggregate({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { totalTokens: true, costUsd: true },
        _count: { id: true },
      }),
    ]);

    const [hectares, aiCompanyNames] = await Promise.all([
      this.prisma.farm.aggregate({ _sum: { totalAreaHa: true } }),
      this.prisma.company.findMany({
        where: { id: { in: aiByCompany.map((a) => a.companyId) } },
        select: { id: true, companyName: true, clientName: true },
      }),
    ]);

    return {
      totals: {
        clients: totalClients,
        activeClients,
        blockedClients,
        farms: totalFarms,
        hectares: hectares._sum.totalAreaHa ?? 0,
        users: totalUsers,
      },
      whatsapp: {
        connected: whatsappConnections.find((w) => w.status === 'CONECTADO')?._count?.id ?? 0,
        connectedCount: whatsappConnections.find((w) => w.status === 'CONECTADO')?._count?.id ?? 0,
        disconnected: whatsappConnections.find((w) => w.status !== 'CONECTADO')?._count?.id ?? 0,
        total: whatsappConnections.reduce((s, w) => s + w._count?.id, 0),
      },
      aiConsumption: {
        monthRequests: aiUsage._count.id,
        monthTokens: aiUsage._sum.totalTokens ?? 0,
        monthCostUsd: aiUsage._sum.costUsd ?? 0,
        byCompany: aiByCompany.map((a) => {
          const c = aiCompanyNames.find((x) => x.id === a.companyId);
          return {
            companyId: a.companyId,
            companyName: c?.companyName ?? 'Empresa excluída',
            requests: a._count?.id,
            tokens: a._sum?.totalTokens ?? 0,
            costUsd: a._sum?.costUsd ?? 0,
          };
        }),
      },
      integrations: servers.map((s) => ({
        id: s.id,
        name: s.name,
        baseUrl: s.baseUrl,
        status: s.status,
        instances: s._count.instances,
      })),
      recentClients: recentClients.map((c) => ({
        id: c.id,
        clientName: c.clientName,
        companyName: c.companyName,
        status: c.status,
        createdAt: c.createdAt,
        farmsCount: c._count.farms,
        usersCount: c._count.users,
        adminEmail: c.users[0]?.email ?? null,
      })),
    };
  }
}
