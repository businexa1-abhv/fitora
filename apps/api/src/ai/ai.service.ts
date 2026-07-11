import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import type {
  AiDietTipsResponse,
  AiInsightResponse,
  AiRecommendationsResponse,
  AiWorkoutPlanResponse,
} from '@fitora/types';
import { AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  AI_SYSTEM_PROMPT,
  DIET_JSON_SCHEMA,
  INSIGHT_JSON_SCHEMA,
  RECOMMENDATION_JSON_SCHEMA,
  resolveAiDateRange,
  WORKOUT_JSON_SCHEMA,
} from './ai.constants';
import { AiContextService } from './ai-context.service';
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
import { OpenAiProvider } from './providers/openai.provider';

type Candidate = { id: string; name: string; [key: string]: unknown };

@Injectable()
export class AiService {
  constructor(
    private openAi: OpenAiProvider,
    private context: AiContextService,
  ) {}

  health() {
    return {
      status: 'ok',
      mode: this.openAi.isMockMode() ? 'mock' : 'live',
      model: this.openAi.getModel(),
    };
  }

  async recommendCourts(user: AuthUserPayload, dto: AiRecommendQueryDto): Promise<AiRecommendationsResponse> {
    const [profile, candidates] = await Promise.all([
      this.context.getUserProfile(user.id),
      this.context.getCourtCandidates(dto),
    ]);
    return this.recommend('courts', candidates, profile, dto);
  }

  async recommendMemberships(
    user: AuthUserPayload,
    dto: AiMembershipRecommendDto,
  ): Promise<AiRecommendationsResponse> {
    const [profile, candidates] = await Promise.all([
      this.context.getUserProfile(user.id),
      this.context.getMembershipCandidates(dto),
    ]);
    return this.recommend('membership plans', candidates, profile, dto);
  }

  async recommendTrainingBatches(
    user: AuthUserPayload,
    dto: AiTrainingRecommendDto,
  ): Promise<AiRecommendationsResponse> {
    const [profile, candidates] = await Promise.all([
      this.context.getUserProfile(user.id),
      this.context.getTrainingBatchCandidates(dto),
    ]);
    return this.recommend('training batches', candidates, profile, dto);
  }

  async recommendProducts(
    user: AuthUserPayload,
    dto: AiProductRecommendDto,
  ): Promise<AiRecommendationsResponse> {
    const [profile, candidates] = await Promise.all([
      this.context.getUserProfile(user.id),
      this.context.getProductCandidates(dto),
    ]);
    return this.recommend('products', candidates, profile, dto);
  }

  async recommendServices(
    user: AuthUserPayload,
    dto: AiServiceRecommendDto,
  ): Promise<AiRecommendationsResponse> {
    const [profile, candidates] = await Promise.all([
      this.context.getUserProfile(user.id),
      this.context.getServiceCandidates(dto),
    ]);
    return this.recommend('services', candidates, profile, dto);
  }

