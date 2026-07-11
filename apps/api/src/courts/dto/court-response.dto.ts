import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CourtApprovalStatus } from '@prisma/client';

export class SportSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  iconUrl?: string | null;
}

export class CourtImageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  url: string;

  @ApiPropertyOptional()
  altText?: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isPrimary: boolean;
}

export class CourtOwnerSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;
}

export class CourtResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty()
  sportId: string;

  @ApiPropertyOptional({ type: SportSummaryDto })
  sport?: SportSummaryDto;

  @ApiProperty()
  address: string;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  state?: string | null;

  @ApiPropertyOptional()
  pincode?: string | null;

  @ApiPropertyOptional()
  latitude?: string | null;

  @ApiPropertyOptional()
  longitude?: string | null;

  @ApiProperty({ type: [String] })
  amenities: string[];

  @ApiPropertyOptional()
  rules?: string | null;

  @ApiPropertyOptional()
  defaultSlotPrice?: string | null;

  @ApiProperty({ enum: CourtApprovalStatus })
  approvalStatus: CourtApprovalStatus;

  @ApiProperty()
  isApproved: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  rejectionReason?: string | null;

  @ApiPropertyOptional({ type: [CourtImageResponseDto] })
  images?: CourtImageResponseDto[];

  @ApiPropertyOptional({ type: CourtOwnerSummaryDto })
  owner?: CourtOwnerSummaryDto;
}

export class PaginatedCourtsResponseDto {
  @ApiProperty({ type: [CourtResponseDto] })
  items: CourtResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalPages: number;
}
