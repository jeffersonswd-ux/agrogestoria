import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';

@ApiTags('Usuários da empresa')
@ApiBearerAuth()
@RequireModule('users')
@Controller('settings/users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: any) {
    return this.service.create(user, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(user, id, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE)
  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
