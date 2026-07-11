import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Max, Min } from 'class-validator';

export class TopupWalletDto {
  @ApiProperty({ example: 500, description: 'Amount in INR' })
  @IsNumber()
  @Min(100)
  @Max(50000)
  amount!: number;
}
