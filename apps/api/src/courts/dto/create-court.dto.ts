import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCourtImageDto {
  @ApiProperty({ example: 'https://cdn.fitora.com/courts/arena-1.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  url: string;

  @ApiPropertyOptional({ example: 'Main court view' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  isPrimary?: boolean;
}

export class CreateCourtDto {
  @ApiProperty({ example: 'Elite Badminton Arena' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Premium indoor courts with AC' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ description: 'Sport UUID' })
  @IsOptional()
  @IsUUID()
  sportId?: string;

  @ApiPropertyOptional({ example: 'badminton', description: 'Sport slug (alternative to sportId)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sportSlug?: string;

  @ApiPropertyOptional({
    example: 'BADMINTON',
    description: 'Legacy sport type enum — mapped to sport slug',
  })
  @IsOptional()
  @IsString()
  sportType?: string;

  @ApiProperty({ example: '123 Sports Complex, MG Road' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  address: string;

  @ApiProperty({ example: 'Bangalore' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional({ example: '560038' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ example: ['Parking', 'AC', 'Changing rooms'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  amenities?: string[];

  @ApiPropertyOptional({ example: 'Non-marking shoes required. Max 4 players per court.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  rules?: string;

  @ApiPropertyOptional({ example: 500, description: 'Default hourly slot price in INR' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultSlotPrice?: number;

  @ApiPropertyOptional({ example: 4, description: 'Default seats per slot for shared courts' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultSlotCapacity?: number;

  @ApiPropertyOptional({ type: [CreateCourtImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCourtImageDto)
  images?: CreateCourtImageDto[];
}
