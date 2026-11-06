import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { TenantService } from '../common/services/tenant.service';
import { AuthUser, CurrentUser, RequireModule } from '../common/decorators';

/**
 * Planejamento agrícola: calendário de safras por fazenda.
 * Reutiliza as safras cadastradas em Culturas e Safras.
 */
@ApiTags('Planejamento Agrícola')
@ApiBearerAuth()
@RequireModule('planning')
@Controller('planning')
export class PlanningController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantService,
  ) {}

  @Get('seasons')
  async seasons(@CurrentUser() user: AuthUser, @Query('farmId') farmId?: string) {
    const where: any = { ...this.tenant.scope(user) };
    if (farmId) where.farmId = farmId;
    return this.prisma.season.findMany({
      where,
      orderBy: [{ plantingDatePlan: 'asc' }, { createdAt: 'desc' }],
      include: {
        crop: { select: { culture: true, variety: true, areaHa: true } },
        farm: { select: { name: true } },
      },
    });
  }
}
