import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  razorpaySignature?: string;
}

export class MockCompletePaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  paymentId: string;
}

export class RefundPaymentDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
