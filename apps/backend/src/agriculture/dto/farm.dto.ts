import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { IrrigationType, SoilType } from '@prisma/client';

export class CreateFarmDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ownerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAreaHa?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  agriculturalAreaHa?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  availableAreaHa?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  predominantProduction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFarmDto extends PartialType(CreateFarmDto) {}

export class FarmFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  municipality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ enum: ['ATIVO', 'BLOQUEADO'] })
  @IsOptional()
  @IsEnum({ ATIVO: 'ATIVO', BLOQUEADO: 'BLOQUEADO' })
  status?: 'ATIVO' | 'BLOQUEADO';
}

export class CreatePlotDto {
  @ApiProperty()
  @IsString()
  farmId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  areaHa: number;

  @ApiPropertyOptional({ enum: SoilType })
  @IsOptional()
  @IsEnum(SoilType)
  soilType?: SoilType;

  @ApiPropertyOptional({ enum: IrrigationType })
  @IsOptional()
  @IsEnum(IrrigationType)
  irrigationType?: IrrigationType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ description: 'GeoJSON Polygon' })
  @IsOptional()
  boundary?: any;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePlotDto extends PartialType(CreatePlotDto) {}

export class PlotFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;
}
