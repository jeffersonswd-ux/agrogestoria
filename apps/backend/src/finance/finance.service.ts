import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import { CreateTransactionDto, FinanceFilterDto, PayTransactionDto, UpdateTransactionDto } from './dto/finance.dto';
import { isSuperAdmin } from '../common/utils/roles';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}

  private round(v: number) {
    return Math.round(v * 100) / 100;
  }

  private statusOf(amount: number, paid: number, dueDate: Date): string {
    if (paid >= amount - 0.005) return 'PAGO';
    if (paid > 0) return 'PARCIAL';
    if (dueDate < new Date(new Date().toDateString())) return 'VENCIDO';
    return 'PENDENTE';
  }

  async list(user: AuthUser, q: FinanceFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.type) where.type = q.type;
    if (q.farmId) where.farmId = q.farmId;
    if (q.category) where.category = q.category;
    if (q.status) where.status = q.status;
    if (q.from || q.to) {
      where.dueDate = {};
      if (q.from) where.dueDate.gte = new Date(q.from);
      if (q.to) where.dueDate.lte = new Date(`${q.to}T23:59:59`);
    }
    if (q.search?.trim()) where.description = { contains: q.search.trim(), mode: 'insensitive' };
    const [data, total, agg] = await this.prisma.$transaction([
      this.prisma.financialTransaction.findMany({
        where,
        skip,
        take,
        orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
        include: { farm: { select: { name: true } } },
      }),
      this.prisma.financialTransaction.count({ where }),
      this.prisma.financialTransaction.groupBy({ by: ['type'], where, _sum: { amount: true, paidAmount: true } }) as any,
    ]);
    return {
      ...paginate(data, total, page, pageSize),
      totals: {
        payable: agg.find((a) => a.type === 'PAGAR')?._sum?.amount ?? 0,
        receivable: agg.find((a) => a.type === 'RECEBER')?._sum?.amount ?? 0,
        paid: agg.reduce((s, a) => s + (a._sum?.paidAmount ?? 0), 0),
      },
    };
  }

  async create(user: AuthUser, dto: CreateTransactionDto) {
    const companyId = this.tenant.requireCompany(user);
    if (dto.farmId) await this.tenant.assertFarmAccess(user, dto.farmId);
    const installments = Math.max(1, dto.installments ?? 1);
    const interval = dto.intervalDays ?? 30;
    const base = this.round(dto.amount / installments);
    const rows = Array.from({ length: installments }, (_, i) => {
      const isLast = i === installments - 1;
      const amount = isLast ? this.round(dto.amount - base * (installments - 1)) : base;
      const due = new Date(dto.dueDate);
      due.setDate(due.getDate() + interval * i);
      return {
        companyId,
        type: dto.type,
        farmId: dto.farmId || null,
        category: dto.category,
        description:
          installments > 1 ? `${dto.description} (${i + 1}/${installments})` : dto.description,
        amount,
        dueDate: due,
        status: this.statusOf(amount, 0, due),
        seasonId: dto.seasonId || null,
        notes: dto.notes || null,
      };
    });
    const created = await this.prisma.$transaction(rows.map((r) => this.prisma.financialTransaction.create({ data: r })));
    await this.audit.log({
      action: 'TITULO_CRIADO',
      entity: 'FinancialTransaction',
      entityId: created[0].id,
      actor: user,
      after: created,
    });
    return installments > 1 ? created : created[0];
  }

  private async own(user: AuthUser, id: string) {
    const tx = await this.prisma.financialTransaction.findUnique({ where: { id } });
    if (!tx || (!isSuperAdmin(user.role) && tx.companyId !== user.companyId)) {
      throw new NotFoundException('Título não encontrado');
    }
    return tx;
  }

  async update(user: AuthUser, id: string, dto: UpdateTransactionDto) {
    const before = await this.own(user, id);
    if (before.status === 'PAGO' && dto.amount && dto.amount < before.paidAmount) {
      throw new BadRequestException('Valor menor que o já baixado. Estorne a baixa antes de alterar.');
    }
    if (dto.farmId) await this.tenant.assertFarmAccess(user, dto.farmId);
    const amount = dto.amount ?? before.amount;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : before.dueDate;
    const tx = await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        type: dto.type,
        farmId: dto.farmId,
        category: dto.category,
        description: dto.description,
        amount,
        dueDate,
        seasonId: dto.seasonId,
        notes: dto.notes,
        status: before.paidAmount > 0 ? this.statusOf(amount, before.paidAmount, dueDate) : this.statusOf(amount, 0, dueDate),
      },
    });
    await this.audit.log({ action: 'TITULO_ATUALIZADO', entity: 'FinancialTransaction', entityId: id, actor: user, before, after: tx });
    return tx;
  }

  async pay(user: AuthUser, id: string, dto: PayTransactionDto) {
    const before = await this.own(user, id);
    if (before.status === 'PAGO') throw new BadRequestException('Título já está baixado');
    const remaining = this.round(before.amount - before.paidAmount);
    const payAmount = dto.amount ? this.round(dto.amount) : remaining;
    if (payAmount <= 0) throw new BadRequestException('Valor de baixa inválido');
    if (payAmount > remaining + 0.005) {
      throw new BadRequestException(`Valor superior ao saldo em aberto (${remaining.toFixed(2)})`);
    }
    const paidAmount = this.round(before.paidAmount + payAmount);
    const paidDate = dto.paidDate ? new Date(dto.paidDate) : new Date();
    const tx = await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        paidAmount,
        paidDate,
        status: this.statusOf(before.amount, paidAmount, before.dueDate),
        notes: dto.notes ? `${before.notes ?? ''}\n${dto.notes}`.trim() : before.notes,
      },
    });
    await this.audit.log({ action: 'TITULO_BAIXADO', entity: 'FinancialTransaction', entityId: id, actor: user, before, after: tx });
    return tx;
  }

  async reverse(user: AuthUser, id: string) {
    const before = await this.own(user, id);
    if (!before.paidAmount || before.paidAmount <= 0) {
      throw new BadRequestException('Este título não possui baixa para estornar');
    }
    const tx = await this.prisma.financialTransaction.update({
      where: { id },
      data: {
        paidAmount: 0,
        paidDate: null,
        status: this.statusOf(before.amount, 0, before.dueDate),
      },
    });
    await this.audit.log({ action: 'TITULO_ESTORNADO', entity: 'FinancialTransaction', entityId: id, actor: user, before, after: tx });
    return tx;
  }

  async remove(user: AuthUser, id: string) {
    const before = await this.own(user, id);
    if (before.paidAmount > 0) throw new BadRequestException('Título com baixa não pode ser excluído. Estorne a baixa primeiro.');
    await this.prisma.financialTransaction.delete({ where: { id } });
    await this.audit.log({ action: 'TITULO_EXCLUIDO', entity: 'FinancialTransaction', entityId: id, actor: user, before });
    return { ok: true };
  }

  /** Fluxo de caixa mensal: entradas e saídas realizadas por mês do ano informado. */
  async cashFlow(user: AuthUser, year?: number) {
    const scope = this.tenant.scope(user);
    const y = year || new Date().getFullYear();
    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1);
    const txs = await this.prisma.financialTransaction.findMany({
      where: { ...scope, paidDate: { gte: start, lt: end } },
      select: { type: true, paidAmount: true, paidDate: true },
    });
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      income: 0,
      expense: 0,
      balance: 0,
    }));
    for (const t of txs) {
      const m = months[t.paidDate!.getMonth()];
      if (t.type === 'RECEBER') m.income += t.paidAmount;
      else m.expense += t.paidAmount;
    }
    months.forEach((m) => {
      m.income = this.round(m.income);
      m.expense = this.round(m.expense);
      m.balance = this.round(m.income - m.expense);
    });
    return { year: y, months };
  }

  async summary() {
    return this.prisma.financialTransaction.groupBy({
      by: ['category', 'type'],
      _sum: { amount: true, paidAmount: true },
      where: {},
    });
  }

  async upcoming(user: AuthUser, days = 7) {
    const scope = this.tenant.scope(user);
    const end = new Date();
    end.setDate(end.getDate() + days);
    return this.prisma.financialTransaction.findMany({
      where: { ...scope, status: { in: ['PENDENTE', 'PARCIAL', 'VENCIDO'] }, dueDate: { lte: end } },
      orderBy: { dueDate: 'asc' },
      include: { farm: { select: { name: true } } },
    });
  }
}
