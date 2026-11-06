export const QUEUE_NAMES = {
  NOTIFICATIONS: 'agro-notifications',
  ALERTS: 'agro-alerts',
  WHATSAPP: 'agro-whatsapp',
  WEBHOOKS: 'agro-webhooks',
  TRANSCRIPTION: 'agro-transcription',
  AI: 'agro-ai',
  REPORTS: 'agro-reports',
  BILLING_CHECK: 'agro-billing-check',
  SCHEDULED: 'agro-scheduled',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