  async generateWorkoutPlan(user: AuthUserPayload, dto: AiWorkoutPlanDto): Promise<AiWorkoutPlanResponse> {
    const profile = await this.context.getUserProfile(user.id);
    const prompt = `WORKOUT — Generate a personalized workout plan.
User profile: ${this.context.buildUserContextBlock(profile)}
Request: ${JSON.stringify(dto)}
Return JSON: ${WORKOUT_JSON_SCHEMA}`;

    const result = await this.openAi.complete(
      [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      { json: true },
    );

    const parsed = this.parseJson<{
      title: string;
      plan: AiWorkoutPlanResponse['plan'];
      tips: string[];
    }>(result.content);

    return { ...parsed, mock: result.mock };
  }

  async generateDietTips(user: AuthUserPayload, dto: AiDietTipsDto): Promise<AiDietTipsResponse> {
    const profile = await this.context.getUserProfile(user.id);
    const prompt = `DIET — Generate sports nutrition advice.
User profile: ${this.context.buildUserContextBlock(profile)}
Request: ${JSON.stringify(dto)}
Return JSON: ${DIET_JSON_SCHEMA}`;

    const result = await this.openAi.complete(
      [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      { json: true },
    );

    const parsed = this.parseJson<{
      title: string;
      tips: string[];
      mealIdeas: string[];
      hydration: string;
    }>(result.content);

    return { ...parsed, mock: result.mock };
  }

  async generateAttendanceInsights(
    user: AuthUserPayload,
    dto: AiAttendanceInsightsDto,
  ): Promise<AiInsightResponse> {
    const data = await this.context.getAttendanceContext({
      userId: user.id,
      roles: user.roles as UserRole[],
      batchId: dto.batchId,
      enrollmentId: dto.enrollmentId,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
    });

    if (data.length === 0) {
      throw new BadRequestException('No attendance data found for the given filters');
    }

    const prompt = `ATTENDANCE — Analyze training attendance data and provide insights.
Data: ${JSON.stringify(data)}
Return JSON: ${INSIGHT_JSON_SCHEMA}`;

    return this.generateInsight(prompt);
  }

  async generateCoachPerformanceInsights(
    user: AuthUserPayload,
    dto: AiCoachPerformanceDto,
  ): Promise<AiInsightResponse> {
    const data = await this.context.getCoachPerformanceContext({
      userId: user.id,
      roles: user.roles as UserRole[],
      trainerId: dto.trainerId,
      batchId: dto.batchId,
      from: dto.from ? new Date(dto.from) : undefined,
      to: dto.to ? new Date(dto.to) : undefined,
    });

    if (!data) {
      throw new BadRequestException('Trainer context not found or access denied');
    }

    const prompt = `COACH — Analyze coach/trainer performance metrics.
Data: ${JSON.stringify(data)}
Return JSON: ${INSIGHT_JSON_SCHEMA}`;

    return this.generateInsight(prompt);
  }

  async generateRevenueInsights(
    user: AuthUserPayload,
    dto: AiRevenueInsightsDto,
  ): Promise<AiInsightResponse> {
    const period = dto.period ?? 'monthly';
    const { start, end } = resolveAiDateRange(period, dto.from, dto.to);

    const courtOwnerId = user.roles.includes(UserRole.COURT_OWNER) && !user.roles.includes(UserRole.ADMIN)
      ? user.id
      : undefined;

    const data = await this.context.getRevenueContext({
      from: start,
      to: end,
      courtOwnerId: dto.courtId ? undefined : courtOwnerId,
    });

    const prompt = `REVENUE — Analyze business revenue data for a sports platform operator.
Scope: ${courtOwnerId ? 'court owner' : 'platform admin'}
Data: ${JSON.stringify(data)}
Return JSON: ${INSIGHT_JSON_SCHEMA}`;

    return this.generateInsight(prompt);
  }

  private async recommend(
    entityLabel: string,
    candidates: Candidate[],
    profile: Awaited<ReturnType<AiContextService['getUserProfile']>>,
    dto: AiRecommendQueryDto,
  ): Promise<AiRecommendationsResponse> {
    if (candidates.length === 0) {
      return { items: [], summary: `No ${entityLabel} match your filters.`, mock: this.openAi.isMockMode() };
    }

    const limit = dto.limit ?? 5;
    const prompt = `Recommend the best ${entityLabel} for this user.
User profile: ${this.context.buildUserContextBlock(profile, dto.preferences)}
Candidates (use exact id values): ${JSON.stringify(candidates)}
Return top ${limit} ranked items as JSON: ${RECOMMENDATION_JSON_SCHEMA}`;

    const result = await this.openAi.complete(
      [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      { json: true },
    );

    const parsed = this.parseJson<{
      summary: string;
      items: Array<{ id: string; score: number; reason: string }>;
    }>(result.content);

    const candidateMap = new Map(candidates.map((c) => [c.id, c]));

    const items = parsed.items
      .filter((item) => candidateMap.has(item.id))
      .slice(0, limit)
      .map((item) => {
        const candidate = candidateMap.get(item.id)!;
        return {
          id: item.id,
          name: candidate.name,
          score: item.score,
          reason: item.reason,
          meta: this.extractMeta(candidate),
        };
      });

    return { items, summary: parsed.summary, mock: result.mock };
  }

  private async generateInsight(prompt: string): Promise<AiInsightResponse> {
    const result = await this.openAi.complete(
      [
        { role: 'system', content: AI_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      { json: true },
    );

    const parsed = this.parseJson<{
      title: string;
      summary: string;
      insights: string[];
      recommendations: string[];
      metrics?: Record<string, string | number>;
    }>(result.content);

    return { ...parsed, mock: result.mock };
  }

  private extractMeta(candidate: Candidate): Record<string, string | number | null> {
    const meta: Record<string, string | number | null> = {};
    for (const [key, value] of Object.entries(candidate)) {
      if (key === 'id' || key === 'name') continue;
      if (typeof value === 'string' || typeof value === 'number' || value === null) {
        meta[key] = value;
      }
    }
    return meta;
  }

  private parseJson<T>(content: string): T {
    try {
      return JSON.parse(content) as T;
    } catch {
      throw new BadRequestException('AI returned invalid JSON. Please try again.');
    }
  }
}
