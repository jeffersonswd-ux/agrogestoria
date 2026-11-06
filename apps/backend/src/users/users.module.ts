import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { SettingsController } from '../settings/settings.controller';

@Module({
  controllers: [UsersController, SettingsController],
  providers: [UsersService],
})
export class UsersModule {}
