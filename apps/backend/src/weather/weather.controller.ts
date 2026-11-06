import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WeatherService } from './weather.service';
import { AuthUser, CurrentUser, RequireModule } from '../common/decorators';

@ApiTags('Clima')
@ApiBearerAuth()
@RequireModule('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly service: WeatherService) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Query('farmId') farmId?: string) {
    return this.service.get(user, farmId);
  }
}
