import { Global, Module } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { QUEUE_NAMES } from './queue.constants';
import { QueueProducer } from './queue.producer';

export const QUEUES = QUEUE_NAMES;

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CONNECTION',
      useFactory: () =>
        new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        }),
    },
    ...Object.values(QUEUE_NAMES).map((name) => ({
      provide: `QUEUE_${name}`,
      useFactory: (redis: IORedis) => new Queue(name, { connection: redis, defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 5000 }, removeOnComplete: 100, removeOnFail: 500 } }),
      inject: ['REDIS_CONNECTION'],
    })),
    QueueProducer,
  ],
  exports: ['REDIS_CONNECTION', QueueProducer, ...Object.values(QUEUE_NAMES).map((n) => `QUEUE_${n}`)],
})
export class QueueModule {}
