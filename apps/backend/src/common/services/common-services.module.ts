import { Global, Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { TenantService } from './tenant.service';

@Global()
@Module({
  providers: [AuditService, TenantService],
  exports: [AuditService, TenantService],
})
export class CommonServicesModule {}
