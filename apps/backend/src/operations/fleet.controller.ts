import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FleetService } from './fleet.service';
import {
  CreateFuelLogDto,
  CreateMachineDto,
  CreateMaintenanceDto,
  FuelFilterDto,
  MachineFilterDto,
  MaintenanceFilterDto,
  UpdateMachineDto,
  UpdateMaintenanceDto,
} from './dto/fleet.dto';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';

const WRITERS = [UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.OPERADOR];

@ApiTags('Máquinas e Implementos')
@ApiBearerAuth()
@Controller()
export class FleetController {
  constructor(private readonly service: FleetService) {}

  @RequireModule('machines')
  @Get('machines')
  listMachines(@CurrentUser() user: AuthUser, @Query() q: MachineFilterDto) {
    return this.service.listMachines(user, q);
  }

  @RequireModule('machines')
  @Roles(...WRITERS)
  @Post('machines')
  createMachine(@CurrentUser() user: AuthUser, @Body() dto: CreateMachineDto) {
    return this.service.createMachine(user, dto);
  }

  @RequireModule('machines')
  @Roles(...WRITERS)
  @Patch('machines/:id')
  updateMachine(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateMachineDto) {
    return this.service.updateMachine(user, id, dto);
  }

  @RequireModule('machines')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('machines/:id')
  removeMachine(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeMachine(user, id);
  }

  @RequireModule('maintenance')
  @Get('maintenance')
  listMaintenance(@CurrentUser() user: AuthUser, @Query() q: MaintenanceFilterDto) {
    return this.service.listMaintenance(user, q);
  }

  @RequireModule('maintenance')
  @Get('maintenance/alerts')
  alerts(@CurrentUser() user: AuthUser) {
    return this.service.maintenanceAlerts(user);
  }

  @RequireModule('maintenance')
  @Roles(...WRITERS)
  @Post('maintenance')
  createMaintenance(@CurrentUser() user: AuthUser, @Body() dto: CreateMaintenanceDto) {
    return this.service.createMaintenance(user, dto);
  }

  @RequireModule('maintenance')
  @Roles(...WRITERS)
  @Patch('maintenance/:id')
  updateMaintenance(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateMaintenanceDto) {
    return this.service.updateMaintenance(user, id, dto);
  }

  @RequireModule('maintenance')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('maintenance/:id')
  removeMaintenance(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeMaintenance(user, id);
  }

  @RequireModule('fuel')
  @Get('fuel')
  listFuel(@CurrentUser() user: AuthUser, @Query() q: FuelFilterDto) {
    return this.service.listFuel(user, q);
  }

  @RequireModule('fuel')
  @Roles(...WRITERS)
  @Post('fuel')
  createFuel(@CurrentUser() user: AuthUser, @Body() dto: CreateFuelLogDto) {
    return this.service.createFuel(user, dto);
  }

  @RequireModule('fuel')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('fuel/:id')
  removeFuel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeFuel(user, id);
  }
}
