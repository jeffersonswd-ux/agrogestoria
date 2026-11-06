import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuthUser } from '../common/decorators';
import * as ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

export type ReportKey =
  | 'financial'
  | 'payables'
  | 'receivables'
  | 'cashflow'
  | 'cost-per-ha'
  | 'cost-per-culture'
  | 'cost-per-season'
  | 'production'
  | 'harvests'
  | 'inventory'
  | 'purchases'
  | 'sales'
  | 'machines'
  | 'fuel'
  | 'maintenance'
  | 'operations'
  | 'applications'
  | 'employees'
  | 'season-comparison';

interface Table { title: string; columns: { key: string; label: string; width?: number }[]; rows: any[] }

const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString('pt-BR') : '');
const money = (v: any) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
const num = (v: any, digits = 2) => (v == null ? '' : Number(v).toLocaleString('pt-BR', { maximumFractionDigits: digits }));

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  async build(user: AuthUser, key: ReportKey, q: { from?: string; to?: string; farmId?: string }): Promise<Table> {
    const scope = this.tenant.scope(user);
    const farmWhere = q.farmId ? { farmId: q.farmId } : {};
    const dateRange = (field: string) => {
      if (!q.from && !q.to) return {};
      const r: any = {};
      if (q.from) r.gte = new Date(q.from);
      if (q.to) r.lte = new Date(`${q.to}T23:59:59`);
      return { [field]: r };
    };

    switch (key) {
      case 'financial':
      case 'payables':
      case 'receivables': {
        const rows = await this.prisma.financialTransaction.findMany({
          where: { ...scope, ...farmWhere, ...dateRange('dueDate'), ...(key === 'payables' ? { type: 'PAGAR' } : key === 'receivables' ? { type: 'RECEBER' } : {}) },
          orderBy: { dueDate: 'asc' },
          include: { farm: true },
        });
        return {
          title: key === 'payables' ? 'Contas a Pagar' : key === 'receivables' ? 'Contas a Receber' : 'Financeiro',
          columns: [
            { key: 'type', label: 'Tipo', width: 10 },
            { key: 'description', label: 'Descrição', width: 36 },
            { key: 'category', label: 'Categoria', width: 16 },
            { key: 'farm', label: 'Fazenda', width: 18 },
            { key: 'amount', label: 'Valor', width: 14 },
            { key: 'paidAmount', label: 'Baixado', width: 14 },
            { key: 'dueDate', label: 'Vencimento', width: 12 },
            { key: 'paidDate', label: 'Pagamento', width: 12 },
            { key: 'status', label: 'Status', width: 10 },
          ],
          rows: rows.map((r) => ({
            ...r,
            farm: r.farm?.name ?? '',
            amount: money(r.amount),
            paidAmount: money(r.paidAmount),
            dueDate: fmtDate(r.dueDate),
            paidDate: fmtDate(r.paidDate),
            raw: r,
          })),
        };
      }
      case 'cashflow': {
        const txs = await this.prisma.financialTransaction.findMany({
          where: { ...scope, ...farmWhere, paidDate: { not: null }, ...(q.from || q.to ? { paidDate: { not: null, ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(`${q.to}T23:59:59`) } : {}) } } : {}) },
          orderBy: { paidDate: 'asc' },
        });
        let balance = 0;
        const rows = txs.map((t) => {
          const v = t.type === 'RECEBER' ? t.paidAmount : -t.paidAmount;
          balance += v;
          return {
            date: fmtDate(t.paidDate),
            description: t.description,
            type: t.type,
            income: t.type === 'RECEBER' ? money(t.paidAmount) : '',
            expense: t.type === 'PAGAR' ? money(t.paidAmount) : '',
            balance: money(balance),
          };
        });
        return {
          title: 'Fluxo de Caixa',
          columns: [
            { key: 'date', label: 'Data', width: 12 },
            { key: 'description', label: 'Descrição', width: 40 },
            { key: 'type', label: 'Tipo', width: 10 },
            { key: 'income', label: 'Entrada', width: 14 },
            { key: 'expense', label: 'Saída', width: 14 },
            { key: 'balance', label: 'Saldo', width: 14 },
          ],
          rows,
        };
      }
      case 'production':
      case 'harvests': {
        const harvests = await this.prisma.harvest.findMany({
          where: { ...scope, ...farmWhere, ...dateRange('harvestDate') },
          include: { season: { include: { crop: true, farm: true } } },
          orderBy: { harvestDate: 'desc' },
        });
        return {
          title: 'Produção / Colheitas',
          columns: [
            { key: 'date', label: 'Data', width: 12 },
            { key: 'farm', label: 'Fazenda', width: 18 },
            { key: 'culture', label: 'Cultura', width: 14 },
            { key: 'season', label: 'Safra', width: 16 },
            { key: 'area', label: 'Área (ha)', width: 12 },
            { key: 'quantity', label: 'Quantidade', width: 14 },
            { key: 'unit', label: 'Unidade', width: 10 },
            { key: 'yield', label: 'Produtividade/un', width: 14 },
          ],
          rows: harvests.map((h) => ({
            date: fmtDate(h.harvestDate),
            farm: h.season.farm.name,
            culture: h.season.crop.culture,
            season: h.season.name,
            area: num(h.areaHarvested),
            quantity: num(h.quantity),
            unit: h.unit,
            yield: h.areaHarvested > 0 ? num(h.quantity / h.areaHarvested, 2) : '',
          })),
        };
      }
      case 'cost-per-ha':
      case 'cost-per-culture':
      case 'cost-per-season': {
        const seasons = await this.prisma.season.findMany({
          where: { ...scope, ...farmWhere },
          include: { crop: { include: { farm: true } } },
        });
        const rows = seasons.map((s) => ({
          farm: s.crop.farm.name,
          season: s.name,
          culture: s.crop.culture,
          area: num(s.crop.areaHa),
          cost: money(s.actualCost),
          costPerHa: s.crop.areaHa > 0 ? money(s.actualCost / s.crop.areaHa) : '',
        }));
        return {
          title: key === 'cost-per-ha' ? 'Custo por Hectare' : key === 'cost-per-culture' ? 'Custos por Cultura' : 'Custos por Safra',
          columns: [
            { key: 'farm', label: 'Fazenda', width: 20 },
            { key: 'season', label: 'Safra', width: 18 },
            { key: 'culture', label: 'Cultura', width: 16 },
            { key: 'area', label: 'Área (ha)', width: 12 },
            { key: 'cost', label: 'Custo Total', width: 16 },
            { key: 'costPerHa', label: 'Custo/ha', width: 16 },
          ],
          rows,
        };
      }
      case 'inventory': {
        const rows = await this.prisma.product.findMany({ where: { ...scope, active: true }, orderBy: { name: 'asc' } });
        return {
          title: 'Estoque',
          columns: [
            { key: 'name', label: 'Produto', width: 28 },
            { key: 'category', label: 'Categoria', width: 16 },
            { key: 'quantity', label: 'Saldo', width: 12 },
            { key: 'unit', label: 'Un.', width: 8 },
            { key: 'minStock', label: 'Estoque Mín.', width: 12 },
            { key: 'unitCost', label: 'Custo Unit.', width: 14 },
            { key: 'total', label: 'Valor Total', width: 16 },
          ],
          rows: rows.map((p) => ({
            name: p.name,
            category: p.category,
            quantity: num(p.quantity),
            unit: p.unit,
            minStock: num(p.minStock),
            unitCost: money(p.unitCost),
            total: money(p.quantity * p.unitCost),
          })),
        };
      }
      case 'purchases': {
        const rows = await this.prisma.purchase.findMany({ where: { ...scope, ...dateRange('date') }, include: { supplier: true }, orderBy: { date: 'desc' } });
        return {
          title: 'Compras',
          columns: [
            { key: 'date', label: 'Data', width: 12 },
            { key: 'number', label: 'Número', width: 12 },
            { key: 'supplier', label: 'Fornecedor', width: 28 },
            { key: 'status', label: 'Status', width: 12 },
            { key: 'total', label: 'Total', width: 16 },
          ],
          rows: rows.map((p) => ({ date: fmtDate(p.date), number: p.number ?? '', supplier: p.supplier.name, status: p.status, total: money(p.total) })),
        };
      }
      case 'sales': {
        const rows = await this.prisma.sale.findMany({ where: { ...scope, ...dateRange('date') }, include: { customer: true }, orderBy: { date: 'desc' } });
        return {
          title: 'Vendas',
          columns: [
            { key: 'date', label: 'Data', width: 12 },
            { key: 'number', label: 'Número', width: 12 },
            { key: 'customer', label: 'Cliente', width: 28 },
            { key: 'culture', label: 'Cultura', width: 14 },
            { key: 'status', label: 'Status', width: 12 },
            { key: 'total', label: 'Total', width: 16 },
          ],
          rows: rows.map((s) => ({ date: fmtDate(s.date), number: s.number ?? '', customer: s.customer?.name ?? '', culture: s.culture ?? '', status: s.status, total: money(s.total) })),
        };
      }
      case 'machines': {
        const rows = await this.prisma.machine.findMany({ where: { ...scope }, orderBy: { name: 'asc' } });
        return {
          title: 'Máquinas',
          columns: [
            { key: 'name', label: 'Máquina', width: 24 },
            { key: 'type', label: 'Tipo', width: 14 },
            { key: 'brand', label: 'Marca', width: 14 },
            { key: 'model', label: 'Modelo', width: 14 },
            { key: 'hoursMeter', label: 'Horímetro', width: 12 },
            { key: 'mileage', label: 'Km', width: 12 },
            { key: 'status', label: 'Status', width: 10 },
          ],
          rows,
        };
      }
      case 'fuel': {
        const rows = await this.prisma.fuelLog.findMany({ where: { ...scope, ...dateRange('date') }, include: { machine: true }, orderBy: { date: 'desc' } });
        return {
          title: 'Combustíveis',
          columns: [
            { key: 'date', label: 'Data', width: 12 },
            { key: 'machine', label: 'Máquina', width: 20 },
            { key: 'liters', label: 'Litros', width: 10 },
            { key: 'unitPrice', label: 'Preço/L', width: 12 },
            { key: 'totalCost', label: 'Total', width: 14 },
            { key: 'station', label: 'Posto', width: 18 },
          ],
          rows: rows.map((f) => ({ date: fmtDate(f.date), machine: f.machine?.name ?? '', liters: num(f.liters), unitPrice: money(f.unitPrice), totalCost: money(f.totalCost), station: f.station ?? '' })),
        };
      }
      case 'maintenance': {
        const rows = await this.prisma.maintenance.findMany({ where: { ...scope, ...dateRange('date') }, include: { machine: true }, orderBy: { date: 'desc' } });
        return {
          title: 'Manutenções',
          columns: [
            { key: 'date', label: 'Data', width: 12 },
            { key: 'machine', label: 'Máquina', width: 20 },
            { key: 'type', label: 'Tipo', width: 14 },
            { key: 'description', label: 'Descrição', width: 32 },
            { key: 'cost', label: 'Custo', width: 14 },
            { key: 'nextServiceDate', label: 'Próxima', width: 12 },
          ],
          rows: rows.map((m) => ({ date: fmtDate(m.date), machine: m.machine.name, type: m.type, description: m.description ?? '', cost: money(m.cost), nextServiceDate: fmtDate(m.nextServiceDate) })),
        };
      }
      case 'operations':
      case 'applications': {
        const rows = await this.prisma.fieldOperation.findMany({
          where: { ...scope, ...farmWhere, ...(key === 'applications' ? { type: 'PULVERIZACAO' } : {}), ...dateRange('doneDate') },
          include: { season: { include: { crop: true } } },
          orderBy: { createdAt: 'desc' },
        });
        return {
          title: key === 'applications' ? 'Aplicações' : 'Operações',
          columns: [
            { key: 'type', label: 'Tipo', width: 16 },
            { key: 'description', label: 'Descrição', width: 32 },
            { key: 'culture', label: 'Cultura', width: 14 },
            { key: 'date', label: 'Data', width: 12 },
            { key: 'area', label: 'Área (ha)', width: 12 },
            { key: 'hours', label: 'Horas', width: 10 },
            { key: 'cost', label: 'Custo', width: 14 },
            { key: 'status', label: 'Status', width: 12 },
          ],
          rows: rows.map((o) => ({
            type: o.type, description: o.description ?? '', culture: o.season?.crop?.culture ?? '',
            date: fmtDate(o.doneDate || o.plannedDate), area: num(o.areaHa), hours: num(o.hours), cost: money(o.cost), status: o.status,
          })),
        };
      }
      case 'employees': {
        const rows = await this.prisma.employee.findMany({ where: { ...scope }, orderBy: { name: 'asc' } });
        return {
          title: 'Funcionários',
          columns: [
            { key: 'name', label: 'Nome', width: 28 },
            { key: 'role', label: 'Função', width: 20 },
            { key: 'phone', label: 'Telefone', width: 16 },
            { key: 'hireDate', label: 'Admissão', width: 12 },
            { key: 'active', label: 'Ativo', width: 8 },
          ],
          rows: rows.map((e) => ({ ...e, hireDate: fmtDate(e.hireDate), active: e.active ? 'Sim' : 'Não' })),
        };
      }
      case 'season-comparison': {
        const seasons = await this.prisma.season.findMany({ where: { ...scope, ...farmWhere }, include: { crop: { include: { farm: true } } } });
        return {
          title: 'Comparativo entre Safras',
          columns: [
            { key: 'season', label: 'Safra', width: 18 },
            { key: 'farm', label: 'Fazenda', width: 18 },
            { key: 'culture', label: 'Cultura', width: 14 },
            { key: 'area', label: 'Área (ha)', width: 12 },
            { key: 'estimated', label: 'Prod. Estimada', width: 14 },
            { key: 'harvested', label: 'Prod. Colhida', width: 14 },
            { key: 'yield', label: 'Produtividade', width: 14 },
            { key: 'cost', label: 'Custo', width: 14 },
            { key: 'revenue', label: 'Receita', width: 14 },
          ],
          rows: seasons.map((s) => ({
            season: s.name, farm: s.crop.farm.name, culture: s.crop.culture, area: num(s.crop.areaHa),
            estimated: num(s.estimatedProduction), harvested: num(s.harvestedProduction),
            yield: num(s.actualYield ?? s.estimatedYield), cost: money(s.actualCost), revenue: money(s.actualRevenue),
          })),
        };
      }
      default:
        throw new BadRequestException('Relatório não encontrado');
    }
  }

  async toCsv(table: Table): Promise<string> {
    const header = table.columns.map((c) => `"${c.label}"`).join(';');
    const body = table.rows
      .map((r) => table.columns.map((c) => `"${String(r[c.key] ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');
    return `﻿${header}\n${body}`;
  }

  async toExcel(table: Table): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'AgroGestor IA';
    const ws = wb.addWorksheet(table.title.substring(0, 31));
    ws.columns = table.columns.map((c) => ({ header: c.label, key: c.key, width: c.width ?? 16 }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } };
    table.rows.forEach((r) => ws.addRow(r));
    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async toPdf(table: Table): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      doc.fillColor('#15803D').fontSize(16).text('AgroGestor IA', { continued: true });
      doc.fillColor('#334155').fontSize(11).text(`   ${table.title}`);
      doc.moveDown(0.3);
      doc.fillColor('#64748b').fontSize(8).text(`Gerado em ${new Date().toLocaleString('pt-BR')} · ${table.rows.length} registro(s)`);
      doc.moveDown(0.8);
      const usable = doc.page.width - 60;
      const weights = table.columns.map((c) => c.width ?? 16);
      const sumW = weights.reduce((a, b) => a + b, 0);
      const widths = weights.map((w) => (w / sumW) * usable);
      const drawRow = (values: string[], bold = false, shade = false) => {
        if (doc.y > doc.page.height - 60) {
          doc.addPage();
        }
        const y = doc.y;
        const rowHeight = Math.max(14, ...values.map((v, i) => doc.heightOfString(v, { width: widths[i] - 4, lineGap: 0 })));
        if (shade) doc.rect(30, y - 2, usable, rowHeight + 4).fill('#f1f5f9');
        let x = 30;
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(7.5).fillColor(bold ? '#ffffff' : '#1e293b');
        values.forEach((v, i) => {
          if (bold) doc.rect(x, y - 2, widths[i], rowHeight + 4).fill('#15803D');
          doc.fillColor(bold ? '#ffffff' : '#1e293b').text(v, x + 2, y, { width: widths[i] - 4 });
          x += widths[i];
        });
        doc.y = y + rowHeight + 6;
        doc.x = 30;
      };
      drawRow(table.columns.map((c) => c.label), true);
      table.rows.forEach((r, idx) => drawRow(table.columns.map((c) => String(r[c.key] ?? '')), false, idx % 2 === 1));
      doc.end();
    });
  }
}
