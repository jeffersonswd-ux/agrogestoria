import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/decorators';
import { APP_MODULES } from '../common/constants/modules';

@ApiTags('Super Admin · Módulos')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/modules')
export class AdminModulesController {
  @Get()
  catalog() {
    return APP_MODULES;
  }
}
