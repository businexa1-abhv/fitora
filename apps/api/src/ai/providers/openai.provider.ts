import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type CompletionOptions = {
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
};

export type CompletionResult = {
  content: string;
  mock: boolean;
  model: string;
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
};

@Injectable()
export class OpenAiProvider {
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor(private config: ConfigService) {}

  isMockMode(): boolean {
    return this.config.get('AI_MODE', 'mock') === 'mock';
  }

  getModel(): string {
    return this.config.get('OPENAI_MODEL', 'gpt-4o-mini');
  }

  async complete(messages: ChatMessage[], options: CompletionOptions = {}): Promise<CompletionResult> {
    const model = this.getModel();
    const maxTokens = options.maxTokens ?? this.config.get('OPENAI_MAX_TOKENS', 2048);

    if (this.isMockMode()) {
      const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
      return {
        content: this.mockResponse(lastUser, options.json),
        mock: true,
        model: 'mock',
      };
    }

    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not set — falling back to mock');
      return {
        content: this.mockResponse(
          [...messages].reverse().find((m) => m.role === 'user')?.content ?? '',
          options.json,
        ),
        mock: true,
        model: 'mock-fallback',
      };
    }

    const body: Record<string, unknown> = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature: options.temperature ?? 0.4,
    };
    if (options.json) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      this.logger.error(`OpenAI API error ${res.status}: ${errText}`);
      throw new Error(`OpenAI request failed: ${res.status}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const content = data.choices?.[0]?.message?.content ?? '';
    return {
      content,
      mock: false,
      model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private mockResponse(prompt: string, json?: boolean): string {
    if (!json) {
      return '[AI MOCK] FitOra AI is in mock mode. Set AI_MODE=live and OPENAI_API_KEY to enable live responses.';
    }

    if (prompt.includes('workout') || prompt.includes('WORKOUT')) {
      return JSON.stringify({
        title: 'Weekly Sports Conditioning (Mock)',
        plan: [
          {
            day: 'Day 1 — Strength',
            exercises: [
              { name: 'Bodyweight squats', sets: '3x15' },
              { name: 'Push-ups', sets: '3x12' },
              { name: 'Plank', sets: '3x45s', notes: 'Keep core tight' },
            ],
          },
          {
            day: 'Day 2 — Cardio',
            exercises: [
              { name: 'Jogging', sets: '20 min' },
              { name: 'Jump rope', sets: '5x2 min' },
            ],
          },
        ],
        tips: ['Warm up 5 minutes before each session', 'Stay hydrated', 'Rest 1 day between strength days'],
      });
    }

    if (prompt.includes('diet') || prompt.includes('DIET')) {
      return JSON.stringify({
        title: 'Sports Nutrition Tips (Mock)',
        tips: [
          'Eat a balanced meal 2–3 hours before training',
          'Include protein within 30 minutes after exercise',
          'Prioritize whole grains and vegetables',
        ],
        mealIdeas: ['Oats with banana and peanuts', 'Dal-rice with vegetables', 'Grilled paneer wrap'],
        hydration: 'Aim for 2–3 litres of water daily; add electrolytes on intense training days.',
      });
    }

    if (prompt.includes('attendance') || prompt.includes('ATTENDANCE')) {
      return JSON.stringify({
        title: 'Attendance Insights (Mock)',
        summary: 'Overall attendance is steady with minor mid-week dips.',
        insights: [
          'Average attendance rate is around 78%',
          'Tuesdays show the lowest turnout',
          '3 students have missed 4+ sessions recently',
        ],
        recommendations: [
          'Send reminder notifications on Monday evenings',
          'Follow up with parents of frequently absent students',
        ],
        metrics: { attendanceRate: '78%', atRiskStudents: 3 },
      });
    }

    if (prompt.includes('coach') || prompt.includes('COACH')) {
      return JSON.stringify({
        title: 'Coach Performance Insights (Mock)',
        summary: 'Strong enrollment retention with room to improve session consistency.',
        insights: [
          'Batch capacity utilization at 85%',
          'Student progress reports submitted on time',
          'Leave requests handled within SLA',
        ],
        recommendations: [
          'Share best practices from top-performing batches',
          'Schedule quarterly parent feedback sessions',
        ],
        metrics: { capacityUtilization: '85%', avgRating: 4.6 },
      });
    }

    if (prompt.includes('revenue') || prompt.includes('REVENUE')) {
      return JSON.stringify({
        title: 'Revenue Insights (Mock)',
        summary: 'Revenue is growing with bookings as the primary driver.',
        insights: [
          'Court bookings contribute 52% of revenue',
          'Membership renewals up 12% vs prior period',
          'Shop orders spike on weekends',
        ],
        recommendations: [
          'Promote off-peak slot discounts',
          'Bundle membership with training enrollment',
        ],
        metrics: { totalRevenue: '₹2,45,000', growthPct: 12 },
      });
    }

    return JSON.stringify({
      summary: 'Mock recommendations based on your FitOra profile and preferences.',
      items: [
        { id: 'mock-1', score: 92, reason: 'Matches your sport preference and city' },
        { id: 'mock-2', score: 85, reason: 'Popular with similar users' },
        { id: 'mock-3', score: 78, reason: 'Good value for frequent players' },
      ],
    });
  }
}
