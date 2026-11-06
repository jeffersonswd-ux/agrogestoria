import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { FinanceService } from './finance.service';
import { CreateTransactionDto, FinanceFilterDto, PayTransactionDto, UpdateTransactionDto } from './dto/finance.dto';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';

const WRITERS = [UserRole.ADMIN_CLIENTE, UserRole.FINANCEIRO, UserRole.GERENTE_FAZENDA];

@ApiTags('Financeiro')
@ApiBearerAuth()
@RequireModule('financial')
@Controller('financial')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('transactions')
  list(@CurrentUser() user: AuthUser, @Query() q: FinanceFilterDto) {
    return this.service.list(user, q);
  }

  @Get('cash-flow')
  cashFlow(@CurrentUser() user: AuthUser, @Query('year') year?: string) {
    return this.service.cashFlow(user, year ? Number(year) : undefined);
  }

  @Get('upcoming')
  upcoming(@CurrentUser() user: AuthUser, @Query('days') days?: string) {
    return this.service.upcoming(user, Number(days) || 7);
  }

  @Roles(...WRITERS)
  @Post('transactions')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.service.create(user, dto);
  }

  @Roles(...WRITERS)
  @Patch('transactions/:id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.service.update(user, id, dto);
  }

  @Roles(...WRITERS)
  @Post('transactions/:id/pay')
  pay(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: PayTransactionDto) {
    return this.service.pay(user, id, dto);
  }

  @Roles(...WRITERS)
  @Post('transactions/:id/reverse')
  reverse(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.reverse(user, id);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.FINANCEIRO)
  @Delete('transactions/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
