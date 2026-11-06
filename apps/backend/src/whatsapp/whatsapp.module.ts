import { Module } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';
import { EvolutionWebhookController } from './evolution-webhook.controller';

@Module({
  controllers: [WhatsappController, EvolutionWebhookController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
