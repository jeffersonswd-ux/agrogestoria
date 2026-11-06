import { Module } from '@nestjs/common';
import { FarmsController } from './farms.controller';
import { FarmsService } from './farms.service';
import { CropsController } from './crops.controller';
import { CropsService } from './crops.service';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';
import { PlanningController } from './planning.controller';

@Module({
  controllers: [FarmsController, CropsController, OperationsController, PlanningController],
  providers: [FarmsService, CropsService, OperationsService],
  exports: [CropsService],
})
export class AgricultureModule {}
