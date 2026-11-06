import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { CreateFarmDto, CreatePlotDto, FarmFilterDto, PlotFilterDto, UpdateFarmDto, UpdatePlotDto } from './dto/farm.dto';
import { isSuperAdmin } from '../common/utils/roles';

@Injectable()
export class FarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}

  /** IDs de fazendas que o usuário pode ver (controle por fazenda para perfis não-admin). */
  private async allowedFarmIds(user: AuthUser): Promise<string[] | null> {
    if (isSuperAdmin(user.role)) return null;
    if (user.role === 'ADMIN_CLIENTE') return null;
    const links = await this.prisma.userFarm.findMany({ where: { userId: user.id }, select: { farmId: true } });
    return links.map((l) => l.farmId);
  }

  async list(user: AuthUser, q: FarmFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    const allowed = await this.allowedFarmIds(user);
    if (allowed) where.id = { in: allowed };
    if (q.municipality) where.municipality = { contains: q.municipality, mode: 'insensitive' };
    if (q.state) where.state = { equals: q.state, mode: 'insensitive' };
    if (q.status) where.status = q.status;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { municipality: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.farm.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { plots: true, seasons: true } } },
      }),
      this.prisma.farm.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async findOne(user: AuthUser, id: string) {
    await this.tenant.assertFarmAccess(user, id);
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        plots: { orderBy: { name: 'asc' } },
        crops: { include: { plot: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        _count: { select: { seasons: true } },
      },
    });
    if (!farm) throw new NotFoundException('Fazenda não encontrada');
    return farm;
  }

  async create(user: AuthUser, dto: CreateFarmDto, companyIdOverride?: string) {
    const companyId = this.tenant.requireCompany(user, companyIdOverride);
    const farm = await this.prisma.farm.create({
      data: {
        companyId,
        code: dto.code || null,
        name: dto.name,
        ownerName: dto.ownerName || null,
        municipality: dto.municipality || null,
        state: dto.state || null,
        address: dto.address || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        totalAreaHa: dto.totalAreaHa ?? 0,
        agriculturalAreaHa: dto.agriculturalAreaHa ?? 0,
        availableAreaHa: dto.availableAreaHa ?? 0,
        predominantProduction: dto.predominantProduction || null,
        notes: dto.notes || null,
      },
    });
    await this.audit.log({ action: 'PROPRIEDADE_CRIADA', entity: 'Farm', entityId: farm.id, actor: user, after: farm });
    return farm;
  }

  async update(user: AuthUser, id: string, dto: UpdateFarmDto) {
    await this.tenant.assertFarmAccess(user, id);
    const before = await this.prisma.farm.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Fazenda não encontrada');
    const { companyId, ...data } = dto as any;
    const farm = await this.prisma.farm.update({
      where: { id },
      data: {
        code: data.code,
        name: data.name,
        ownerName: data.ownerName,
        municipality: data.municipality,
        state: data.state,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        totalAreaHa: data.totalAreaHa,
        agriculturalAreaHa: data.agriculturalAreaHa,
        availableAreaHa: data.availableAreaHa,
        predominantProduction: data.predominantProduction,
        notes: data.notes,
      },
    });
    await this.audit.log({ action: 'PROPRIEDADE_ATUALIZADA', entity: 'Farm', entityId: id, actor: user, before, after: farm });
    return farm;
  }

  async remove(user: AuthUser, id: string) {
    await this.tenant.assertFarmAccess(user, id);
    const seasons = await this.prisma.season.count({ where: { farmId: id } });
    if (seasons > 0) {
      throw new BadRequestException('Fazenda com safras registradas não pode ser excluída. Exclua as safras primeiro.');
    }
    const farm = await this.prisma.farm.findUnique({ where: { id } });
    await this.prisma.farm.delete({ where: { id } });
    await this.audit.log({ action: 'PROPRIEDADE_EXCLUIDA', entity: 'Farm', entityId: id, actor: user, before: farm });
    return { ok: true };
  }

  // ─── Talhões ───────────────────────────────────────────────

  async listPlots(user: AuthUser, q: PlotFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    const allowed = await this.allowedFarmIds(user);
    if (allowed) where.farmId = { in: allowed };
    if (q.search?.trim()) {
      where.name = { contains: q.search.trim(), mode: 'insensitive' };
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.plot.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { farm: { select: { id: true, name: true } }, _count: { select: { crops: true } } },
      }),
      this.prisma.plot.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createPlot(user: AuthUser, dto: CreatePlotDto) {
    await this.tenant.assertFarmAccess(user, dto.farmId);
    const farm = await this.prisma.farm.findUniqueOrThrow({ where: { id: dto.farmId }, select: { companyId: true } });
    const plot = await this.prisma.plot.create({
      data: {
        companyId: farm.companyId,
        farmId: dto.farmId,
        code: dto.code || null,
        name: dto.name,
        areaHa: dto.areaHa,
        soilType: dto.soilType ?? 'OUTRO',
        irrigationType: dto.irrigationType ?? 'NENHUMA',
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        boundary: dto.boundary ?? undefined,
        notes: dto.notes || null,
      },
    });
    await this.audit.log({ action: 'TALHAO_CRIADO', entity: 'Plot', entityId: plot.id, actor: user, after: plot });
    return plot;
  }

  async updatePlot(user: AuthUser, id: string, dto: UpdatePlotDto) {
    const before = await this.prisma.plot.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Talhão não encontrado');
    await this.tenant.assertFarmAccess(user, before.farmId);
    if (dto.farmId && dto.farmId !== before.farmId) {
      await this.tenant.assertFarmAccess(user, dto.farmId);
    }
    const plot = await this.prisma.plot.update({
      where: { id },
      data: {
        farmId: dto.farmId,
        code: dto.code,
        name: dto.name,
        areaHa: dto.areaHa,
        soilType: dto.soilType,
        irrigationType: dto.irrigationType,
        latitude: dto.latitude,
        longitude: dto.longitude,
        boundary: dto.boundary ?? undefined,
        notes: dto.notes,
      },
    });
    await this.audit.log({ action: 'TALHAO_ATUALIZADO', entity: 'Plot', entityId: id, actor: user, before, after: plot });
    return plot;
  }

  async removePlot(user: AuthUser, id: string) {
    const before = await this.prisma.plot.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Talhão não encontrado');
    await this.tenant.assertFarmAccess(user, before.farmId);
    await this.prisma.plot.delete({ where: { id } });
    await this.audit.log({ action: 'TALHAO_EXCLUIDO', entity: 'Plot', entityId: id, actor: user, before });
    return { ok: true };
  }
}
