import { Controller, Logger, Post, Body, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * Webhook da Evolution API — roda no backend, independente do navegador.
 * Segurança: além do token de URL (EVOLUTION_WEBHOOK_TOKEN opcional),
 * valida que a instância informada pertence à empresa da query.
 */
@ApiTags('Webhooks')
@Controller('webhooks/evolution')
export class EvolutionWebhookController {
  private readonly logger = new Logger('EvolutionWebhook');

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post()
  async handle(
    @Body() payload: any,
    @Query('companyId') companyId: string,
    @Headers('x-evolution-token') headerToken?: string,
  ) {
    const expected = process.env.EVOLUTION_WEBHOOK_TOKEN;
    if (expected && headerToken !== expected) throw new UnauthorizedException('Token de webhook inválido');

    const event = payload?.event || payload?.type || 'unknown';
    const instanceName = payload?.instance || payload?.instanceName || payload?.instance?.instanceName;
    if (!instanceName) return { ok: true, ignored: 'instância ausente' };

    const instance = await this.prisma.whatsappInstance.findUnique({ where: { instanceKey: instanceName } });
    if (!instance) return { ok: true, ignored: 'instância desconhecida' };
    if (companyId && instance.companyId !== companyId) {
      this.logger.warn(`Webhook de instância ${instanceName} com companyId divergente — ignorado`);
      return { ok: true, ignored: 'empresa divergente' };
    }

    try {
      if (String(event).toUpperCase().includes('QRCODE')) {
        const qr = payload?.data?.qrcode?.base64 || payload?.data?.base64 || null;
        await this.prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: { qrCode: qr, status: 'AGUARDANDO_QR' },
        });
      } else if (String(event).toUpperCase().includes('CONNECTION')) {
        const state = String(payload?.data?.state || '').toLowerCase();
        await this.prisma.whatsappInstance.update({
          where: { id: instance.id },
          data: {
            status: state === 'open' ? 'CONECTADO' : 'DESCONECTADO',
            lastConnectedAt: state === 'open' ? new Date() : instance.lastConnectedAt,
            qrCode: state === 'open' ? null : instance.qrCode,
            phone: payload?.data?.phoneNumber || instance.phone,
          },
        });
      } else if (String(event).toUpperCase().includes('MESSAGE')) {
        const msg = payload?.data;
        const body =
          msg?.message?.conversation ||
          msg?.message?.extendedTextMessage?.text ||
          msg?.message?.imageMessage?.caption ||
          null;
        await this.prisma.whatsappMessage.create({
          data: {
            companyId: instance.companyId,
            instanceId: instance.id,
            direction: msg?.key?.fromMe ? 'OUT' : 'IN',
            fromNumber: msg?.key?.remoteJid?.split('@')[0] || null,
            body,
            mediaType: msg?.message ? Object.keys(msg.message)[0] : null,
            status: 'RECEBIDA',
            raw: payload as any,
          },
        });
      }
      return { ok: true };
    } catch (err) {
      this.logger.error(`Erro ao processar webhook: ${(err as Error).message}`);
      return { ok: false };
    }
  }
}
