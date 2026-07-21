import { Module, forwardRef } from '@nestjs/common';
import { CourtsController } from './courts.controller';
import { CourtsService } from './courts.service';
import { VenuesController } from './venues.controller';
import { VenuesService } from './venues.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [CourtsController, VenuesController],
  providers: [CourtsService, VenuesService],
  exports: [CourtsService, VenuesService],
})
export class CourtsModule {}
