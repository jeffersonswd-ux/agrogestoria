import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminUsersService } from './admin-users.service';
import { AdminUserQueryDto, CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import { ResetPasswordDto } from './dto/company.dto';
import { AuthUser, CurrentUser, Roles } from '../common/decorators';

@ApiTags('Super Admin · Usuários')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  list(@Query() q: AdminUserQueryDto) {
    return this.service.list(q);
  }

  @Post()
  create(@Body() dto: CreateAdminUserDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user);
  }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user);
  }
}
