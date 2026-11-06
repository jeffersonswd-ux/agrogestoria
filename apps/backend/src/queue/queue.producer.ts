import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from './queue.constants';

@Injectable()
export class QueueProducer {
  private readonly logger = new Logger(QueueProducer.name);

  constructor(
    @Inject(`QUEUE_${QUEUE_NAMES.NOTIFICATIONS}`) private readonly notifications: Queue,
    @Inject(`QUEUE_${QUEUE_NAMES.WHATSAPP}`) private readonly whatsapp: Queue,
    @Inject(`QUEUE_${QUEUE_NAMES.AI}`) private readonly ai: Queue,
    @Inject(`QUEUE_${QUEUE_NAMES.BILLING_CHECK}`) private readonly billing: Queue,
    @Inject(`QUEUE_${QUEUE_NAMES.REPORTS}`) private readonly reports: Queue,
  ) {}

  async notify(data: { companyId: string; type: string; title: string; body: string; link?: string }) {
    await this.notifications.add('create-notification', data, { jobId: `notif:${data.companyId}:${Date.now()}` });
  }

  async sendWhatsapp(data: { companyId: string; text: string }) {
    await this.whatsapp.add('send-text', data, { jobId: `wa:${data.companyId}:${Date.now()}` });
  }

  async processAi(data: { companyId: string; question: string; source: string }) {
    await this.ai.add('ask', data, { jobId: `ai:${data.companyId}:${Date.now()}` });
  }

  async checkDueDates() {
    await this.billing.add('check-due-dates', {}, { jobId: `billing:${Date.now()}` });
  }

  async generateReport(data: { companyId: string; report: string; format: string }) {
    await this.reports.add('generate', data, { jobId: `report:${data.companyId}:${data.report}:${Date.now()}` });
  }
}
