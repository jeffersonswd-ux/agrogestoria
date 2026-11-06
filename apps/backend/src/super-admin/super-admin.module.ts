import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { AdminFarmsController } from './admin-farms.controller';
import { AdminFarmsService } from './admin-farms.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import {
  AiUsageAdminController,
  AuditAdminController,
  IntegrationsController,
} from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminModulesController } from './admin-modules.controller';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminDashboardController,
    CompaniesController,
    AdminFarmsController,
    AdminUsersController,
    IntegrationsController,
    AiUsageAdminController,
    AuditAdminController,
    AdminModulesController,
  ],
  providers: [
    CompaniesService,
    AdminFarmsService,
    AdminUsersService,
    IntegrationsService,
    AdminDashboardService,
  ],
})
export class SuperAdminModule {}
