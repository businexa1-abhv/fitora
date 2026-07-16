import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
export type ApiPaymentMethod = 'Cash' | 'Card' | 'UPI';
export type ApiStaffRole = 'Front Desk' | 'Coach' | 'Maintenance';
export type ApiPayrollLineStatus = 'PENDING' | 'PAID';

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  category!: string;

  @ApiProperty({ example: 4500 })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({ example: '2026-07-16', description: 'ISO date YYYY-MM-DD' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ['Cash', 'Card', 'UPI'] })
  @IsOptional()
  @IsEnum(['Cash', 'Card', 'UPI'] as const)
  paymentMethod?: ApiPaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  courtId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  receiptUrl?: string;
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class CreateSlotTypeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ example: 60 })
  @IsInt()
  @Min(1)
  durationMin!: number;

  @ApiProperty({ example: 1.0 })
  @IsNumber()
  @Min(0)
  multiplier!: number;

  @ApiProperty({ example: 'Blue' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  color!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSlotTypeDto extends PartialType(CreateSlotTypeDto) {}

export class StaffShiftQueryDto {
  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({ example: '2026-07-16' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

export class CreateStaffShiftDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  staffName!: string;

  @ApiProperty({ enum: ['Front Desk', 'Coach', 'Maintenance'] })
  @IsEnum(['Front Desk', 'Coach', 'Maintenance'] as const)
  role!: ApiStaffRole;

  @ApiProperty({ example: '2026-07-16' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  startTime!: string;

  @ApiProperty({ example: '17:00' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  endTime!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  area!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  staffUserId?: string;
}

export class UpdateStaffShiftDto extends PartialType(CreateStaffShiftDto) {}

export class UpdatePayrollLineDto {
  @ApiProperty({ enum: ['PENDING', 'PAID'] })
  @IsEnum(['PENDING', 'PAID'] as const)
  status!: ApiPayrollLineStatus;
}

export class CrmPlayerSearchQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class UpsertPlayerCrmProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  skillLevel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  skillNotes?: string;
}

export class CreatePlayerNoteDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

export class ExpenseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  category!: string;

  @ApiProperty()
  amount!: number;

  @ApiProperty()
  date!: string;

  @ApiPropertyOptional({ enum: ['Cash', 'Card', 'UPI'] })
  paymentMethod?: ApiPaymentMethod;
}

export class SlotTypeResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  durationMin!: number;

  @ApiProperty()
  multiplier!: number;

  @ApiProperty()
  color!: string;
}

export class StaffShiftResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  staffName!: string;

  @ApiProperty({ enum: ['Front Desk', 'Coach', 'Maintenance'] })
  role!: ApiStaffRole;

  @ApiProperty()
  date!: string;

  @ApiProperty()
  startTime!: string;

  @ApiProperty()
  endTime!: string;

  @ApiProperty()
  area!: string;
}
