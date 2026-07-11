import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateCourtDto } from './create-court.dto';

export class UpdateCourtDto extends PartialType(CreateCourtDto) {
  @ApiPropertyOptional({ description: 'Toggle court visibility for bookings' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
