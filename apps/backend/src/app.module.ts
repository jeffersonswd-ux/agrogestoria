import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { CommonServicesModule } from './common/services/common-services.module';
import { QueueModule } from './queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AgricultureModule } from './agriculture/agriculture.module';
import { OperationsModule } from './operations/operations.module';
import { FinanceModule } from './finance/finance.module';
import { WorkforceModule } from './workforce/workforce.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WeatherModule } from './weather/weather.module';
import { MapsModule } from './maps/maps.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { AiModule } from './ai/ai.module';
import { UploadModule } from './uploads/upload.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: Number(process.env.THROTTLE_TTL || 60) * 1000, limit: Number(process.env.THROTTLE_LIMIT || 120) }],
    }),
    PrismaModule,
    CommonModule,
    CommonServicesModule,
    QueueModule,
    AuthModule,
    SuperAdminModule,
    AgricultureModule,
    OperationsModule,
    FinanceModule,
    WorkforceModule,
    DashboardModule,
    WeatherModule,
    MapsModule,
    ReportsModule,
    UsersModule,
    WhatsappModule,
    AiModule,
    UploadModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
