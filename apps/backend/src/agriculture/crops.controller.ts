import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CropsService } from './crops.service';
import { CropFilterDto, CreateCropDto, CreateSeasonDto, SeasonFilterDto, UpdateCropDto, UpdateSeasonDto } from './dto/crop.dto';
import { AuthUser, CurrentUser, RequireModule, Roles } from '../common/decorators';

const WRITERS = [UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA, UserRole.AGRONOMO];

@ApiTags('Culturas e Safras')
@ApiBearerAuth()
@RequireModule('crops')
@Controller()
export class CropsController {
  constructor(private readonly service: CropsService) {}

  @Get('crops')
  listCrops(@CurrentUser() user: AuthUser, @Query() q: CropFilterDto) {
    return this.service.listCrops(user, q);
  }

  @Roles(...WRITERS)
  @Post('crops')
  createCrop(@CurrentUser() user: AuthUser, @Body() dto: CreateCropDto) {
    return this.service.createCrop(user, dto);
  }

  @Roles(...WRITERS)
  @Patch('crops/:id')
  updateCrop(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateCropDto) {
    return this.service.updateCrop(user, id, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('crops/:id')
  removeCrop(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeCrop(user, id);
  }

  @Get('seasons')
  listSeasons(@CurrentUser() user: AuthUser, @Query() q: SeasonFilterDto) {
    return this.service.listSeasons(user, q);
  }

  @Get('seasons-compare')
  compare(@CurrentUser() user: AuthUser, @Query('farmId') farmId?: string) {
    return this.service.compareSeasons(user, farmId);
  }

  @Roles(...WRITERS)
  @Post('seasons')
  createSeason(@CurrentUser() user: AuthUser, @Body() dto: CreateSeasonDto) {
    return this.service.createSeason(user, dto);
  }

  @Roles(...WRITERS)
  @Patch('seasons/:id')
  updateSeason(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: UpdateSeasonDto) {
    return this.service.updateSeason(user, id, dto);
  }

  @Roles(UserRole.ADMIN_CLIENTE, UserRole.GERENTE_FAZENDA)
  @Delete('seasons/:id')
  removeSeason(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.removeSeason(user, id);
  }
}
