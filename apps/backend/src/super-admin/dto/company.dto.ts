import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateCompanyDto {
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  clientName: string;

  @ApiProperty({ example: 'Fazenda Santa Maria Agropecuária' })
  @IsString()
  companyName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

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
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['ATIVO', 'BLOQUEADO'] })
  @IsOptional()
  @IsEnum({ ATIVO: 'ATIVO', BLOQUEADO: 'BLOQUEADO' })
  status?: 'ATIVO' | 'BLOQUEADO';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  simpleMode?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  userLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  aiMonthlyLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  evolutionServerId?: string;

  // Usuário administrador inicial
  @ApiProperty({ example: 'João Silva' })
  @IsString()
  adminName: string;

  @ApiProperty({ example: 'joao@fazenda.com' })
  @IsEmail()
  adminEmail: string;

  @ApiPropertyOptional({ description: 'Senha inicial; se vazia um generatedPassword é retornado' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  adminPassword?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Módulos liberados; vazio = todos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];
}

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  blockedReason?: string;
}

export class BlockCompanyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResetPasswordDto {
  @ApiPropertyOptional({ description: 'Nova senha; se vazia gera uma senha aleatória e retorna uma vez' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  requirePasswordChange?: boolean;
}

export class UpdateModulesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  modules: string[];
}

export class CompanyQueryDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['ATIVO', 'BLOQUEADO'] })
  @IsOptional()
  @IsEnum({ ATIVO: 'ATIVO', BLOQUEADO: 'BLOQUEADO' })
  status?: 'ATIVO' | 'BLOQUEADO';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;
}

export class DeleteCompanyDto {
  @ApiProperty({ description: 'Digite EXCLUIR para confirmar' })
  @IsString()
  confirmation: string;
}
