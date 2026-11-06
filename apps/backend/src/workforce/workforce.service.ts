import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import {
  CreateEmployeeDto,
  CreateJournalDto,
  CreateTimeEntryDto,
  EmployeeFilterDto,
  JournalFilterDto,
  UpdateEmployeeDto,
  UpdateJournalDto,
} from './dto/workforce.dto';
import { isSuperAdmin } from '../common/utils/roles';

@Injectable()
export class WorkforceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}

  async listEmployees(user: AuthUser, q: EmployeeFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    if (q.active !== undefined && q.active !== '') where.active = q.active === 'true';
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { role: { contains: s, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { _count: { select: { timeEntries: true } } } }),
      this.prisma.employee.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createEmployee(user: AuthUser, dto: CreateEmployeeDto) {
    if (dto.farmId) await this.tenant.assertFarmAccess(user, dto.farmId);
    const e = await this.prisma.employee.create({
      data: {
        companyId: this.tenant.requireCompany(user),
        farmId: dto.farmId || null,
        name: dto.name,
        document: dto.document || null,
        role: dto.role,
        phone: dto.phone || null,
        email: dto.email || null,
        salary: dto.salary ?? null,
        dailyRate: dto.dailyRate ?? null,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
        notes: dto.notes || null,
      },
    });
    await this.audit.log({ action: 'FUNCIONARIO_CRIADO', entity: 'Employee', entityId: e.id, actor: user, after: e });
    return e;
  }

  async updateEmployee(user: AuthUser, id: string, dto: UpdateEmployeeDto) {
    await this.ownEmployee(user, id);
    const e = await this.prisma.employee.update({
      where: { id },
      data: {
        farmId: dto.farmId,
        name: dto.name,
        document: dto.document,
        role: dto.role,
        phone: dto.phone,
        email: dto.email,
        salary: dto.salary,
        dailyRate: dto.dailyRate,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        notes: dto.notes,
        active: dto.active,
      },
    });
    return e;
  }

  async removeEmployee(user: AuthUser, id: string) {
    await this.ownEmployee(user, id);
    await this.prisma.employee.update({ where: { id }, data: { active: false } });
    return { ok: true };
  }

  private async ownEmployee(user: AuthUser, id: string) {
    const e = await this.prisma.employee.findUnique({ where: { id }, select: { id: true, companyId: true } });
    if (!e || (!isSuperAdmin(user.role) && e.companyId !== user.companyId)) throw new NotFoundException('Funcionário não encontrado');
    return e;
  }

  async listTimeEntries(user: AuthUser, page = 1, pageSize = 30, employeeId?: string) {
    const where: any = { ...this.tenant.scope(user) };
    if (employeeId) where.employeeId = employeeId;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.timeEntry.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { employee: { select: { name: true, role: true } } },
      }),
      this.prisma.timeEntry.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createTimeEntry(user: AuthUser, dto: CreateTimeEntryDto) {
    await this.ownEmployee(user, dto.employeeId);
    if (dto.farmId) await this.tenant.assertFarmAccess(user, dto.farmId);
    const entry = await this.prisma.timeEntry.create({
      data: {
        companyId: this.tenant.requireCompany(user),
        employeeId: dto.employeeId,
        farmId: dto.farmId || null,
        date: new Date(dto.date),
        hours: dto.hours,
        activity: dto.activity || null,
        cost: dto.cost ?? 0,
        notes: dto.notes || null,
      },
    });
    return entry;
  }

  async removeTimeEntry(user: AuthUser, id: string) {
    const e = await this.prisma.timeEntry.findUnique({ where: { id }, select: { companyId: true } });
    if (!e || (!isSuperAdmin(user.role) && e.companyId !== user.companyId)) throw new NotFoundException('Apontamento não encontrado');
    await this.prisma.timeEntry.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Diário de campo ───────────────────────────────────────

  async listJournal(user: AuthUser, q: JournalFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.farmId) where.farmId = q.farmId;
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(`${q.to}T23:59:59`);
    }
    if (q.search?.trim()) where.activity = { contains: q.search.trim(), mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.fieldJournal.findMany({ where, orderBy: { date: 'desc' }, skip, take }),
      this.prisma.fieldJournal.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createJournal(user: AuthUser, dto: CreateJournalDto) {
    await this.tenant.assertFarmAccess(user, dto.farmId);
    const j = await this.prisma.fieldJournal.create({
      data: {
        companyId: this.tenant.requireCompany(user),
        farmId: dto.farmId,
        plotId: dto.plotId || null,
        seasonId: dto.seasonId || null,
        date: new Date(dto.date),
        activity: dto.activity,
        employeeId: dto.employeeId || null,
        machineId: dto.machineId || null,
        inputs: dto.inputs || null,
        cost: dto.cost ?? 0,
        photos: dto.photos ?? undefined,
        notes: dto.notes || null,
      },
    });
    await this.audit.log({ action: 'DIARIO_CRIADO', entity: 'FieldJournal', entityId: j.id, actor: user, after: j });
    return j;
  }

  async updateJournal(user: AuthUser, id: string, dto: UpdateJournalDto) {
    const before = await this.prisma.fieldJournal.findUnique({ where: { id } });
    if (!before || (!isSuperAdmin(user.role) && before.companyId !== user.companyId)) throw new NotFoundException('Registro não encontrado');
    const j = await this.prisma.fieldJournal.update({
      where: { id },
      data: {
        farmId: dto.farmId,
        plotId: dto.plotId,
        seasonId: dto.seasonId,
        date: dto.date ? new Date(dto.date) : undefined,
        activity: dto.activity,
        employeeId: dto.employeeId,
        machineId: dto.machineId,
        inputs: dto.inputs,
        cost: dto.cost,
        photos: dto.photos ?? undefined,
        notes: dto.notes,
      },
    });
    return j;
  }

  async removeJournal(user: AuthUser, id: string) {
    const before = await this.prisma.fieldJournal.findUnique({ where: { id } });
    if (!before || (!isSuperAdmin(user.role) && before.companyId !== user.companyId)) throw new NotFoundException('Registro não encontrado');
    await this.prisma.fieldJournal.delete({ where: { id } });
    return { ok: true };
  }
}
