import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export enum TxType {
  PAGAR = 'PAGAR',
  RECEBER = 'RECEBER',
}

export class CreateTransactionDto {
  @ApiProperty({ enum: TxType })
  @IsEnum(TxType)
  type: TxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiProperty({ example: 'Insumos' })
  @IsString()
  category: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty()
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Número de parcelas; gera títulos futuros', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  installments?: number;

  @ApiPropertyOptional({ description: 'Intervalo entre parcelas em dias', default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  intervalDays?: number;
}

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}

export class PayTransactionDto {
  @ApiPropertyOptional({ description: 'Valor da baixa; vazio = saldo restante' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  paidDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinanceFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: TxType })
  @IsOptional()
  @IsEnum(TxType)
  type?: TxType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
