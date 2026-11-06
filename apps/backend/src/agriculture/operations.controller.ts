import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OperationType, UserRole } from '@prisma/client';
import { OperationsService } from './operations.service';
import {
  CreateHarvestDto,
  CreateOperationDto,
  HarvestFilterDto,
  OperationFilterDto,
  UpdateOperationDto,
} from './dto/operation.dto';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';

const WRITERS = [UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.AGRONOMO, UserRole.OPERADOR];

@ApiTags('Operações de Campo')
@ApiBearerAuth()
@Controller()
export class OperationsController {
  constructor(private readonly service: OperationsService) {}

  @RequireModule('operations')
  @Get('operations')
  list(@CurrentUser() user: AuthUser, @Query() q: OperationFilterDto) {
    return this.service.list(user, q);
  }

  @RequireModule('operations')
  @Roles(...WRITERS)
  @Post('operations')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOperationDto) {
    return this.service.create(user, dto);
  }

  @RequireModule('operations')
  @Roles(...WRITERS)
  @Patch('operations/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOperationDto) {
    return this.service.update(user, id, dto);
  }

  @RequireModule('operations')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('operations/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  // Aplicações agrícolas = operações do tipo PULVERIZACAO (mesma tabela, filtro dedicado)
  @RequireModule('applications')
  @Get('applications')
  listApplications(@CurrentUser() user: AuthUser, @Query() q: OperationFilterDto) {
    return this.service.list(user, { ...q, type: OperationType.PULVERIZACAO });
  }

  @RequireModule('applications')
  @Roles(...WRITERS)
  @Post('applications')
  createApplication(@CurrentUser() user: AuthUser, @Body() dto: CreateOperationDto) {
    return this.service.create(user, { ...dto, type: OperationType.PULVERIZACAO });
  }

  @RequireModule('applications')
  @Roles(...WRITERS)
  @Patch('applications/:id')
  updateApplication(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateOperationDto) {
    return this.service.update(user, id, { ...dto, type: OperationType.PULVERIZACAO });
  }

  @RequireModule('applications')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('applications/:id')
  removeApplication(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @RequireModule('harvests')
  @Get('harvests')
  listHarvests(@CurrentUser() user: AuthUser, @Query() q: HarvestFilterDto) {
    return this.service.listHarvests(user, q);
  }

  @RequireModule('harvests')
  @Roles(...WRITERS)
  @Post('harvests')
  createHarvest(@CurrentUser() user: AuthUser, @Body() dto: CreateHarvestDto) {
    return this.service.createHarvest(user, dto);
  }

  @RequireModule('harvests')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.AGRONOMO)
  @Delete('harvests/:id')
  removeHarvest(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeHarvest(user, id);
  }
}
