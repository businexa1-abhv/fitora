import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { AnalyticsPeriod } from '../analytics.constants';

export class AnalyticsQueryDto {
  @IsOptional()
  @IsEnum(AnalyticsPeriod)
  period?: AnalyticsPeriod;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AnalyticsExportQueryDto extends AnalyticsQueryDto {
  @IsOptional()
  metric?: 'revenue' | 'bookings' | 'memberships' | 'products' | 'users' | 'overview';
}
