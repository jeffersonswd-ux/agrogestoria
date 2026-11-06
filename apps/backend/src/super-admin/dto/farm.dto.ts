import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateAdminFarmDto {
  @ApiProperty()
  @IsString()
  companyId: string;

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

  @ApiPropertyOptional({ enum: ['ATIVO', 'BLOQUEADO'] })
  @IsOptional()
  @IsEnum({ ATIVO: 'ATIVO', BLOQUEADO: 'BLOQUEADO' })
  status?: 'ATIVO' | 'BLOQUEADO';
}

export class UpdateAdminFarmDto extends PartialType(CreateAdminFarmDto) {}

export class FarmQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

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
