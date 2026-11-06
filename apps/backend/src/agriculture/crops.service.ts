import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { CropFilterDto, CreateCropDto, CreateSeasonDto, SeasonFilterDto, UpdateCropDto, UpdateSeasonDto } from './dto/crop.dto';

@Injectable()
export class CropsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}

  async listCrops(user: AuthUser, q: CropFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    if (q.culture) where.culture = { contains: q.culture, mode: 'insensitive' };
    if (q.search?.trim()) {
      where.OR = [
        { culture: { contains: q.search.trim(), mode: 'insensitive' } },
        { variety: { contains: q.search.trim(), mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.crop.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          farm: { select: { id: true, name: true } },
          plot: { select: { id: true, name: true } },
          _count: { select: { seasons: true } },
        },
      }),
      this.prisma.crop.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createCrop(user: AuthUser, dto: CreateCropDto) {
    await this.tenant.assertFarmAccess(user, dto.farmId);
    if (dto.plotId) {
      const plot = await this.prisma.plot.findUnique({ where: { id: dto.plotId }, select: { farmId: true } });
      if (!plot || plot.farmId !== dto.farmId) {
        throw new BadRequestException('O talhão informado não pertence à fazenda selecionada');
      }
    }
    const farm = await this.prisma.farm.findUniqueOrThrow({ where: { id: dto.farmId }, select: { companyId: true } });
    const crop = await this.prisma.crop.create({
      data: {
        companyId: farm.companyId,
        farmId: dto.farmId,
        plotId: dto.plotId || null,
        culture: dto.culture,
        variety: dto.variety || null,
        areaHa: dto.areaHa ?? 0,
        cycle: dto.cycle || null,
        notes: dto.notes || null,
      },
    });
    await this.audit.log({ action: 'CULTURA_CRIADA', entity: 'Crop', entityId: crop.id, actor: user, after: crop });
    return crop;
  }

  async updateCrop(user: AuthUser, id: string, dto: UpdateCropDto) {
    const before = await this.prisma.crop.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Cultura não encontrada');
    await this.tenant.assertFarmAccess(user, before.farmId);
    if (dto.farmId) await this.tenant.assertFarmAccess(user, dto.farmId);
    const crop = await this.prisma.crop.update({
      where: { id },
      data: {
        farmId: dto.farmId,
        plotId: dto.plotId,
        culture: dto.culture,
        variety: dto.variety,
        areaHa: dto.areaHa,
        cycle: dto.cycle,
        notes: dto.notes,
        active: dto.active,
      },
    });
    await this.audit.log({ action: 'CULTURA_ATUALIZADA', entity: 'Crop', entityId: id, actor: user, before, after: crop });
    return crop;
  }

  async removeCrop(user: AuthUser, id: string) {
    const before = await this.prisma.crop.findUnique({ where: { id }, include: { _count: { select: { seasons: true } } } });
    if (!before) throw new NotFoundException('Cultura não encontrada');
    await this.tenant.assertFarmAccess(user, before.farmId);
    if (before._count.seasons > 0) {
      throw new BadRequestException('Cultura com safras registradas não pode ser excluída');
    }
    await this.prisma.crop.delete({ where: { id } });
    await this.audit.log({ action: 'CULTURA_EXCLUIDA', entity: 'Crop', entityId: id, actor: user, before });
    return { ok: true };
  }

  // ─── Safras ────────────────────────────────────────────────

  async listSeasons(user: AuthUser, q: SeasonFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    if (q.cropId) where.cropId = q.cropId;
    if (q.status) where.status = q.status;
    if (q.culture) where.crop = { culture: { contains: q.culture, mode: 'insensitive' } };
    if (q.search?.trim()) where.name = { contains: q.search.trim(), mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.season.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          farm: { select: { id: true, name: true } },
          crop: { select: { id: true, culture: true, variety: true, areaHa: true, plot: { select: { name: true } } } },
        },
      }),
      this.prisma.season.count({ where }),
    ]);
    const withCalc = data.map((s) => ({
      ...s,
      productivity:
        s.harvestedProduction && s.crop.areaHa > 0 ? s.harvestedProduction / s.crop.areaHa : s.actualYield ?? s.estimatedYield,
    }));
    return paginate(withCalc, total, page, pageSize);
  }

  private async recalcSeason(seasonId: string) {
    const season = await this.prisma.season.findUnique({ where: { id: seasonId }, include: { crop: true, harvests: true } });
    if (!season) return;
    const harvested = season.harvests.reduce((s, h) => s + h.quantity, 0);
    const area = season.crop.areaHa || 0;
    const harvestedArea = season.harvests.reduce((s, h) => s + h.areaHarvested, 0);
    const actualYield = area > 0 ? harvested / area : null;
    const estimatedYield = area > 0 && season.estimatedProduction ? season.estimatedProduction / area : null;
    await this.prisma.season.update({
      where: { id: seasonId },
      data: {
        harvestedProduction: harvested,
        actualYield,
        estimatedYield,
        status: harvestedArea > 0 ? (season.status === 'CANCELADA' ? 'CANCELADA' : 'COLHIDA') : season.status,
      },
    });
  }

  async createSeason(user: AuthUser, dto: CreateSeasonDto) {
    const crop = await this.prisma.crop.findUnique({ where: { id: dto.cropId }, select: { farmId: true, companyId: true } });
    if (!crop) throw new NotFoundException('Cultura não encontrada');
    await this.tenant.assertFarmAccess(user, crop.farmId);
    const season = await this.prisma.season.create({
      data: {
        companyId: crop.companyId,
        farmId: crop.farmId,
        cropId: dto.cropId,
        name: dto.name,
        plantingDatePlan: dto.plantingDatePlan ? new Date(dto.plantingDatePlan) : null,
        plantingDateDone: dto.plantingDateDone ? new Date(dto.plantingDateDone) : null,
        harvestDatePlan: dto.harvestDatePlan ? new Date(dto.harvestDatePlan) : null,
        harvestDateDone: dto.harvestDateDone ? new Date(dto.harvestDateDone) : null,
        estimatedProduction: dto.estimatedProduction ?? null,
        harvestedProduction: dto.harvestedProduction ?? null,
        unit: dto.unit || 'sc',
        plannedCost: dto.plannedCost ?? 0,
        estimatedRevenue: dto.estimatedRevenue ?? null,
        status: dto.status || 'PLANEJADA',
        notes: dto.notes || null,
      },
    });
    await this.audit.log({ action: 'SAFRA_CRIADA', entity: 'Season', entityId: season.id, actor: user, after: season });
    return season;
  }

  async updateSeason(user: AuthUser, id: string, dto: UpdateSeasonDto) {
    const before = await this.prisma.season.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Safra não encontrada');
    await this.tenant.assertFarmAccess(user, before.farmId);
    if (dto.cropId && dto.cropId !== before.cropId) await this.tenant.assertFarmAccess(user, before.farmId);
    const season = await this.prisma.season.update({
      where: { id },
      data: {
        cropId: dto.cropId,
        name: dto.name,
        plantingDatePlan: dto.plantingDatePlan ? new Date(dto.plantingDatePlan) : undefined,
        plantingDateDone: dto.plantingDateDone ? new Date(dto.plantingDateDone) : undefined,
        harvestDatePlan: dto.harvestDatePlan ? new Date(dto.harvestDatePlan) : undefined,
        harvestDateDone: dto.harvestDateDone ? new Date(dto.harvestDateDone) : undefined,
        estimatedProduction: dto.estimatedProduction,
        harvestedProduction: dto.harvestedProduction,
        unit: dto.unit,
        plannedCost: dto.plannedCost,
        estimatedRevenue: dto.estimatedRevenue,
        status: dto.status,
        notes: dto.notes,
      },
    });
    await this.recalcSeason(id);
    await this.audit.log({ action: 'SAFRA_ATUALIZADA', entity: 'Season', entityId: id, actor: user, before, after: season });
    return season;
  }

  async removeSeason(user: AuthUser, id: string) {
    const before = await this.prisma.season.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Safra não encontrada');
    await this.tenant.assertFarmAccess(user, before.farmId);
    await this.prisma.season.delete({ where: { id } });
    await this.audit.log({ action: 'SAFRA_EXCLUIDA', entity: 'Season', entityId: id, actor: user, before });
    return { ok: true };
  }

  async compareSeasons(user: AuthUser, farmId?: string) {
    const where: any = { ...this.tenant.scope(user) };
    if (farmId) where.farmId = farmId;
    const seasons = await this.prisma.season.findMany({
      where,
      include: {
        farm: { select: { name: true } },
        crop: { select: { culture: true, variety: true, areaHa: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return seasons.map((s) => ({
      id: s.id,
      name: s.name,
      culture: s.crop.culture,
      variety: s.crop.variety,
      farm: s.farm.name,
      areaHa: s.crop.areaHa,
      estimatedProduction: s.estimatedProduction,
      harvestedProduction: s.harvestedProduction,
      estimatedYield: s.estimatedYield,
      actualYield: s.actualYield,
      costPerHa: s.crop.areaHa > 0 ? s.actualCost / s.crop.areaHa : 0,
      revenue: s.actualRevenue,
      status: s.status,
    }));
  }

  async /** recalc público para uso por colheitas */ refreshSeason(seasonId: string) {
    return this.recalcSeason(seasonId);
  }
}
