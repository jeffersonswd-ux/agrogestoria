import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { IntegrationsService } from './integrations.service';
import {
  AiUsageQueryDto,
  AuditQueryDto,
  CreateEvolutionServerDto,
  UpdateEvolutionServerDto,
} from './dto/integration.dto';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';

@ApiTags('Super Admin · Integrações')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/integrations')
export class IntegrationsController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() dto: CreateEvolutionServerDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEvolutionServerDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/test')
  test(@Param('id') id: string) {
    return this.service.testConnection(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}

@ApiTags('Super Admin · Consumo de IA')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/ai-usage')
export class AiUsageAdminController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  list(@Query() q: AiUsageQueryDto) {
    return this.service.aiUsage({
      companyId: q.companyId,
      from: q.from,
      to: q.to,
      page: q.page,
      pageSize: q.pageSize,
    });
  }

  @Get(':companyId')
  details(@Param('companyId') companyId: string, @Query('page') page = '1') {
    return this.service.aiUsageDetails(companyId, Number(page) || 1, 50);
  }
}

@ApiTags('Super Admin · Logs e Auditoria')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/audit')
export class AuditAdminController {
  constructor(private readonly service: IntegrationsService) {}

  @Get()
  list(@Query() q: AuditQueryDto) {
    return this.service.auditLogs({
      companyId: q.companyId,
      action: q.action,
      entity: q.entity,
      from: q.from,
      to: q.to,
      page: q.page,
      pageSize: q.pageSize,
      search: q.search,
    });
  }
}
