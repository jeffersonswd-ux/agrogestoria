import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsNumber, IsOptional, IsString, IsBoolean, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateCropDto {
  @ApiProperty()
  @IsString()
  farmId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plotId?: string;

  @ApiProperty({ example: 'Soja' })
  @IsString()
  culture: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variety?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cycle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCropDto extends PartialType(CreateCropDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateSeasonDto {
  @ApiProperty()
  @IsString()
  cropId: string;

  @ApiProperty({ example: 'Safra 2025/2026' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantingDatePlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  plantingDateDone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestDatePlan?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  harvestDateDone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedProduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  harvestedProduction?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  plannedCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  estimatedRevenue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSeasonDto extends PartialType(CreateSeasonDto) {}

export class CropFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  culture?: string;
}

export class SeasonFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cropId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  culture?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
