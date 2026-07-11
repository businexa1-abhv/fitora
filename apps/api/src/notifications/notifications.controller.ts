import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, UserRole } from '@fitora/types';
import { RequirePermissions, Roles } from '../common/decorators';
import { CurrentUser, AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  BroadcastNotificationDto,
  RegisterDeviceTokenDto,
  ScheduleNotificationDto,
  UpdateNotificationPreferencesDto,
} from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';
import { ScheduledJobName } from '../queue/queue.constants';
import { QueueManagerService } from '../queue/queue-manager.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@Controller('notifications')
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private queueManager: QueueManagerService,
  ) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Notification history — paginated list' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.listForUser(
      user.id,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      cursor,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('preferences')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Get notification channel preferences' })
  getPreferences(@CurrentUser() user: AuthUserPayload) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('preferences')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Update notification channel preferences' })
  updatePreferences(
    @CurrentUser() user: AuthUserPayload,
    @Body() dto: UpdateNotificationPreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }

  @Get('unread-count')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Unread notification count' })
  unreadCount(@CurrentUser() user: AuthUserPayload) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Post('read-all')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: AuthUserPayload) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Post('device-tokens')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Register Firebase / Expo push device token' })
  registerToken(@CurrentUser() user: AuthUserPayload, @Body() dto: RegisterDeviceTokenDto) {
    return this.notificationsService.registerDeviceToken(user.id, dto.token, dto.platform);
  }

  @Delete('device-tokens/:token')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Remove device token' })
  removeToken(@CurrentUser() user: AuthUserPayload, @Param('token') token: string) {
    return this.notificationsService.removeDeviceToken(user.id, decodeURIComponent(token));
  }

  @Post('admin/broadcast')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Admin broadcast to users' })
  broadcast(@Body() dto: BroadcastNotificationDto) {
    return this.notificationsService.adminBroadcast(dto);
  }

  @Post('admin/schedule')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Schedule a future admin broadcast' })
  schedule(@CurrentUser() user: AuthUserPayload, @Body() dto: ScheduleNotificationDto) {
    return this.notificationsService.scheduleBroadcast(dto, user.id);
  }

  @Get('admin/scheduled')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'List scheduled broadcasts' })
  listScheduled(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.notificationsService.listScheduledNotifications(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Delete('admin/scheduled/:id')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Cancel a pending scheduled broadcast' })
  cancelScheduled(@Param('id') id: string) {
    return this.notificationsService.cancelScheduledNotification(id);
  }

  @Get('admin/queue-status')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'BullMQ queue stats' })
  queueStatus() {
    return this.notificationsService.getQueueStats();
  }

  @Post('admin/jobs/:jobName')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Manually trigger a scheduled notification job' })
  triggerJob(@Param('jobName') jobName: ScheduledJobName) {
    return this.queueManager.triggerScheduledJob(jobName);
  }

  @Post('admin/reminders/bookings')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.NOTIFICATIONS_SEND)
  @ApiOperation({ summary: 'Send booking reminders (~24h before slot)' })
  sendBookingReminders() {
    return this.notificationsService.sendBookingReminders();
  }

  @Patch(':id/read')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Mark notification as read' })
  markRead(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Get(':id/deliveries')
  @RequirePermissions(Permission.NOTIFICATIONS_READ)
  @ApiOperation({ summary: 'Delivery status per channel for a notification' })
  deliveries(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.notificationsService.getDeliveryHistory(id, user.id);
  }
}
