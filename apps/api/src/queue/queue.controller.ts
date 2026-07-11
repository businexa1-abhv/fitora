import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole } from '@fitora/types';
import { RequirePermissions, Roles } from '../common/decorators';
import { CRON_PATTERNS, SCHEDULED_JOBS, ScheduledJobName } from './queue.constants';
import { QueueManagerService } from './queue-manager.service';

@ApiTags('queue')
@ApiBearerAuth('access-token')
@Controller('queue/admin')
export class QueueController {
  constructor(private queueManager: QueueManagerService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'BullMQ monitoring dashboard data' })
  dashboard() {
    return this.queueManager.getMonitoringDashboard();
  }

  @Get('dead-letter')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'List dead letter queue jobs' })
  deadLetter(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.queueManager.getDeadLetterJobs(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Post('dead-letter/:id/retry')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Retry a dead letter queue job' })
  retryDeadLetter(@Param('id') id: string) {
    return this.queueManager.retryDeadLetterJob(id);
  }

  @Post('jobs/:jobName/trigger')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Manually trigger a scheduled cron job' })
  triggerJob(@Param('jobName') jobName: ScheduledJobName) {
    return this.queueManager.triggerScheduledJob(jobName);
  }

  @Get('jobs')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'List available scheduled job names' })
  listJobs() {
    return { jobs: Object.values(SCHEDULED_JOBS), patterns: CRON_PATTERNS };
  }
}
