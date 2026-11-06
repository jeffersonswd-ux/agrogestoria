import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { paginate, skipTake } from '../common/dto/pagination.dto';
import {
  CreateCustomerDto,
  CreateProductDto,
  CreatePurchaseDto,
  CreateSaleDto,
  CreateSupplierDto,
  LineItemDto,
  MovementDto,
  ProductFilterDto,
  UpdateProductDto,
  UpdatePurchaseDto,
  UpdateSaleDto,
  UpdateSupplierDto,
} from './dto/supply.dto';
import { isSuperAdmin } from '../common/utils/roles';

@Injectable()
export class SupplyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
    private readonly audit: AuditService,
  ) {}

  private companyOf(user: AuthUser) {
    return this.tenant.requireCompany(user);
  }

  private computeLines(items: LineItemDto[]) {
    return items.map((i) => ({
      productId: i.productId || null,
      description: i.description,
      quantity: Number(i.quantity) || 0,
      unit: i.unit || 'un',
      unitPrice: Number(i.unitPrice) || 0,
      total: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    }));
  }

  // ─── Produtos ──────────────────────────────────────────────

  async listProducts(user: AuthUser, q: ProductFilterDto) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.category) where.category = q.category;
    if (q.search?.trim()) where.name = { contains: q.search.trim(), mode: 'insensitive' };
    // O filtro de estoque mínimo compara quantidade com o mínimo do próprio produto
    // e por isso é aplicado em memória, não pelo Prisma.
    const lowStockOnly = q.lowStock === 'true';
    const [all, totalAll] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        ...(lowStockOnly ? {} : { skip, take }),
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    const filtered = lowStockOnly ? all.filter((p) => p.quantity <= p.minStock) : all;
    const total = lowStockOnly ? filtered.length : totalAll;
    const data = lowStockOnly ? filtered.slice(skip, skip + take) : filtered;
    return paginate(data, total, page, pageSize);
  }

  async createProduct(user: AuthUser, dto: CreateProductDto) {
    const companyId = this.companyOf(user);
    const product = await this.prisma.$transaction(async (tx) => {
      const p = await tx.product.create({
        data: {
          companyId,
          farmId: dto.farmId || null,
          name: dto.name,
          category: dto.category,
          unit: dto.unit || 'un',
          sku: dto.sku || null,
          quantity: dto.quantity ?? 0,
          minStock: dto.minStock ?? 0,
          unitCost: dto.unitCost ?? 0,
          storageLocation: dto.storageLocation || null,
          notes: dto.notes || null,
        },
      });
      if (dto.quantity && dto.quantity > 0) {
        await tx.inventoryMovement.create({
          data: {
            companyId,
            productId: p.id,
            type: 'ENTRADA',
            quantity: dto.quantity,
            unitCost: dto.unitCost ?? 0,
            lot: dto.lot || null,
            expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            notes: 'Saldo inicial',
            userId: user.id,
          },
        });
      }
      return p;
    });
    await this.audit.log({ action: 'PRODUTO_CRIADO', entity: 'Product', entityId: product.id, actor: user, after: product });
    return product;
  }

  async updateProduct(user: AuthUser, id: string, dto: UpdateProductDto) {
    await this.ownProduct(user, id);
    const { quantity, ...rest } = dto as any;
    const product = await this.prisma.product.update({
      where: { id },
      data: {
        farmId: rest.farmId,
        name: rest.name,
        category: rest.category,
        unit: rest.unit,
        sku: rest.sku,
        minStock: rest.minStock,
        unitCost: rest.unitCost,
        storageLocation: rest.storageLocation,
        notes: rest.notes,
        active: rest.active,
      },
    });
    return product;
  }

  async removeProduct(user: AuthUser, id: string) {
    await this.ownProduct(user, id);
    const product = await this.prisma.product.update({ where: { id }, data: { active: false } });
    await this.audit.log({ action: 'PRODUTO_DESATIVADO', entity: 'Product', entityId: id, actor: user });
    return product;
  }

  private async ownProduct(user: AuthUser, id: string) {
    const p = await this.prisma.product.findUnique({ where: { id }, select: { id: true, companyId: true, name: true } });
    if (!p || (!isSuperAdmin(user.role) && p.companyId !== user.companyId)) {
      throw new NotFoundException('Produto não encontrado');
    }
    return p;
  }

  async moveProduct(user: AuthUser, productId: string, dto: MovementDto) {
    const product = await this.ownProduct(user, productId);
    const qty = Number(dto.quantity) || 0;
    if (dto.type === 'SAIDA' && product['quantity'] < qty) {
      // Revalida com saldo atual dentro da transação abaixo; checagem antecipada para mensagem clara
    }
    const result = await this.prisma.$transaction(async (tx) => {
      const current = await tx.product.findUniqueOrThrow({ where: { id: productId } });
      let newQty = current.quantity;
      if (dto.type === 'ENTRADA' || dto.type === 'AJUSTE') newQty = current.quantity + qty;
      else if (dto.type === 'SAIDA' || dto.type === 'TRANSFERENCIA') newQty = current.quantity - qty;
      if (newQty < 0) throw new BadRequestException(`Saldo insuficiente. Estoque atual: ${current.quantity} ${current.unit}`);
      const unitCost = dto.unitCost ?? current.unitCost;
      const movement = await tx.inventoryMovement.create({
        data: {
          companyId: current.companyId,
          productId,
          type: dto.type,
          quantity: dto.type === 'SAIDA' || dto.type === 'TRANSFERENCIA' ? -qty : qty,
          unitCost,
          lot: dto.lot || null,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          notes: dto.notes || null,
          referenceId: dto.referenceId || null,
          userId: user.id,
        },
      });
      const updated = await tx.product.update({ where: { id: productId }, data: { quantity: newQty, unitCost } });
      return { movement, product: updated };
    });
    await this.audit.log({
      action: 'MOVIMENTACAO_ESTOQUE',
      entity: 'InventoryMovement',
      entityId: result.movement.id,
      actor: user,
      after: result.movement,
    });
    return result;
  }

  async listMovements(user: AuthUser, productId: string | undefined, page = 1, pageSize = 30) {
    const where: any = { ...this.tenant.scope(user) };
    if (productId) where.productId = productId;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { product: { select: { name: true, unit: true } } },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  // ─── Fornecedores / Clientes ───────────────────────────────

  async listSuppliers(user: AuthUser, q: any) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.search?.trim()) where.name = { contains: q.search.trim(), mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({ where, skip, take, orderBy: { name: 'asc' }, include: { _count: { select: { purchases: true } } } }),
      this.prisma.supplier.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createSupplier(user: AuthUser, dto: CreateSupplierDto) {
    const s = await this.prisma.supplier.create({ data: { ...dto, companyId: this.companyOf(user) } });
    await this.audit.log({ action: 'FORNECEDOR_CRIADO', entity: 'Supplier', entityId: s.id, actor: user, after: s });
    return s;
  }

  async updateSupplier(user: AuthUser, id: string, dto: UpdateSupplierDto) {
    await this.own('supplier', user, id);
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  async removeSupplier(user: AuthUser, id: string) {
    await this.own('supplier', user, id);
    await this.prisma.supplier.delete({ where: { id } });
    return { ok: true };
  }

  async listCustomers(user: AuthUser, q: any) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.search?.trim()) where.name = { contains: q.search.trim(), mode: 'insensitive' };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  async createCustomer(user: AuthUser, dto: CreateCustomerDto) {
    const c = await this.prisma.customer.create({ data: { ...dto, companyId: this.companyOf(user) } });
    await this.audit.log({ action: 'CLIENTE_VENDA_CRIADO', entity: 'Customer', entityId: c.id, actor: user, after: c });
    return c;
  }

  async updateCustomer(user: AuthUser, id: string, dto: UpdateSupplierDto) {
    await this.own('customer', user, id);
    return this.prisma.customer.update({ where: { id }, data: dto });
  }

  async removeCustomer(user: AuthUser, id: string) {
    await this.own('customer', user, id);
    await this.prisma.customer.delete({ where: { id } });
    return { ok: true };
  }

  private async own(model: 'supplier' | 'customer', user: AuthUser, id: string) {
    const row = await (this.prisma as any)[model].findUnique({ where: { id } });
    if (!row || (!isSuperAdmin(user.role) && row.companyId !== user.companyId)) {
      throw new NotFoundException('Registro não encontrado');
    }
    return row;
  }

  // ─── Compras ───────────────────────────────────────────────

  async listPurchases(user: AuthUser, q: any) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.supplierId) where.supplierId = q.supplierId;
    if (q.status) where.status = q.status;
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(`${q.to}T23:59:59`);
    }
    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchase.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: { supplier: { select: { name: true } }, items: true },
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return {
      ...paginate(data, total, page, pageSize),
      totalValue: (await this.prisma.purchase.aggregate({ where, _sum: { total: true } }))._sum.total ?? 0,
    };
  }

  async createPurchase(user: AuthUser, dto: CreatePurchaseDto) {
    const companyId = this.companyOf(user);
    const supplier = await this.own('supplier', user, dto.supplierId);
    const lines = this.computeLines(dto.items);
    const total = lines.reduce((s, l) => s + l.total, 0) - (dto.discount ?? 0) + (dto.freight ?? 0);
    const purchase = await this.prisma.purchase.create({
      data: {
        companyId,
        supplierId: supplier.id,
        number: dto.number || null,
        date: new Date(dto.date),
        status: dto.status || 'ABERTA',
        total,
        discount: dto.discount ?? 0,
        freight: dto.freight ?? 0,
        notes: dto.notes || null,
        items: { create: lines.map((l) => ({ ...l, companyId })) },
      },
      include: { items: true, supplier: true },
    });
    await this.audit.log({ action: 'COMPRA_CRIADA', entity: 'Purchase', entityId: purchase.id, actor: user, after: purchase });
    return purchase;
  }

  async updatePurchase(user: AuthUser, id: string, dto: UpdatePurchaseDto) {
    const before = await this.prisma.purchase.findUnique({ where: { id }, include: { items: true } });
    if (!before || (!isSuperAdmin(user.role) && before.companyId !== user.companyId)) {
      throw new NotFoundException('Compra não encontrada');
    }
    if (dto.receive) return this.receivePurchase(user, id);
    const lines = dto.items ? this.computeLines(dto.items) : null;
    const total = lines
      ? lines.reduce((s, l) => s + l.total, 0) - (dto.discount ?? 0) + (dto.freight ?? 0)
      : undefined;
    const purchase = await this.prisma.$transaction(async (tx) => {
      if (lines) await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
      return tx.purchase.update({
        where: { id },
        data: {
          supplierId: dto.supplierId,
          number: dto.number,
          date: dto.date ? new Date(dto.date) : undefined,
          status: dto.status,
          discount: dto.discount,
          freight: dto.freight,
          total,
          notes: dto.notes,
          ...(lines ? { items: { create: lines.map((l) => ({ ...l, companyId: before.companyId })) } } : {}),
        },
        include: { items: true },
      });
    });
    await this.audit.log({ action: 'COMPRA_ATUALIZADA', entity: 'Purchase', entityId: id, actor: user, before, after: purchase });
    return purchase;
  }

  /** Recebimento dá entrada no estoque e cria conta a pagar (idempotente). */
  async receivePurchase(user: AuthUser, id: string) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id }, include: { items: true, supplier: true } });
    if (!purchase) throw new NotFoundException('Compra não encontrada');
    if (!isSuperAdmin(user.role) && purchase.companyId !== user.companyId) throw new NotFoundException('Compra não encontrada');
    if (purchase.status === 'RECEBIDA') throw new BadRequestException('Esta compra já foi recebida');
    const result = await this.prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        if (item.received) continue;
        if (item.productId) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) {
            await tx.inventoryMovement.create({
              data: {
                companyId: purchase.companyId,
                productId: product.id,
                type: 'ENTRADA',
                quantity: item.quantity,
                unitCost: item.unitPrice,
                notes: `Compra ${purchase.number || purchase.id}`,
                referenceId: `purchase:${purchase.id}:${item.id}`,
                userId: user.id,
              },
            });
            await tx.product.update({
              where: { id: product.id },
              data: { quantity: product.quantity + item.quantity, unitCost: item.unitPrice },
            });
          }
        }
        await tx.purchaseItem.update({ where: { id: item.id }, data: { received: true } });
      }
      await tx.financialTransaction.create({
        data: {
          companyId: purchase.companyId,
          type: 'PAGAR',
          category: 'Compras',
          description: `Compra ${purchase.number || ''} — ${purchase.supplier.name}`.trim(),
          amount: purchase.total,
          dueDate: new Date(purchase.date.getTime() + 30 * 86400000),
          status: 'PENDENTE',
          notes: `Gerado automaticamente pelo recebimento da compra ${purchase.id}`,
        },
      });
      return tx.purchase.update({ where: { id }, data: { status: 'RECEBIDA' }, include: { items: true } });
    });
    await this.audit.log({ action: 'COMPRA_RECEBIDA', entity: 'Purchase', entityId: id, actor: user });
    return result;
  }

  async removePurchase(user: AuthUser, id: string) {
    const before = await this.prisma.purchase.findUnique({ where: { id } });
    if (!before || (!isSuperAdmin(user.role) && before.companyId !== user.companyId)) {
      throw new NotFoundException('Compra não encontrada');
    }
    if (before.status === 'RECEBIDA') throw new BadRequestException('Compra recebida não pode ser excluída');
    await this.prisma.purchase.delete({ where: { id } });
    await this.audit.log({ action: 'COMPRA_EXCLUIDA', entity: 'Purchase', entityId: id, actor: user, before });
    return { ok: true };
  }

  // ─── Vendas ────────────────────────────────────────────────

  async listSales(user: AuthUser, q: any) {
    const { skip, take, page, pageSize } = skipTake(q);
    const where: any = { ...this.tenant.scope(user) };
    if (q.status) where.status = q.status;
    if (q.from || q.to) {
      where.date = {};
      if (q.from) where.date.gte = new Date(q.from);
      if (q.to) where.date.lte = new Date(`${q.to}T23:59:59`);
    }
    const [data, total, agg] = await this.prisma.$transaction([
      this.prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: { date: 'desc' },
        include: { customer: { select: { name: true } }, items: true },
      }),
      this.prisma.sale.count({ where }),
      this.prisma.sale.aggregate({ where, _sum: { total: true } }),
    ]);
    return { ...paginate(data, total, page, pageSize), totalValue: agg._sum.total ?? 0 };
  }

  async createSale(user: AuthUser, dto: CreateSaleDto) {
    const companyId = this.companyOf(user);
    if (dto.customerId) await this.own('customer', user, dto.customerId);
    const lines = this.computeLines(dto.items);
    const total = lines.reduce((s, l) => s + l.total, 0) - (dto.discount ?? 0);
    const sale = await this.prisma.sale.create({
      data: {
        companyId,
        customerId: dto.customerId || null,
        number: dto.number || null,
        date: new Date(dto.date),
        culture: dto.culture || null,
        seasonId: dto.seasonId || null,
        status: dto.status || 'CONFIRMADA',
        total,
        discount: dto.discount ?? 0,
        notes: dto.notes || null,
        items: { create: lines.map((l) => ({ ...l, companyId })) },
      },
      include: { items: true, customer: true },
    });
    // Toda venda confirmada gera uma conta a receber
    if (sale.status !== 'ORCAMENTO') {
      await this.prisma.financialTransaction.create({
        data: {
          companyId,
          type: 'RECEBER',
          category: 'Vendas',
          description: `Venda ${sale.number || ''} — ${sale.customer?.name ?? 'Cliente'}`.trim(),
          amount: sale.total,
          dueDate: new Date(sale.date.getTime() + 30 * 86400000),
          status: 'PENDENTE',
          seasonId: sale.seasonId,
          notes: `Gerado automaticamente pela venda ${sale.id}`,
        },
      });
    }
    await this.audit.log({ action: 'VENDA_CRIADA', entity: 'Sale', entityId: sale.id, actor: user, after: sale });
    return sale;
  }

  async updateSale(user: AuthUser, id: string, dto: UpdateSaleDto) {
    const before = await this.prisma.sale.findUnique({ where: { id } });
    if (!before || (!isSuperAdmin(user.role) && before.companyId !== user.companyId)) {
      throw new NotFoundException('Venda não encontrada');
    }
    const sale = await this.prisma.sale.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        number: dto.number,
        date: dto.date ? new Date(dto.date) : undefined,
        culture: dto.culture,
        seasonId: dto.seasonId,
        status: dto.status,
        notes: dto.notes,
      },
    });
    await this.audit.log({ action: 'VENDA_ATUALIZADA', entity: 'Sale', entityId: id, actor: user, before, after: sale });
    return sale;
  }

  async removeSale(user: AuthUser, id: string) {
    const before = await this.prisma.sale.findUnique({ where: { id } });
    if (!before || (!isSuperAdmin(user.role) && before.companyId !== user.companyId)) {
      throw new NotFoundException('Venda não encontrada');
    }
    await this.prisma.sale.delete({ where: { id } });
    await this.audit.log({ action: 'VENDA_EXCLUIDA', entity: 'Sale', entityId: id, actor: user, before });
    return { ok: true };
  }
}
