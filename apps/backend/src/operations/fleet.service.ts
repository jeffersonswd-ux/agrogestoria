import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import {
  CreateFuelLogDto,
  CreateMachineDto,
  CreateMaintenanceDto,
  FuelFilterDto,
  MachineFilterDto,
  MaintenanceFilterDto,
  UpdateMachineDto,
  UpdateMaintenanceDto,
} from './dto/fleet.dto';
import { isSuperAdmin } from '../common/utils/roles';

@Injectable()
export class FleetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}

  private async assertMachine(user: AuthUser, id: string) {
    const machine = await this.prisma.machine.findUnique({ where: { id }, select: { id: true, companyId: true, farmId: true, name: true } });
    if (!machine) throw new NotFoundException('Máquina não encontrada');
    if (!isSuperAdmin(user.role) && machine.companyId !== user.companyId) {
      throw new NotFoundException('Máquina não encontrada');
    }
    return machine;
  }

  // ─── Máquinas ──────────────────────────────────────────────

  async listMachines(user: AuthUser, q: MachineFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    if (q.type) where.type = q.type;
    if (q.status) where.status = q.status;
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { code: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { model: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.machine.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: { _count: { select: { maintenance: true, fuelings: true } } },
      }),
      this.prisma.machine.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createMachine(user: AuthUser, dto: CreateMachineDto) {
    if (dto.farmId) await this.tenant.assertFarmAccess(user, dto.farmId);
    const companyId = this.tenant.requireCompany(user);
    const machine = await this.prisma.machine.create({
      data: {
        companyId,
        farmId: dto.farmId || null,
        code: dto.code || null,
        name: dto.name,
        type: dto.type,
        brand: dto.brand || null,
        model: dto.model || null,
        year: dto.year ?? null,
        plate: dto.plate || null,
        hoursMeter: dto.hoursMeter ?? 0,
        mileage: dto.mileage ?? 0,
        fuelType: dto.fuelType || null,
        status: dto.status || 'ATIVO',
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : null,
        acquisitionValue: dto.acquisitionValue ?? null,
        notes: dto.notes || null,
      },
    });
    await this.audit.log({ action: 'MAQUINA_CRIADA', entity: 'Machine', entityId: machine.id, actor: user, after: machine });
    return machine;
  }

  async updateMachine(user: AuthUser, id: string, dto: UpdateMachineDto) {
    await this.assertMachine(user, id);
    if (dto.farmId) await this.tenant.assertFarmAccess(user, dto.farmId);
    const before = await this.prisma.machine.findUnique({ where: { id } });
    const machine = await this.prisma.machine.update({
      where: { id },
      data: {
        farmId: dto.farmId,
        code: dto.code,
        name: dto.name,
        type: dto.type,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        plate: dto.plate,
        hoursMeter: dto.hoursMeter,
        mileage: dto.mileage,
        fuelType: dto.fuelType,
        status: dto.status,
        acquisitionDate: dto.acquisitionDate ? new Date(dto.acquisitionDate) : undefined,
        acquisitionValue: dto.acquisitionValue,
        notes: dto.notes,
      },
    });
    await this.audit.log({ action: 'MAQUINA_ATUALIZADA', entity: 'Machine', entityId: id, actor: user, before, after: machine });
    return machine;
  }

  async removeMachine(user: AuthUser, id: string) {
    await this.assertMachine(user, id);
    const before = await this.prisma.machine.findUnique({ where: { id } });
    await this.prisma.machine.delete({ where: { id } });
    await this.audit.log({ action: 'MAQUINA_EXCLUIDA', entity: 'Machine', entityId: id, actor: user, before });
    return { ok: true };
  }

  // ─── Manutenções ───────────────────────────────────────────

  async listMaintenance(user: AuthUser, q: MaintenanceFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.machineId) where.machineId = q.machineId;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenance.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: { machine: { select: { id: true, name: true, code: true } } },
      }),
      this.prisma.maintenance.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createMaintenance(user: AuthUser, dto: CreateMaintenanceDto) {
    const machine = await this.assertMachine(user, dto.machineId);
    const m = await this.prisma.maintenance.create({
      data: {
        companyId: machine.companyId,
        machineId: dto.machineId,
        type: dto.type,
        description: dto.description || null,
        date: new Date(dto.date),
        hoursMeter: dto.hoursMeter ?? null,
        mileage: dto.mileage ?? null,
        parts: dto.parts || null,
        cost: dto.cost ?? 0,
        nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : null,
        nextServiceHours: dto.nextServiceHours ?? null,
        status: dto.status || 'CONCLUIDA',
        notes: dto.notes || null,
      },
    });
    // Atualiza horímetro/quilometragem da máquina quando informado
    if (dto.hoursMeter || dto.mileage) {
      await this.prisma.machine.update({
        where: { id: dto.machineId },
        data: {
          hoursMeter: dto.hoursMeter ? Math.max(dto.hoursMeter, 0) : undefined,
          mileage: dto.mileage ? Math.max(dto.mileage, 0) : undefined,
        },
      });
    }
    await this.audit.log({ action: 'MANUTENCAO_REGISTRADA', entity: 'Maintenance', entityId: m.id, actor: user, after: m });
    return m;
  }

  async updateMaintenance(user: AuthUser, id: string, dto: UpdateMaintenanceDto) {
    const before = await this.prisma.maintenance.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Manutenção não encontrada');
    await this.assertMachine(user, before.machineId);
    if (dto.machineId) await this.assertMachine(user, dto.machineId);
    const m = await this.prisma.maintenance.update({
      where: { id },
      data: {
        machineId: dto.machineId,
        type: dto.type,
        description: dto.description,
        date: dto.date ? new Date(dto.date) : undefined,
        hoursMeter: dto.hoursMeter,
        mileage: dto.mileage,
        parts: dto.parts,
        cost: dto.cost,
        nextServiceDate: dto.nextServiceDate ? new Date(dto.nextServiceDate) : undefined,
        nextServiceHours: dto.nextServiceHours,
        status: dto.status,
        notes: dto.notes,
      },
    });
    await this.audit.log({ action: 'MANUTENCAO_ATUALIZADA', entity: 'Maintenance', entityId: id, actor: user, before, after: m });
    return m;
  }

  async removeMaintenance(user: AuthUser, id: string) {
    const before = await this.prisma.maintenance.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Manutenção não encontrada');
    await this.assertMachine(user, before.machineId);
    await this.prisma.maintenance.delete({ where: { id } });
    await this.audit.log({ action: 'MANUTENCAO_EXCLUIDA', entity: 'Maintenance', entityId: id, actor: user, before });
    return { ok: true };
  }

  // ─── Abastecimentos ────────────────────────────────────────

  async listFuel(user: AuthUser, q: FuelFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.machineId) where.machineId = q.machineId;
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(q.to);
    }
    const [data, total, agg] = await this.prisma.$transaction([
      this.prisma.fuelLog.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: { machine: { select: { id: true, name: true } } },
      }),
      this.prisma.fuelLog.count({ where }),
      this.prisma.fuelLog.aggregate({ where, _sum: { liters: true, totalCost: true } }),
    ]);
    return {
      ...paginate(data, total, page, pageSize),
      totals: { liters: agg._sum.liters ?? 0, cost: agg._sum.totalCost ?? 0 },
    };
  }

  async createFuel(user: AuthUser, dto: CreateFuelLogDto) {
    const companyId = this.tenant.requireCompany(user);
    let machine: Awaited<ReturnType<FleetService['assertMachine']>> | null = null;
    if (dto.machineId) machine = await this.assertMachine(user, dto.machineId);
    const unitPrice = dto.unitPrice ?? 0;
    const totalCost = dto.totalCost ?? unitPrice * dto.liters;
    const log = await this.prisma.fuelLog.create({
      data: {
        companyId,
        machineId: dto.machineId || null,
        date: new Date(dto.date),
        liters: dto.liters,
        unitPrice,
        totalCost,
        hoursMeter: dto.hoursMeter ?? null,
        mileage: dto.mileage ?? null,
        station: dto.station || null,
        notes: dto.notes || null,
      },
    });
    if (machine && dto.hoursMeter) {
      await this.prisma.machine.update({ where: { id: machine.id }, data: { hoursMeter: dto.hoursMeter } });
    }
    await this.audit.log({ action: 'ABASTECIMENTO_REGISTRADO', entity: 'FuelLog', entityId: log.id, actor: user, after: log });
    return log;
  }

  async removeFuel(user: AuthUser, id: string) {
    const before = await this.prisma.fuelLog.findUnique({ where: { id } });
    if (!before) throw new NotFoundException('Abastecimento não encontrado');
    if (!isSuperAdmin(user.role) && before.companyId !== user.companyId) throw new NotFoundException('Abastecimento não encontrado');
    await this.prisma.fuelLog.delete({ where: { id } });
    await this.audit.log({ action: 'ABASTECIMENTO_EXCLUIDO', entity: 'FuelLog', entityId: id, actor: user, before });
    return { ok: true };
  }

  /** Alertas de manutenção preventiva pendentes (data ou horímetro). */
  async maintenanceAlerts(user: AuthUser) {
    const scope = this.tenant.scope(user);
    const in30Days = new Date(Date.now() + 30 * 86400000);
    const machines = await this.prisma.machine.findMany({
      where: { ...scope, status: 'ATIVO' },
      include: { maintenance: { orderBy: { date: 'desc' }, take: 1 } },
    });
    return machines
      .map((m) => {
        const last = m.maintenance[0];
        if (!last) return null;
        const dueDate = last.nextServiceDate && last.nextServiceDate <= in30Days;
        const dueHours = last.nextServiceHours != null && m.hoursMeter >= last.nextServiceHours - 50;
        if (!dueDate && !dueHours) return null;
        return {
          machineId: m.id,
          machine: m.name,
          code: m.code,
          hoursMeter: m.hoursMeter,
          nextServiceDate: last.nextServiceDate,
          nextServiceHours: last.nextServiceHours,
          reason: dueDate ? 'Data de manutenção próxima' : 'Horímetro próximo da manutenção',
        };
      })
      .filter(Boolean);
  }
}
