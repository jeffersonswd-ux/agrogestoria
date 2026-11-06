import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuthUser } from '../common/decorators';

export interface DashboardFilters {
  farmId?: string;
  seasonId?: string;
  culture?: string;
  plotId?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  async overview(user: AuthUser, f: DashboardFilters) {
    const scope = this.tenant.scope(user);
    const farmWhere: any = { ...scope };
    if (f.farmId) farmWhere.id = f.farmId;
    const txWhere: any = { ...scope };
    if (f.farmId) txWhere.farmId = f.farmId;
    if (f.from || f.to) {
      txWhere.dueDate = {};
      if (f.from) txWhere.dueDate.gte = new Date(f.from);
      if (f.to) txWhere.dueDate.lte = new Date(`${f.to}T23:59:59`);
    }
    const cropWhere: any = { ...scope };
    if (f.farmId) cropWhere.farmId = f.farmId;
    if (f.culture) cropWhere.culture = { contains: f.culture, mode: 'insensitive' };
    const seasonWhere: any = { ...scope };
    if (f.farmId) seasonWhere.farmId = f.farmId;
    if (f.seasonId) seasonWhere.id = f.seasonId;
    if (f.culture) seasonWhere.crop = { culture: { contains: f.culture, mode: 'insensitive' } };
    const opWhere: any = { ...scope };
    if (f.farmId) opWhere.farmId = f.farmId;
    if (f.seasonId) opWhere.seasonId = f.seasonId;

    const [
      farms,
      crops,
      seasons,
      txAgg,
      txStatus,
      ops,
      harvestAgg,
      recentOps,
      monthTx,
    ] = await this.prisma.$transaction([
      this.prisma.farm.findMany({
        where: farmWhere,
        select: { id: true, name: true, totalAreaHa: true, agriculturalAreaHa: true, availableAreaHa: true, latitude: true, longitude: true, municipality: true, state: true },
      }),
      this.prisma.crop.findMany({ where: cropWhere, select: { id: true, culture: true, areaHa: true } }),
      this.prisma.season.findMany({
        where: seasonWhere,
        select: { id: true, status: true, estimatedProduction: true, harvestedProduction: true, estimatedYield: true, actualYield: true, actualCost: true },
      }),
      this.prisma.financialTransaction.groupBy({
        by: ['type'],
        where: txWhere,
        _sum: { amount: true, paidAmount: true },
      }) as any,
      this.prisma.financialTransaction.groupBy({
        by: ['type', 'status'],
        where: txWhere,
        _count: { id: true },
        _sum: { amount: true },
      }) as any,
      this.prisma.fieldOperation.groupBy({
        by: ['status'],
        where: opWhere,
        _count: { id: true },
      }) as any,
      this.prisma.harvest.aggregate({ where: txWhere.farmId ? { ...scope, farmId: txWhere.farmId } : { ...scope }, _sum: { quantity: true } }),
      this.prisma.fieldOperation.findMany({
        where: opWhere,
        orderBy: { createdAt: 'desc' },
        take: 6,
        include: { season: { select: { name: true, crop: { select: { culture: true } } } } },
      }),
      this.prisma.financialTransaction.findMany({
        where: { ...txWhere, paidDate: { not: null } },
        select: { type: true, paidAmount: true, paidDate: true },
      }),
    ]);

    const totalArea = farms.reduce((s, f) => s + f.totalAreaHa, 0);
    const plantedArea = crops.reduce((s, c) => s + c.areaHa, 0);
    const availableArea = farms.reduce(
      (s, f) => s + (f.availableAreaHa || Math.max(0, f.totalAreaHa - f.agriculturalAreaHa)),
      0,
    );

    const investment = txAgg.find((t) => t.type === 'PAGAR')?._sum?.amount ?? 0;
    const revenueEstimated = txAgg.find((t) => t.type === 'RECEBER')?._sum?.amount ?? 0;
    const paid = txAgg.find((t) => t.type === 'PAGAR')?._sum?.paidAmount ?? 0;
    const received = txAgg.find((t) => t.type === 'RECEBER')?._sum?.paidAmount ?? 0;
    const profit = received - paid;

    const epEstimated = seasons.reduce((s, x) => s + (x.estimatedProduction ?? 0), 0);
    const epHarvested = seasons.reduce((s, x) => s + (x.harvestedProduction ?? 0), 0);
    const avgYield =
      seasons.filter((s) => s.actualYield).length > 0
        ? seasons.filter((s) => s.actualYield).reduce((s, x) => s + (x.actualYield ?? 0), 0) /
          seasons.filter((s) => s.actualYield).length
        : 0;

    const totalCost = seasons.reduce((s, x) => s + (x.actualCost ?? 0), 0);
    const costPerHa = plantedArea > 0 ? totalCost / plantedArea : 0;
    const costPerBag = epHarvested > 0 ? totalCost / epHarvested : 0;

    const payable = txStatus
      .filter((t) => t.type === 'PAGAR' && ['PENDENTE', 'PARCIAL', 'VENCIDO'].includes(t.status))
      .reduce((s, t) => s + (t._sum?.amount ?? 0), 0);
    const receivable = txStatus
      .filter((t) => t.type === 'RECEBER' && ['PENDENTE', 'PARCIAL', 'VENCIDO'].includes(t.status))
      .reduce((s, t) => s + t._sum.amount, 0);

    const countOps = (st: string) => ops.find((o) => o.status === st)?._count?.id ?? 0;

    // Receita x despesa por mês (últimos 12 meses por data de baixa)
    const monthly = this.monthlySeries(monthTx);

    const costsByCulture = this.costsByCulture(user, f);

    return {
      filters: f,
      cards: {
        areaTotal: totalArea,
        areaPlanted: plantedArea,
        areaAvailable: availableArea,
        investment,
        revenueEstimated,
        revenueRealized: received,
        costRealized: paid,
        profit,
        estimatedProduction: epEstimated,
        harvestedProduction: epHarvested || (harvestAgg._sum.quantity ?? 0),
        averageYield: avgYield,
        totalCost,
        costPerHa,
        costPerBag,
        payable,
        receivable,
        cashFlow: received - paid,
        opsPlanned: countOps('PLANEJADA'),
        opsInProgress: countOps('EM_ANDAMENTO'),
        opsDone: countOps('CONCLUIDA'),
        opsLate: countOps('ATRASADA'),
        farmsCount: farms.length,
      },
      monthly,
      costsByCulture: (await costsByCulture).data,
      seasonPerformance: seasons.map((s) => ({
        status: s.status,
        estimated: s.estimatedProduction,
        harvested: s.harvestedProduction,
        yield: s.actualYield ?? s.estimatedYield,
      })),
      map: farms.map((f) => ({
        id: f.id,
        name: f.name,
        latitude: f.latitude,
        longitude: f.longitude,
        municipality: f.municipality,
        state: f.state,
        areaHa: f.totalAreaHa,
      })),
      recentOperations: recentOps.map((o) => ({
        id: o.id,
        type: o.type,
        description: o.description,
        status: o.status,
        doneDate: o.doneDate,
        createdAt: o.createdAt,
        season: o.season ? { name: o.season.name, culture: o.season.crop.culture } : null,
      })),
    };
  }

