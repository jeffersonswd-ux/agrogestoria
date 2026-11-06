import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import {
  CreateHarvestDto,
  CreateOperationDto,
  HarvestFilterDto,
  OperationFilterDto,
  UpdateOperationDto,
} from './dto/operation.dto';
import { CropsService } from './crops.service';

@Injectable()
export class OperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
    private readonly crops: CropsService,
  ) {}

  private async assertSeason(user: AuthUser, seasonId?: string) {
    if (!seasonId) return null;
    const season = await this.prisma.season.findUnique({
      where: { id: seasonId },
      select: { id: true, farmId: true, cropId: true, estimatedProduction: true, crop: { select: { areaHa: true } } },
    });
    if (!season) throw new NotFoundException('Safra não encontrada');
    await this.tenant.assertFarmAccess(user, season.farmId);
    return season;
  }

  private computeInputs(inputs: any[] = []) {
    return inputs.map((i) => ({
      productId: i.productId || null,
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unit: i.unit,
      unitCost: Number(i.unitCost) || 0,
      totalCost: (Number(i.quantity) || 0) * (Number(i.unitCost) || 0),
    }));
  }

  async list(user: AuthUser, q: OperationFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    if (q.seasonId) where.seasonId = q.seasonId;
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    const dateField = q.from || q.to ? { OR: [] as any[] } : null;
    if (dateField) {
      const range: any = {};
      if (q.from) range.gte = new Date(q.from);
      if (q.to) range.lte = new Date(q.to);
      dateField.OR.push({ plannedDate: range }, { doneDate: range }, { createdAt: range });
      where.AND = [...(where.AND || []), dateField];
    }
    if (q.search?.trim()) {
      where.description = { contains: q.search.trim(), mode: 'insensitive' };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.fieldOperation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          season: { select: { id: true, name: true, crop: { select: { culture: true } } } },
          inputs: true,
        },
      }),
      this.prisma.fieldOperation.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async create(user: AuthUser, dto: CreateOperationDto) {
    await this.tenant.assertFarmAccess(user, dto.farmId);
    if (dto.seasonId) {
      const season = await this.assertSeason(user, dto.seasonId);
      if (season!.farmId !== dto.farmId) throw new BadRequestException('A safra não pertence à fazenda informada');
    }
    const farm = await this.prisma.farm.findUniqueOrThrow({ where: { id: dto.farmId }, select: { companyId: true } });
    const inputs = this.computeInputs(dto.inputs);
    const op = await this.prisma.fieldOperation.create({
      data: {
        companyId: farm.companyId,
        farmId: dto.farmId,
        seasonId: dto.seasonId || null,
        plotId: dto.plotId || null,
        type: dto.type,
        description: dto.description || null,
        plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : null,
        doneDate: dto.doneDate ? new Date(dto.doneDate) : null,
        status: dto.status || 'PLANEJADA',
        employeeId: dto.employeeId || null,
        machineId: dto.machineId || null,
        areaHa: dto.areaHa ?? 0,
        hours: dto.hours ?? 0,
        fuelLiters: dto.fuelLiters ?? 0,
        cost: dto.cost ?? 0,
        notes: dto.notes || null,
        inputs: { create: inputs.map((i) => ({ ...i, companyId: farm.companyId })) },
      },
      include: { inputs: true },
    });
    await this.audit.log({ action: 'OPERACAO_CRIADA', entity: 'FieldOperation', entityId: op.id, actor: user, after: op });
    return op;
  }

  async update(user: AuthUser, id: string, dto: UpdateOperationDto) {
    const before = await this.prisma.fieldOperation.findUnique({ where: { id }, include: { inputs: true } });
    if (!before) throw new NotFoundException('Operação não encontrada');
    await this.tenant.assertFarmAccess(user, before.farmId);
    const farmId = dto.farmId || before.farmId;
    if (dto.farmId) await this.tenant.assertFarmAccess(user, farmId);
    const inputs = dto.inputs !== undefined ? this.computeInputs(dto.inputs) : undefined;
    const op = await this.prisma.$transaction(async (tx) => {
      if (inputs) await tx.operationInput.deleteMany({ where: { operationId: id } });
      return tx.fieldOperation.update({
        where: { id },
        data: {
          farmId,
          seasonId: dto.seasonId,
          plotId: dto.plotId,
          type: dto.type,
          description: dto.description,
          plannedDate: dto.plannedDate ? new Date(dto.plannedDate) : undefined,
          doneDate: dto.doneDate ? new Date(dto.doneDate) : undefined,
          status: dto.status,
          employeeId: dto.employeeId,
          machineId: dto.machineId,
          areaHa: dto.areaHa,
          hours: dto.hours,
          fuelLiters: dto.fuelLiters,
          cost: dto.cost,
          notes: dto.notes,
          ...(inputs
            ? { inputs: { create: inputs.map((i) => ({ ...i, companyId: before.companyId })) } }
            : {}),
        },
        include: { inputs: true },
      });
    });
    await this.audit.log({ action: 'OPERACAO_ATUALIZADA', entity: 'FieldOperation', entityId: id, actor: user, before, after: op });
    return op;
  }

  async remove(user: AuthUser, id: string) {
    const before = await this.prisma.fieldOperation.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Operação não encontrada');
    await this.tenant.assertFarmAccess(user, before.farmId);
    await this.prisma.fieldOperation.delete({ where: { id } });
    await this.audit.log({ action: 'OPERACAO_EXCLUIDA', entity: 'FieldOperation', entityId: id, actor: user, before });
    return { ok: true };
  }

  // ─── Colheitas ─────────────────────────────────────────────

  async listHarvests(user: AuthUser, q: HarvestFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    if (q.seasonId) where.seasonId = q.seasonId;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.harvest.findMany({
        where,
        skip,
        take,
        orderBy: { harvestDate: 'desc' },
        include: { season: { select: { id: true, name: true, crop: { select: { culture: true } } } } },
      }),
      this.prisma.harvest.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createHarvest(user: AuthUser, dto: CreateHarvestDto) {
    const season = await this.assertSeason(user, dto.seasonId);
    const seasonRow = await this.prisma.season.findUniqueOrThrow({
      where: { id: dto.seasonId },
      select: { companyId: true },
    });
    const harvest = await this.prisma.harvest.create({
      data: {
        companyId: seasonRow.companyId,
        farmId: season!.farmId,
        seasonId: dto.seasonId,
        harvestDate: new Date(dto.harvestDate),
        areaHarvested: dto.areaHarvested,
        quantity: dto.quantity,
        unit: dto.unit || 'sc',
        moisture: dto.moisture ?? null,
        quality: dto.quality || null,
        losses: dto.losses ?? null,
        notes: dto.notes || null,
      },
    });
    // Atualiza produção/rendimento/status da safra
    await this.crops.refreshSeason(dto.seasonId);
    await this.audit.log({ action: 'COLHEITA_CRIADA', entity: 'Harvest', entityId: harvest.id, actor: user, after: harvest });
    return harvest;
  }

  async removeHarvest(user: AuthUser, id: string) {
    const before = await this.prisma.harvest.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Colheita não encontrada');
    await this.tenant.assertFarmAccess(user, before.farmId);
    await this.prisma.harvest.delete({ where: { id } });
    await this.crops.refreshSeason(before.seasonId);
    await this.audit.log({ action: 'COLHEITA_EXCLUIDA', entity: 'Harvest', entityId: id, actor: user, before });
    return { ok: true };
  }
}
