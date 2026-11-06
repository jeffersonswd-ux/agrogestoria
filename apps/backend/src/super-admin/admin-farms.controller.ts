import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { AdminFarmsService } from './admin-farms.service';
import { CreateAdminFarmDto, FarmQueryDto, UpdateAdminFarmDto } from './dto/farm.dto';
import { CurrentUser, AuthUser, Roles } from '../common/decorators';

@ApiTags('Super Admin · Fazendas')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/farms')
export class AdminFarmsController {
  constructor(private readonly service: AdminFarmsService) {}

  @Get()
  list(@Query() q: FarmQueryDto) {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdminFarmDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user, {});
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdminFarmDto, @CurrentUser() user: AuthUser) {
    return this.service.update(id, dto, user, {});
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user, {});
  }
}
