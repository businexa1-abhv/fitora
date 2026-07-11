import { Module } from '@nestjs/common';
import { AiContextService } from './ai-context.service';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { OpenAiProvider } from './providers/openai.provider';

/**
 * Independent AI module — uses Prisma directly for context, no imports from feature modules.
 */
@Module({
  controllers: [AiController],
  providers: [AiService, AiContextService, OpenAiProvider],
  exports: [AiService],
})
export class AiModule {}
