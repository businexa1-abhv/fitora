import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole } from '@fitora/types';
import { RequirePermissions, Roles } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import { AiService } from './ai.service';
import {
  AiAttendanceInsightsDto,
  AiCoachPerformanceDto,
  AiDietTipsDto,
  AiMembershipRecommendDto,
  AiProductRecommendDto,
  AiRecommendQueryDto,
  AiRevenueInsightsDto,
  AiServiceRecommendDto,
  AiTrainingRecommendDto,
  AiWorkoutPlanDto,
} from './dto/ai.dto';

@ApiTags('ai')
@ApiBearerAuth('access-token')
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Get('health')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.AI_INSIGHTS)
  @ApiOperation({ summary: 'AI provider health and configuration' })
  health() {
    return this.aiService.health();
  }

  // ─── Recommendations ────────────────────────────────────────────────────────

  @Post('recommendations/courts')
  @RequirePermissions(Permission.AI_USE)
  @ApiOperation({ summary: 'AI-powered court recommendations' })
  recommendCourts(@CurrentUser() user: AuthUserPayload, @Body() dto: AiRecommendQueryDto) {
    return this.aiService.recommendCourts(user, dto);
  }

  @Post('recommendations/memberships')
  @RequirePermissions(Permission.AI_USE)
  @ApiOperation({ summary: 'AI-powered membership plan recommendations' })
  recommendMemberships(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: AiMembershipRecommendDto,
  ) {
    return this.aiService.recommendMemberships(user, dto);
  }

  @Post('recommendations/training-batches')
  @RequirePermissions(Permission.AI_USE)
  @ApiOperation({ summary: 'AI-powered training batch recommendations' })
  recommendTrainingBatches(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: AiTrainingRecommendDto,
  ) {
    return this.aiService.recommendTrainingBatches(user, dto);
  }

  @Post('recommendations/products')
  @RequirePermissions(Permission.AI_USE)
  @ApiOperation({ summary: 'AI-powered product recommendations' })
  recommendProducts(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: AiProductRecommendDto,
  ) {
    return this.aiService.recommendProducts(user, dto);
  }

  @Post('recommendations/services')
  @RequirePermissions(Permission.AI_USE)
  @ApiOperation({ summary: 'AI-powered service recommendations' })
  recommendServices(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: AiServiceRecommendDto,
  ) {
    return this.aiService.recommendServices(user, dto);
  }

  // ─── Generation ─────────────────────────────────────────────────────────────

  @Post('generate/workout-plan')
  @RequirePermissions(Permission.AI_USE)
  @ApiOperation({ summary: 'Generate a personalized workout plan' })
  generateWorkoutPlan(@CurrentUser() user: AuthUserPayload, @Body() dto: AiWorkoutPlanDto) {
    return this.aiService.generateWorkoutPlan(user, dto);
  }

  @Post('generate/diet-tips')
  @RequirePermissions(Permission.AI_USE)
  @ApiOperation({ summary: 'Generate sports nutrition and diet tips' })
  generateDietTips(@CurrentUser() user: AuthUserPayload, @Body() dto: AiDietTipsDto) {
    return this.aiService.generateDietTips(user, dto);
  }

  @Post('generate/attendance-insights')
  @RequirePermissions(Permission.AI_INSIGHTS)
  @ApiOperation({ summary: 'Generate attendance pattern insights for training batches' })
  generateAttendanceInsights(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: AiAttendanceInsightsDto,
  ) {
    return this.aiService.generateAttendanceInsights(user, dto);
  }

  @Post('generate/coach-performance')
  @RequirePermissions(Permission.AI_INSIGHTS)
  @ApiOperation({ summary: 'Generate coach/trainer performance insights' })
  generateCoachPerformance(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: AiCoachPerformanceDto,
  ) {
    return this.aiService.generateCoachPerformanceInsights(user, dto);
  }

  @Post('generate/revenue-insights')
  @RequirePermissions(Permission.AI_INSIGHTS)
  @ApiOperation({ summary: 'Generate revenue and business insights' })
  generateRevenueInsights(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: AiRevenueInsightsDto,
  ) {
    return this.aiService.generateRevenueInsights(user, dto);
  }
}
