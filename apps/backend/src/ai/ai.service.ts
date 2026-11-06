import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { AuthUser } from '../common/decorators';
import { isSuperAdmin } from '../common/utils/roles';

const PRICES: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  'gpt-4o': { input: 2.5 / 1_000_000, output: 10 / 1_000_000 },
  'gpt-4.1-mini': { input: 0.4 / 1_000_000, output: 1.6 / 1_000_000 },
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private client: OpenAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private getClient(): OpenAI | null {
    const key = process.env.OPENAI_API_KEY;
    if (!key) return null;
    if (!this.client) this.client = new OpenAI({ apiKey: key });
    return this.client;
  }

  private async buildContext(user: AuthUser): Promise<string> {
    const scope: { companyId?: string } = isSuperAdmin(user.role) ? {} : { companyId: user.companyId ?? undefined };
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const [farms, crops, txOpen, txMonth, fuelMonth, opsPending, machines] = await Promise.all([
      this.prisma.farm.findMany({ where: scope, select: { name: true, totalAreaHa: true, municipality: true, state: true } }),
      this.prisma.crop.findMany({ where: scope, select: { culture: true, areaHa: true, seasons: { select: { name: true, harvestedProduction: true, actualYield: true } } } }),
      this.prisma.financialTransaction.findMany({
        where: { ...scope, status: { in: ['PENDENTE', 'PARCIAL', 'VENCIDO'] }, dueDate: { lte: tomorrow } },
        select: { type: true, description: true, amount: true, dueDate: true, status: true },
        take: 50,
      }),
      this.prisma.financialTransaction.findMany({
        where: { ...scope, dueDate: { gte: monthStart } },
        select: { type: true, description: true, amount: true, paidAmount: true },
      }),
      this.prisma.fuelLog.findMany({ where: { ...scope, date: { gte: monthStart } }, select: { liters: true, totalCost: true, machine: { select: { name: true } } } }),
      this.prisma.fieldOperation.findMany({ where: { ...scope, status: { in: ['PLANEJADA', 'EM_ANDAMENTO', 'ATRASADA'] } }, select: { type: true, description: true, plannedDate: true, status: true }, take: 50 }),
      this.prisma.machine.findMany({ where: { ...scope, status: 'ATIVO' }, select: { name: true, hoursMeter: true, maintenance: { orderBy: { date: 'desc' }, take: 1, select: { nextServiceDate: true, nextServiceHours: true } } } }),
    ]);
    const diesel = fuelMonth.reduce((s, f) => s + f.totalCost, 0);
    const dieselLiters = fuelMonth.reduce((s, f) => s + f.liters, 0);
    const totalArea = crops.reduce((s, c) => s + c.areaHa, 0);
    const monthPayable = txMonth.filter((t) => t.type === 'PAGAR').reduce((s, t) => s + t.amount, 0);
    return JSON.stringify(
      {
        data: today.toISOString().slice(0, 10),
        fazendas: farms,
        culturas: crops.map((c) => ({ cultura: c.culture, areaHa: c.areaHa, safras: c.seasons })),
        areaTotalCulturas: totalArea,
        dieselMes: { litros: dieselLiters, custoR$: diesel },
        contasDespesasMes: monthPayable,
        contasPendentes: txOpen.map((t) => ({ tipo: t.type, descricao: t.description, valor: t.amount, vencimento: t.dueDate.toISOString().slice(0, 10), status: t.status })),
        operacoesPendentes: opsPending,
        maquinas: machines.map((m) => ({ nome: m.name, horimetro: m.hoursMeter, ultimaManutencao: m.maintenance[0] ?? null })),
      },
      null,
      0,
    );
  }

  async usageThisMonth(companyId: string) {
    const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return this.prisma.aiUsage.aggregate({ where: { companyId, createdAt: { gte: start } }, _count: { id: true }, _sum: { totalTokens: true, costUsd: true } });
  }

  async history(user: AuthUser) {
    return this.prisma.aiUsage.findMany({
      where: { companyId: user.companyId ?? undefined },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, question: true, answer: true, totalTokens: true, createdAt: true, source: true, status: true, model: true },
    });
  }

  async ask(user: AuthUser, question: string, source = 'WEB') {
    if (!question?.trim()) throw new BadRequestException('Informe uma pergunta');
    const client = this.getClient();
    if (!client) {
      throw new BadRequestException(
        'Assistente IA não configurado. Configure a variável OPENAI_API_KEY no servidor para habilitar o assistente.',
      );
    }
    const company = user.companyId
      ? await this.prisma.company.findUnique({ where: { id: user.companyId }, select: { aiMonthlyLimit: true } })
      : null;
    if (company?.aiMonthlyLimit) {
      const usage = await this.usageThisMonth(user.companyId!);
      if (usage._count.id >= company.aiMonthlyLimit) {
        throw new BadRequestException('Limite mensal de consultas de IA atingido. Contate o administrador.');
      }
    }
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    const context = await this.buildContext(user);
    const usageRow = await this.prisma.aiUsage.create({
      data: { companyId: user.companyId ?? null as any, model, question: question.slice(0, 2000), source, status: 'PENDENTE' },
    });
    try {
      const completion = await client.chat.completions.create({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: 'system',
            content:
              'Você é o Assistente Agro IA do AgroGestor IA. Responda em português do Brasil, de forma objetiva e prática, usando SOMENTE os dados JSON fornecidos do sistema. ' +
              'Formate valores em R$ e hectares. Se o dado não existir no JSON, diga que não há registro suficiente. NUNCA invente números.',
          },
          { role: 'user', content: `DADOS DO SISTEMA (JSON):\n${context}\n\nPERGUNTA: ${question}` },
        ],
      });
      const answer = completion.choices[0]?.message?.content ?? 'Sem resposta.';
      const promptTokens = completion.usage?.prompt_tokens ?? 0;
      const completionTokens = completion.usage?.completion_tokens ?? 0;
      const price = PRICES[model] ?? PRICES['gpt-4o-mini'];
      const costUsd = promptTokens * price.input + completionTokens * price.output;
      await this.prisma.aiUsage.update({
        where: { id: usageRow.id },
        data: { answer, promptTokens, completionTokens, totalTokens: promptTokens + completionTokens, costUsd, status: 'CONCLUIDO' },
      });
      return { id: usageRow.id, answer, model, tokens: promptTokens + completionTokens };
    } catch (err) {
      this.logger.error(`Erro OpenAI: ${(err as Error).message}`);
      await this.prisma.aiUsage.update({ where: { id: usageRow.id }, data: { status: 'ERRO', answer: (err as Error).message } });
      throw new BadRequestException(`Falha ao consultar o assistente: ${(err as Error).message}`);
    }
  }
}
