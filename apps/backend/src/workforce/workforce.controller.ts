import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { WorkforceService } from './workforce.service';
import {
  CreateEmployeeDto,
  CreateJournalDto,
  CreateTimeEntryDto,
  EmployeeFilterDto,
  JournalFilterDto,
  UpdateEmployeeDto,
  UpdateJournalDto,
} from './dto/workforce.dto';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';

const WRITERS = [UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA];

@ApiTags('Funcionários e Diário de Campo')
@ApiBearerAuth()
@Controller()
export class WorkforceController {
  constructor(private readonly service: WorkforceService) {}

  @RequireModule('employees')
  @Get('employees')
  list(@CurrentUser() user: AuthUser, @Query() q: EmployeeFilterDto) {
    return this.service.listEmployees(user, q);
  }

  @RequireModule('employees')
  @Roles(...WRITERS)
  @Post('employees')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEmployeeDto) {
    return this.service.createEmployee(user, dto);
  }

  @RequireModule('employees')
  @Roles(...WRITERS)
  @Patch('employees/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.service.updateEmployee(user, id, dto);
  }

  @RequireModule('employees')
  @Roles(...WRITERS)
  @Delete('employees/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeEmployee(user, id);
  }

  @RequireModule('employees')
  @Get('time-entries')
  listEntries(@CurrentUser() user: AuthUser, @Query('page') page = '1', @Query('employeeId') employeeId?: string) {
    return this.service.listTimeEntries(user, Number(page) || 1, 30, employeeId);
  }

  @RequireModule('employees')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.OPERADOR)
  @Post('time-entries')
  createEntry(@CurrentUser() user: AuthUser, @Body() dto: CreateTimeEntryDto) {
    return this.service.createTimeEntry(user, dto);
  }

  @RequireModule('employees')
  @Roles(...WRITERS)
  @Delete('time-entries/:id')
  removeEntry(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeTimeEntry(user, id);
  }

  @RequireModule('journal')
  @Get('journal')
  listJournal(@CurrentUser() user: AuthUser, @Query() q: JournalFilterDto) {
    return this.service.listJournal(user, q);
  }

  @RequireModule('journal')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.OPERADOR, UserRole.AGRONOMO)
  @Post('journal')
  createJournal(@CurrentUser() user: AuthUser, @Body() dto: CreateJournalDto) {
    return this.service.createJournal(user, dto);
  }

  @RequireModule('journal')
  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.OPERADOR, UserRole.AGRONOMO)
  @Patch('journal/:id')
  updateJournal(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateJournalDto) {
    return this.service.updateJournal(user, id, dto);
  }

  @RequireModule('journal')
  @Roles(...WRITERS)
  @Delete('journal/:id')
  removeJournal(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeJournal(user, id);
  }
}
