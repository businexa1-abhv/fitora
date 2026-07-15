import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class VenueQueryDto {
  @ApiPropertyOptional({ example: 'Hyderabad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by sport UUID' })
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @ApiPropertyOptional({ example: 'badminton' })
  @IsOptional()
  @IsString()
  sportSlug?: string;

  @ApiPropertyOptional({ example: 'BADMINTON' })
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiPropertyOptional({ example: 'jsk' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number;
}
