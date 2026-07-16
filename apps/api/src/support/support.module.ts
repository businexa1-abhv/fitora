import { Module } from '@nestjs/common';
import { AdminSupportController } from './admin-support.controller';
import { SupportService } from './support.service';

@Module({
  controllers: [AdminSupportController],
  providers: [SupportService],
  exports: [SupportService],
})
export class SupportModule {}
