import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
  forwardRef,
} from '@nestjs/common';
import { TenantContextService } from './tenant-context.service';
import { TenantMiddleware } from './tenant.middleware';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { RealtimeModule } from '../realtime/realtime.module';

@Global()
@Module({
  imports: [forwardRef(() => RealtimeModule)],
  controllers: [TenantsController],
  providers: [TenantContextService, TenantsService],
  exports: [TenantContextService, TenantsService],
})
export class TenantsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
