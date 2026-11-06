import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MapsService } from './maps.service';
import { AuthUser, CurrentUser, RequireModule } from '../common/decorators';

@ApiTags('Mapas Agrícolas')
@ApiBearerAuth()
@RequireModule('maps')
@Controller('maps')
export class MapsController {
  constructor(private readonly service: MapsService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser, @Query('farmId') farmId?: string) {
    return this.service.overview(user, farmId);
  }

  @Post('area')
  area(@Body() body: { boundary: any }) {
    return this.service.calculateArea(body?.boundary);
  }
}
