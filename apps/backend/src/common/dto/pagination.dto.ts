import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: 'Busca textual' })
  @IsOptional()
  @IsString()
  search?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function paginate<T>(data: T[], total: number, page = 1, pageSize = 20): Paginated<T> {
  return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export function skipTake(dto: PaginationDto): { skip: number; take: number; page: number; pageSize: number } {
  const page = Math.max(1, Number(dto.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(dto.pageSize) || 20));
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}
