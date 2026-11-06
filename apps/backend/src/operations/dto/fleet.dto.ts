import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateMachineDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Trator' })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  year?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plate?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hoursMeter?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fuelType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  acquisitionDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  acquisitionValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMachineDto extends PartialType(CreateMachineDto) {}

export class MachineFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class CreateMaintenanceDto {
  @ApiProperty()
  @IsString()
  machineId: string;

  @ApiProperty({ example: 'PREVENTIVA' })
  @IsString()
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hoursMeter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  parts?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextServiceDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  nextServiceHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMaintenanceDto extends PartialType(CreateMaintenanceDto) {}

export class MaintenanceFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  machineId?: string;
}

export class CreateFuelLogDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  liters: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  hoursMeter?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  mileage?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  station?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FuelFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
