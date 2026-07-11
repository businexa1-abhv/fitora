import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OpenAiProvider } from './openai.provider';

describe('OpenAiProvider', () => {
  let provider: OpenAiProvider;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAiProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: unknown) => {
              const map: Record<string, unknown> = {
                AI_MODE: 'mock',
                OPENAI_MODEL: 'gpt-4o-mini',
                OPENAI_MAX_TOKENS: 1024,
              };
              return key in map ? map[key] : defaultValue;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get(OpenAiProvider);
  });

  it('returns mock JSON for recommendations', async () => {
    const result = await provider.complete(
      [{ role: 'user', content: 'recommend courts' }],
      { json: true },
    );
    expect(result.mock).toBe(true);
    const parsed = JSON.parse(result.content);
    expect(parsed.items).toBeDefined();
    expect(parsed.summary).toBeDefined();
  });

  it('returns mock workout plan JSON', async () => {
    const result = await provider.complete(
      [{ role: 'user', content: 'workout plan for badminton' }],
      { json: true },
    );
    const parsed = JSON.parse(result.content);
    expect(parsed.plan).toBeDefined();
    expect(parsed.title).toBeDefined();
  });
});
