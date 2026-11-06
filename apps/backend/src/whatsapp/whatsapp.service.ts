import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { decryptSecret } from '../common/utils/crypto';
import { AuthUser } from '../common/decorators';

const TIMEOUT = 15000;

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async serverFor(companyId: string) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, include: { evolutionServer: true } });
    if (!company) throw new NotFoundException('Empresa não encontrada');
    if (!company.evolutionServer || company.evolutionServer.status !== 'ATIVO') {
      throw new BadRequestException(
        'Nenhum servidor Evolution API ativo vinculado à sua empresa. Solicite ao administrador da plataforma.',
      );
    }
    return { server: company.evolutionServer, company };
  }

  private async call(baseUrl: string, apiKey: string, path: string, method: string, body?: any) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', apikey: apiKey },
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl.signal,
      });
      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }
      if (!res.ok) {
        throw new BadRequestException(`Evolution API: ${data?.message || data?.error || res.statusText} (${res.status})`);
      }
      return data;
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(
        (err as Error).name === 'AbortError'
          ? 'Servidor Evolution não respondeu a tempo'
          : `Não foi possível conectar ao servidor Evolution: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private genKey(companyId: string) {
    return `agrogestor-${companyId.slice(-10)}-${Date.now().toString(36)}`;
  }

  async status(user: AuthUser) {
    if (!user.companyId) throw new BadRequestException('Usuário sem empresa');
    const instance = await this.prisma.whatsappInstance.findFirst({ where: { companyId: user.companyId } });
    const company = await this.prisma.company.findUnique({
      where: { id: user.companyId },
      include: { evolutionServer: { select: { id: true, name: true, status: true } } },
    });
    return {
      instance,
      server: company?.evolutionServer ?? null,
      notificationsEnabled: instance?.notificationsEnabled ?? true,
    };
  }

  async createInstance(user: AuthUser) {
    if (!user.companyId) throw new BadRequestException('Usuário sem empresa');
    const existing = await this.prisma.whatsappInstance.findFirst({ where: { companyId: user.companyId } });
    if (existing) return this.refreshStatus(user);
    const { server } = await this.serverFor(user.companyId);
    const key = this.genKey(user.companyId);
    const webhookUrl =
      (process.env.EVOLUTION_WEBHOOK_BASE_URL || 'http://localhost:3001/api/webhooks/evolution') +
      `?companyId=${user.companyId}`;
    await this.call(server.baseUrl, decryptSecret(server.apiKey), '/instance/create', 'POST', {
      instanceName: key,
      integration: 'WHATSAPP-BAILEYS',
      qrcode: true,
      webhook: {
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: ['QRCODE_UPDATED', 'CONNECTION_UPDATE', 'MESSAGES_UPSERT'],
      },
    });
    const instance = await this.prisma.whatsappInstance.create({
      data: { companyId: user.companyId, serverId: server.id, name: key, instanceKey: key, status: 'AGUARDANDO_QR' },
    });
    await this.audit.log({ action: 'WHATSAPP_INSTANCIA_CRIADA', entity: 'WhatsappInstance', entityId: instance.id, actor: user });
    return this.connect(user);
  }

  async connect(user: AuthUser) {
    const { instance, server } = await this.requireInstance(user);
    const data = await this.call(server.baseUrl, decryptSecret(server.apiKey), `/instance/connect/${instance.instanceKey}`, 'GET');
    const qr = data?.base64 ?? data?.qrcode?.base64 ?? data?.code ?? null;
    const updated = await this.prisma.whatsappInstance.update({
      where: { id: instance.id },
      data: { qrCode: qr, status: qr ? 'AGUARDANDO_QR' : instance.status },
    });
    return { instance: updated, qrCode: qr, pairingCode: data?.pairingCode ?? data?.qrcode?.pairingCode ?? null };
  }

  async refreshStatus(user: AuthUser) {
    const { instance, server } = await this.requireInstance(user);
    try {
      const data = await this.call(server.baseUrl, decryptSecret(server.apiKey), `/instance/connectionState/${instance.instanceKey}`, 'GET');
      const state = (data?.instance?.state || data?.state || 'unknown').toUpperCase();
      const status = state === 'OPEN' ? 'CONECTADO' : state === 'CONNECTING' ? 'CONECTANDO' : 'DESCONECTADO';
      const updated = await this.prisma.whatsappInstance.update({
        where: { id: instance.id },
        data: {
          status,
          lastConnectedAt: status === 'CONECTADO' ? new Date() : instance.lastConnectedAt,
          qrCode: status === 'CONECTADO' ? null : instance.qrCode,
        },
      });
      return { instance: updated, state };
    } catch (err) {
      const updated = await this.prisma.whatsappInstance.update({ where: { id: instance.id }, data: { status: 'ERRO' } });
      return { instance: updated, error: (err as Error).message };
    }
  }

  async disconnect(user: AuthUser, deleteInstance = false) {
    const { instance, server } = await this.requireInstance(user);
    try {
      await this.call(server.baseUrl, decryptSecret(server.apiKey), `/instance/logout/${instance.instanceKey}`, 'DELETE');
    } catch {
      /* sessão já pode estar encerrada */
    }
    if (deleteInstance) {
      try {
        await this.call(server.baseUrl, decryptSecret(server.apiKey), `/instance/delete/${instance.instanceKey}`, 'DELETE');
      } catch {}
      await this.prisma.whatsappInstance.delete({ where: { id: instance.id } });
      await this.audit.log({ action: 'WHATSAPP_INSTANCIA_EXCLUIDA', entity: 'WhatsappInstance', entityId: instance.id, actor: user });
      return { ok: true, deleted: true };
    }
    const updated = await this.prisma.whatsappInstance.update({ where: { id: instance.id }, data: { status: 'DESCONECTADO', qrCode: null } });
    return { ok: true, instance: updated };
  }

  async setNotifications(user: AuthUser, enabled: boolean) {
    const { instance } = await this.requireInstance(user);
    return this.prisma.whatsappInstance.update({ where: { id: instance.id }, data: { notificationsEnabled: enabled } });
  }

  private async requireInstance(user: AuthUser) {
    if (!user.companyId) throw new BadRequestException('Usuário sem empresa');
    const { server } = await this.serverFor(user.companyId);
    const instance = await this.prisma.whatsappInstance.findFirst({ where: { companyId: user.companyId } });
    if (!instance) throw new BadRequestException('Nenhuma instância WhatsApp criada. Conecte primeiro.');
    return { instance, server };
  }

  async messages(user: AuthUser) {
    if (!user.companyId) return [];
    return this.prisma.whatsappMessage.findMany({
      where: { companyId: user.companyId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /** Notificação via WhatsApp (usada pelos workers). */
  async sendNotification(companyId: string, text: string) {
    const instance = await this.prisma.whatsappInstance.findFirst({ where: { companyId, status: 'CONECTADO', notificationsEnabled: true } });
    if (!instance?.serverId) return { sent: false, reason: 'WhatsApp não conectado' };
    const server = await this.prisma.evolutionServer.findUnique({ where: { id: instance.serverId } });
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!server || !company?.whatsapp) return { sent: false, reason: 'Sem número cadastrado' };
    const digits = company.whatsapp.replace(/\D/g, '');
    const data = await this.call(server.baseUrl, decryptSecret(server.apiKey), `/message/sendText/${instance.instanceKey}`, 'POST', {
      number: digits,
      text,
    });
    await this.prisma.whatsappMessage.create({
      data: {
        companyId,
        instanceId: instance.id,
        direction: 'OUT',
        toNumber: digits,
        body: text,
        status: 'ENVIADA',
        raw: data as any,
      },
    });
    return { sent: true };
  }
}
