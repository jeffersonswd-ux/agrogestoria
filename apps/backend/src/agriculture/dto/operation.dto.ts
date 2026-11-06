import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OperationStatus, OperationType } from '@prisma/client';

export class OperationInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsString()
  unit: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCost?: number;
}

export class CreateOperationDto {
  @ApiProperty()
  @IsString()
  farmId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plotId?: string;

  @ApiProperty({ enum: OperationType })
  @IsEnum(OperationType)
  type: OperationType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plannedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  doneDate?: string;

  @ApiPropertyOptional({ enum: OperationStatus })
  @IsOptional()
  @IsEnum(OperationStatus)
  status?: OperationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaHa?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fuelLiters?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ type: [OperationInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OperationInputDto)
  inputs?: OperationInputDto[];
}

export class UpdateOperationDto extends PartialType(CreateOperationDto) {}

export class OperationFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiPropertyOptional({ enum: OperationType })
  @IsOptional()
  @IsEnum(OperationType)
  type?: OperationType;

  @ApiPropertyOptional({ enum: OperationStatus })
  @IsOptional()
  @IsEnum(OperationStatus)
  status?: OperationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateHarvestDto {
  @ApiProperty()
  @IsString()
  seasonId: string;

  @ApiProperty()
  @IsDateString()
  harvestDate: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaHarvested: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ default: 'sc' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  moisture?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  quality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  losses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class HarvestFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seasonId?: string;
}
