import { Module } from '@nestjs/common';
import { FleetController } from './fleet.controller';
import { FleetService } from './fleet.service';
import { SupplyController } from './supply.controller';
import { SupplyService } from './supply.service';

@Module({
  controllers: [FleetController, SupplyController],
  providers: [FleetService, SupplyService],
})
export class OperationsModule {}
