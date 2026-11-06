import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class CreateEmployeeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiProperty({ example: 'Operador de máquinas' })
  @IsString()
  role: string;

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
  @Type(() => Number)
  @IsNumber()
  salary?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  dailyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class EmployeeFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  active?: string;
}

export class CreateTimeEntryDto {
  @ApiProperty()
  @IsString()
  employeeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hours: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  activity?: string;

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
}

export class CreateJournalDto {
  @ApiProperty()
  @IsString()
  farmId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  plotId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  seasonId?: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  activity: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  machineId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  inputs?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  photos?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateJournalDto extends PartialType(CreateJournalDto) {}

export class JournalFilterDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;
}