  private async costsByCulture(user: AuthUser, f: DashboardFilters) {
    const scope = this.tenant.scope(user);
    const colors: Record<string, string> = {
      Soja: '#f59e0b',
      Milho: '#16a34a',
      Sorgo: '#9333ea',
      'Cana-de-açúcar': '#2563eb',
      Hortifrúti: '#94a3b8',
      Outras: '#86efac',
    };
    const operations = await this.prisma.fieldOperation.findMany({
      where: { ...scope, cost: { gt: 0 }, ...(f.farmId ? { farmId: f.farmId } : {}) },
      select: { cost: true, season: { select: { crop: { select: { culture: true } } } } },
    });
    const map = new Map<string, number>();
    for (const o of operations) {
      const culture = o.season?.crop?.culture || 'Outras';
      map.set(culture, (map.get(culture) ?? 0) + o.cost);
    }
    const data = Array.from(map.entries()).map(([culture, value]) => ({
      culture,
      value: Math.round(value * 100) / 100,
      color: colors[culture] ?? '#22c55e',
    }));
    return { data };
  }

  private monthlySeries(txs: { type: string; paidAmount: number; paidDate: Date | null }[]) {
    const now = new Date();
    const months: { key: string; label: string; revenue: number; expense: number; balance: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth() + 1}`,
        label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        revenue: 0,
        expense: 0,
        balance: 0,
      });
    }
    for (const t of txs) {
      if (!t.paidDate) continue;
      const key = `${t.paidDate.getFullYear()}-${t.paidDate.getMonth() + 1}`;
      const m = months.find((x) => x.key === key);
      if (!m) continue;
      if (t.type === 'RECEBER') m.revenue += t.paidAmount;
      else m.expense += t.paidAmount;
    }
    months.forEach((m) => (m.balance = Math.round((m.revenue - m.expense) * 100) / 100));
    return months;
  }
}
