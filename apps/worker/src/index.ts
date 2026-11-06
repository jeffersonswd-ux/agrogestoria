import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { QUEUE_NAMES } from './queue.constants';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const prisma = new PrismaClient();

const connection = new IORedis(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });

const log = (scope: string, msg: string, extra?: any) =>
  console.log(`[${new Date().toISOString()}] [${scope}] ${msg}${extra ? ' ' + JSON.stringify(extra) : ''}`);

/** Evita processar o mesmo job duas vezes (idempotência por chave de referência). */
async function alreadyHandled(referenceKey: string): Promise<boolean> {
  const existing = await prisma.notification.findFirst({
    where: { type: referenceKey },
    select: { id: true },
  });
  return !!existing;
}

async function start() {
  log('worker', 'Iniciando workers AgroGestor IA');

  // ── Notificações internas ─────────────────────────────────
  new Worker(
    QUEUE_NAMES.NOTIFICATIONS,
    async (job: Job) => {
      const { companyId, type, title, body, link } = job.data;
      if (await alreadyHandled(`NOTIF:${job.id}`)) return;
      await prisma.notification.create({ data: { companyId, type, title, body, link: link ?? null } });
      log('notifications', 'notificação criada', { companyId, type });
    },
    { connection, concurrency: 5 },
  );

  // ── Envio por WhatsApp (Evolution API) ───────────────────
  new Worker(
    QUEUE_NAMES.WHATSAPP,
    async (job: Job) => {
      const { companyId, text } = job.data;
      const instance = await prisma.whatsappInstance.findFirst({
        where: { companyId, status: 'CONECTADO', notificationsEnabled: true },
        include: { server: true },
      });
      if (!instance?.server) {
        log('whatsapp', 'ignorado: sem instância conectada', { companyId });
        return;
      }
      const company = await prisma.company.findUnique({ where: { id: companyId } });
      if (!company?.whatsapp) {
        log('whatsapp', 'ignorado: empresa sem número', { companyId });
        return;
      }
      const { decryptSecret } = await import('./crypto');
      const number = company.whatsapp.replace(/\D/g, '');
      const res = await fetch(`${instance.server.baseUrl.replace(/\/+$/, '')}/message/sendText/${instance.instanceKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: decryptSecret(instance.server.apiKey) },
        body: JSON.stringify({ number, text }),
      });
      const body = await res.text();
      await prisma.whatsappMessage.create({
        data: {
          companyId,
          instanceId: instance.id,
          direction: 'OUT',
          toNumber: number,
          body: text,
          status: res.ok ? 'ENVIADA' : 'ERRO',
          raw: { status: res.status, body } as any,
        },
      });
      if (!res.ok) throw new Error(`Evolution API respondeu ${res.status}`);
      log('whatsapp', 'mensagem enviada', { companyId });
    },
    { connection, concurrency: 3 },
  );

  // ── Verificação de vencimentos ───────────────────────────
  new Worker(
    QUEUE_NAMES.BILLING_CHECK,
    async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const due = await prisma.financialTransaction.findMany({
        where: { status: { in: ['PENDENTE', 'PARCIAL'] }, dueDate: { lte: tomorrow } },
        select: { id: true, companyId: true, description: true, amount: true, paidAmount: true, type: true },
      });
      for (const t of due) {
        const ref = `VENC:${t.id}:${t.paidAmount}`;
        if (await alreadyHandled(ref)) continue;
        const remaining = t.amount - t.paidAmount;
        await prisma.notification.create({
          data: {
            companyId: t.companyId,
            type: ref,
            title: t.type === 'PAGAR' ? 'Conta a pagar vencendo' : 'Conta a receber vencendo',
            body: `${t.description} — R$ ${remaining.toFixed(2)}`,
            link: '/financeiro',
          },
        });
      }
      log('billing', 'verificação de vencimentos concluída', { encontrados: due.length });
    },
    { connection, concurrency: 1 },
  );

  // ── Processamento de IA ───────────────────────────────────
  new Worker(
    QUEUE_NAMES.AI,
    async (job: Job) => {
      const { companyId, question, source } = job.data;
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        log('ai', 'ignorado: OPENAI_API_KEY não configurada');
        return;
      }
      const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const usage = await prisma.aiUsage.create({
        data: { companyId, model, question: question?.slice(0, 2000), source: source || 'WHATSAPP', status: 'PENDENTE' },
      });
      try {
        const completion = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model,
            temperature: 0.2,
            max_tokens: 700,
            messages: [
              { role: 'system', content: 'Você é o Assistente Agro IA. Responda em português do Brasil, usando apenas os dados fornecidos. NUNCA invente números.' },
              { role: 'user', content: `PERGUNTA: ${question}` },
            ],
          }),
        });
        const json: any = await completion.json();
        const answer = json.choices?.[0]?.message?.content ?? '';
        const promptTokens = json.usage?.prompt_tokens ?? 0;
        const completionTokens = json.usage?.completion_tokens ?? 0;
        await prisma.aiUsage.update({
          where: { id: usage.id },
          data: {
            answer,
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens,
            status: 'CONCLUIDO',
          },
        });
        log('ai', 'consulta processada', { companyId });
      } catch (err) {
        await prisma.aiUsage.update({ where: { id: usage.id }, data: { status: 'ERRO', answer: (err as Error).message } });
        throw err;
      }
    },
    { connection, concurrency: 2 },
  );

  // ── Relatórios em segundo plano ───────────────────────────
  new Worker(
    QUEUE_NAMES.REPORTS,
    async (job: Job) => {
      const { companyId, report } = job.data;
      const ref = `REPORT:${report}:${companyId}:${new Date().toISOString().slice(0, 10)}`;
      if (await alreadyHandled(ref)) return;
      await prisma.notification.create({
        data: {
          companyId,
          type: ref,
          title: 'Relatório disponível',
          body: `O relatório "${report}" foi processado.`,
          link: '/relatorios',
        },
      });
      log('reports', 'relatório processado', { companyId, report });
    },
    { connection, concurrency: 2 },
  );

  // ── Transcrição de áudio ──────────────────────────────────
  new Worker(
    QUEUE_NAMES.TRANSCRIPTION,
    async (job: Job) => {
      const { companyId, mediaUrl } = job.data;
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        log('transcription', 'ignorado: OPENAI_API_KEY não configurada');
        return;
      }
      const audio = await fetch(mediaUrl);
      const buffer = Buffer.from(await audio.arrayBuffer());
      const form = new FormData();
      form.append('file', new Blob([buffer]), 'audio.ogg');
      form.append('model', 'whisper-1');
      form.append('language', 'pt');
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const json: any = await res.json();
      await prisma.notification.create({
        data: {
          companyId,
          type: `AUDIO:${job.id}`,
          title: 'Áudio transcrito',
          body: json.text ?? 'Transcrição indisponível',
        },
      });
      log('transcription', 'áudio transcrito', { companyId });
    },
    { connection, concurrency: 2 },
  );

  // ── Alertas (manutenção preventiva, estoque mínimo) ───────
  new Worker(
    QUEUE_NAMES.ALERTS,
    async () => {
      const machines = await prisma.machine.findMany({
        where: { status: 'ATIVO' },
        include: { maintenance: { orderBy: { date: 'desc' }, take: 1 } },
      });
      const in30 = new Date(Date.now() + 30 * 86400000);
      for (const m of machines) {
        const last = m.maintenance[0];
        if (!last?.nextServiceDate || last.nextServiceDate > in30) continue;
        const ref = `MANUT:${m.id}:${last.nextServiceDate.toISOString().slice(0, 10)}`;
        if (await alreadyHandled(ref)) continue;
        await prisma.notification.create({
          data: {
            companyId: m.companyId,
            type: ref,
            title: 'Manutenção preventiva',
            body: `${m.name} — próxima manutenção em ${last.nextServiceDate.toLocaleDateString('pt-BR')}`,
            link: '/manutencoes',
          },
        });
      }
      const products = await prisma.product.findMany({ where: { active: true } });
      for (const p of products) {
        if (p.quantity > p.minStock) continue;
        const ref = `ESTOQUE:${p.id}:${new Date().toISOString().slice(0, 10)}`;
        if (await alreadyHandled(ref)) continue;
        await prisma.notification.create({
          data: {
            companyId: p.companyId,
            type: ref,
            title: 'Estoque baixo',
            body: `${p.name} — ${p.quantity} ${p.unit} (mínimo ${p.minStock})`,
            link: '/estoque',
          },
        });
      }
      log('alerts', 'alertas processados');
    },
    { connection, concurrency: 1 },
  );

  log('worker', 'Todos os workers ativos');
}

start().catch((err) => {
  console.error('Falha ao iniciar worker', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
