import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectCourtDto {
  @ApiProperty({ example: 'Incomplete address details or missing safety certifications' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class ResubmitCourtDto {
  @ApiPropertyOptional({ example: 'Updated address and added required documents' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
