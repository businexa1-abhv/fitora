import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';

@ApiExcludeController()
@Controller()
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  prometheus() {
    return this.metricsService.toPrometheus();
  }

  @Get('metrics/json')
  json() {
    return this.metricsService.getSnapshot();
  }
}
