import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateEvolutionServerDto {
  @ApiProperty({ example: 'Servidor Principal' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'https://evolution.meudominio.com' })
  @IsString()
  baseUrl: string;

  @ApiProperty({ description: 'API Key da instância Evolution' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ enum: ['ATIVO', 'INATIVO'] })
  @IsOptional()
  @IsEnum({ ATIVO: 'ATIVO', INATIVO: 'INATIVO' })
  status?: 'ATIVO' | 'INATIVO';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEvolutionServerDto extends PartialType(CreateEvolutionServerDto) {}

export class AiUsageQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  to?: string;
}

export class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;
}
