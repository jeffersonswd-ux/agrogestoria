import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateProductDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Sementes' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ default: 'un' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  storageLocation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lot?: string;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lowStock?: string;
}

export class MovementDto {
  @ApiProperty({ enum: ['ENTRADA', 'SAIDA', 'TRANSFERENCIA', 'AJUSTE'] })
  @IsString()
  type: 'ENTRADA' | 'SAIDA' | 'TRANSFERENCIA' | 'AJUSTE';

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  unitCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lot?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;
}

export class CreateSupplierDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;
}

export class UpdateSupplierDto extends PartialType(CreateSupplierDto) {}
export class CreateCustomerDto extends CreateSupplierDto {}
export class UpdateCustomerDto extends PartialType(CreateSupplierDto) {}

export class LineItemDto {
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

  @ApiPropertyOptional({ default: 'un' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}

export class CreatePurchaseDto {
  @ApiProperty()
  @IsString()
  supplierId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  freight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items: LineItemDto[];
}

export class UpdatePurchaseDto extends PartialType(CreatePurchaseDto) {
  @ApiPropertyOptional({ description: 'Marca itens como recebidos e dá entrada no estoque' })
  @IsOptional()
  @IsBoolean()
  receive?: boolean;
}

export class CreateSaleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  culture?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  items: LineItemDto[];
}

export class UpdateSaleDto extends PartialType(CreateSaleDto) {}
