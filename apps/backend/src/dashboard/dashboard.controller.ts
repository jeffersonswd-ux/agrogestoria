import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { AuthUser, CurrentUser, RequireModule } from '../common/decorators';

@ApiTags('Dashboard')
@ApiBearerAuth()
@RequireModule('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  overview(
    @CurrentUser() user: AuthUser,
    @Query('farmId') farmId?: string,
    @Query('seasonId') seasonId?: string,
    @Query('culture') culture?: string,
    @Query('plotId') plotId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.overview(user, { farmId, seasonId, culture, plotId, from, to });
  }
}
