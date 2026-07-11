import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AiService } from './ai.service';
import { AiContextService } from './ai-context.service';
import { OpenAiProvider } from './providers/openai.provider';

describe('AiService', () => {
  let service: AiService;
  const context = {
    getUserProfile: jest.fn(),
    getCourtCandidates: jest.fn(),
    getMembershipCandidates: jest.fn(),
    getTrainingBatchCandidates: jest.fn(),
    getProductCandidates: jest.fn(),
    getServiceCandidates: jest.fn(),
    getAttendanceContext: jest.fn(),
    getCoachPerformanceContext: jest.fn(),
    getRevenueContext: jest.fn(),
    buildUserContextBlock: jest.fn().mockReturnValue('{}'),
  };
  const openAi = {
    complete: jest.fn(),
    isMockMode: jest.fn().mockReturnValue(true),
    getModel: jest.fn().mockReturnValue('mock'),
  };

  const user = {
    id: 'user-1',
    email: 'test@fitora.com',
    roles: [UserRole.PLAYER],
    permissions: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    context.getUserProfile.mockResolvedValue({
      user: { id: 'user-1', firstName: 'Test', city: 'Bangalore' },
      recentSports: ['Badminton'],
      recentCities: ['Bangalore'],
      activeMemberships: [],
      activeTraining: [],
      recentProductCategories: [],
    });

    openAi.complete.mockResolvedValue({
      content: JSON.stringify({
        summary: 'Great picks for you',
        items: [{ id: 'court-1', score: 90, reason: 'Near you' }],
      }),
      mock: true,
      model: 'mock',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: AiContextService, useValue: context },
        { provide: OpenAiProvider, useValue: openAi },
      ],
    }).compile();

    service = module.get(AiService);
  });

  it('recommends courts with mapped results', async () => {
    context.getCourtCandidates.mockResolvedValue([
      { id: 'court-1', name: 'Arena', city: 'Bangalore' },
    ]);

    const result = await service.recommendCourts(user, { city: 'Bangalore', limit: 3 });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Arena');
    expect(result.mock).toBe(true);
  });

  it('generates workout plan', async () => {
    openAi.complete.mockResolvedValue({
      content: JSON.stringify({
        title: 'Plan',
        plan: [{ day: 'Day 1', exercises: [{ name: 'Squats', sets: '3x10' }] }],
        tips: ['Rest well'],
      }),
      mock: true,
      model: 'mock',
    });

    const result = await service.generateWorkoutPlan(user, { goal: 'stamina', daysPerWeek: 3 });
    expect(result.title).toBe('Plan');
    expect(result.plan).toHaveLength(1);
  });

  it('returns health status', () => {
    expect(service.health().mode).toBe('mock');
  });
});
