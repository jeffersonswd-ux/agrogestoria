import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FarmsService } from './farms.service';
import { CreateFarmDto, CreatePlotDto, FarmFilterDto, PlotFilterDto, UpdateFarmDto, UpdatePlotDto } from './dto/farm.dto';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';

@ApiTags('Propriedades e Talhões')
@ApiBearerAuth()
@RequireModule('properties')
@Controller()
export class FarmsController {
  constructor(private readonly service: FarmsService) {}

  @Get('farms')
  list(@CurrentUser() user: AuthUser, @Query() q: FarmFilterDto) {
    return this.service.list(user, q);
  }

  @Get('farms/:id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Post('farms')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateFarmDto) {
    return this.service.create(user, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Patch('farms/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateFarmDto) {
    return this.service.update(user, id, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Delete('farms/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Get('plots')
  listPlots(@CurrentUser() user: AuthUser, @Query() q: PlotFilterDto) {
    return this.service.listPlots(user, q);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.AGRONOMO)
  @Post('plots')
  createPlot(@CurrentUser() user: AuthUser, @Body() dto: CreatePlotDto) {
    return this.service.createPlot(user, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.AGRONOMO)
  @Patch('plots/:id')
  updatePlot(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdatePlotDto) {
    return this.service.updatePlot(user, id, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('plots/:id')
  removePlot(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removePlot(user, id);
  }
}
