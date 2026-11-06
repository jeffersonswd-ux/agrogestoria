import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { CreateAdminFarmDto, FarmQueryDto, UpdateAdminFarmDto } from './dto/farm.dto';

@Injectable()
export class AdminFarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(q: FarmQueryDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = {};
    if (q.companyId) where.companyId = q.companyId;
    if (q.municipality) where.municipality = { contains: q.municipality, mode: 'insensitive' };
    if (q.state) where.state = { equals: q.state, mode: 'insensitive' };
    if (q.status) where.status = q.status;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { ownerName: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.farm.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          company: { select: { id: true, clientName: true, companyName: true } },
          _count: { select: { plots: true, seasons: true } },
        },
      }),
      this.prisma.farm.count({ where }),
    ]);
    return paginate(
      data.map((f) => ({ ...f, clientName: f.company.clientName, companyName: f.company.companyName })),
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: string) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, clientName: true, companyName: true, status: true } },
        plots: true,
        _count: { select: { seasons: true } },
      },
    });
    if (!farm) throw new NotFoundException('Fazenda não encontrada');
    return farm;
  }

  async create(dto: CreateAdminFarmDto, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
    const company = await this.prisma.company.findUnique({
      where: { id: dto.companyId },
      select: { id: true, status: true },
    });
    if (!company) throw new NotFoundException('Cliente informado não existe');
    const farm = await this.prisma.farm.create({
      data: {
        companyId: dto.companyId,
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
        status: dto.status || 'ATIVO',
      },
    });
    await this.audit.log({
      action: 'FAZENDA_CRIADA',
      entity: 'Farm',
      entityId: farm.id,
      companyId: dto.companyId,
      actor,
      after: farm,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return farm;
  }

  async update(id: string, dto: UpdateAdminFarmDto, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
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
        status: data.status,
      },
    });
    await this.audit.log({
      action: 'FAZENDA_ATUALIZADA',
      entity: 'Farm',
      entityId: id,
      companyId: farm.companyId,
      actor,
      before,
      after: farm,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return farm;
  }

  async remove(id: string, actor: AuthUser, meta: { ip?: string; userAgent?: string }) {
    const farm = await this.prisma.farm.findUnique({
      where: { id },
      select: { id: true, name: true, companyId: true, _count: { select: { plots: true, seasons: true } } },
    });
    if (!farm) throw new NotFoundException('Fazenda não encontrada');
    if (farm._count.seasons > 0) {
      throw new NotFoundException(
        'Esta fazenda possui safras vinculadas e não pode ser excluída. Bloqueie a fazenda para preservar o histórico.',
      );
    }
    await this.audit.log({
      action: 'FAZENDA_EXCLUIDA',
      entity: 'Farm',
      entityId: id,
      companyId: farm.companyId,
      actor,
      before: farm,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await this.prisma.farm.delete({ where: { id } });
    return { ok: true };
  }
}
