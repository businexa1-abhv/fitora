import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@fitora/types';
import { Response } from 'express';
import { Roles } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { AnalyticsExportQueryDto, AnalyticsQueryDto } from './dto/analytics.dto';
import { AnalyticsPeriod } from './analytics.constants';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Full analytics dashboard with charts data' })
  getDashboard(@Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getDashboard({
      period: (query.period as AnalyticsPeriod) ?? AnalyticsPeriod.MONTHLY,
      from: query.from,
      to: query.to,
    });
  }

  @Get('owner/dashboard')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Court owner dashboard stats and revenue' })
  getOwnerDashboard(@CurrentUser() user: AuthUserPayload, @Query() query: AnalyticsQueryDto) {
    return this.analyticsService.getOwnerDashboard(user.id, {
      period: (query.period as AnalyticsPeriod) ?? AnalyticsPeriod.MONTHLY,
      from: query.from,
      to: query.to,
    });
  }

  @Get('owner/export')
  @Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Export owner reports as CSV' })
  async exportOwnerCsv(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: AnalyticsExportQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.analyticsService.exportOwnerCsv(user.id, query.metric ?? 'overview', {
      period: (query.period as AnalyticsPeriod) ?? AnalyticsPeriod.MONTHLY,
      from: query.from,
      to: query.to,
    });
    const filename = `fitora-owner-${query.metric ?? 'overview'}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get('export')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Export analytics as CSV' })
  async exportCsv(@Query() query: AnalyticsExportQueryDto, @Res() res: Response) {
    const csv = await this.analyticsService.exportCsv(query.metric ?? 'overview', {
      period: (query.period as AnalyticsPeriod) ?? AnalyticsPeriod.MONTHLY,
      from: query.from,
      to: query.to,
    });
    const filename = `fitora-analytics-${query.metric ?? 'overview'}-${Date.now()}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  }
}
