import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import {
  BlockCompanyDto,
  CompanyQueryDto,
  CreateCompanyDto,
  DeleteCompanyDto,
  ResetPasswordDto,
  UpdateCompanyDto,
  UpdateModulesDto,
} from './dto/company.dto';
import { CurrentUser, AuthUser, Roles } from '../common/decorators';
import { UserRole } from '@prisma/client';

@ApiTags('Super Admin · Clientes')
@ApiBearerAuth()
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin/companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Get()
  list(@Query() q: CompanyQueryDto) {
    return this.service.list(q);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: AuthUser, @Req() req: any) {
    return this.service.create(dto, user, { ip: req.ip, userAgent: req.headers?.['user-agent'] });
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser() user: AuthUser,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, user, { ip: req.ip, userAgent: req.headers?.['user-agent'] });
  }

  @Post(':id/block')
  block(@Param('id') id: string, @Body() dto: BlockCompanyDto, @CurrentUser() user: AuthUser, @Req() req: any) {
    return this.service.block(id, dto?.reason, user, { ip: req.ip, userAgent: req.headers?.['user-agent'] });
  }

  @Post(':id/unblock')
  unblock(@Param('id') id: string, @CurrentUser() user: AuthUser, @Req() req: any) {
    return this.service.unblock(id, user, { ip: req.ip, userAgent: req.headers?.['user-agent'] });
  }

  @Post(':id/reset-password')
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: AuthUser,
    @Req() req: any,
  ) {
    return this.service.resetAdminPassword(id, dto, user, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Get(':id/modules')
  getModules(@Param('id') id: string) {
    return this.service.getModules(id);
  }

  @Put(':id/modules')
  setModules(
    @Param('id') id: string,
    @Body() dto: UpdateModulesDto,
    @CurrentUser() user: AuthUser,
    @Req() req: any,
  ) {
    return this.service.setModules(id, dto.modules, user, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  @Get(':id/history')
  history(@Param('id') id: string, @Query('page') page = '1', @Query('pageSize') pageSize = '50') {
    return this.service.history(id, Number(page) || 1, Number(pageSize) || 50);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Body() dto: DeleteCompanyDto, @CurrentUser() user: AuthUser, @Req() req: any) {
    return this.service.remove(id, dto?.confirmation, user, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }
}
