import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('Super Admin · Dashboard')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly service: AdminDashboardService) {}

  @Get()
  overview() {
    return this.service.overview();
  }
}
