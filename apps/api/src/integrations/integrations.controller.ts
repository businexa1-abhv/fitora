import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Public, Roles } from '../common/decorators';
import { CurrentUser, type AuthUserPayload } from '../common/decorators/current-user.decorator';
import {
  ChannelAvailabilityQueryDto,
  ChannelCancelBookingDto,
  ChannelHoldDto,
  ChannelReleaseDto,
  CreateIntegrationDto,
  CreateSlotMappingDto,
  UpdateIntegrationDto,
} from './dto/integration.dto';
import {
  IntegrationApiKeyGuard,
  type IntegrationRequest,
} from './guards/integration-api-key.guard';
import { ChannelAvailabilityService } from './channel-availability.service';
import { IntegrationsService } from './integrations.service';
import { IntegrationWebhookService } from './integration-webhook.service';
import { IntegrationSyncService } from './integration-sync.service';

type RawRequest = IntegrationRequest & { rawBody?: Buffer };

@ApiTags('channel-availability')
@Controller()
export class IntegrationChannelController {
  constructor(private readonly channel: ChannelAvailabilityService) {}

  @Public()
  @UseGuards(IntegrationApiKeyGuard)
  @Get('availability')
  availability(@Req() request: IntegrationRequest, @Query() query: ChannelAvailabilityQueryDto) {
    return this.channel.getAvailability(request.integration!, query.venueId, query.date);
  }

  @Public()
  @UseGuards(IntegrationApiKeyGuard)
  @Post('slots/hold')
  hold(@Req() request: IntegrationRequest, @Body() dto: ChannelHoldDto) {
    return this.channel.hold(request.integration!, dto);
  }

  @Public()
  @UseGuards(IntegrationApiKeyGuard)
  @Post('slots/release')
  release(@Req() request: IntegrationRequest, @Body() dto: ChannelReleaseDto) {
    return this.channel.release(request.integration!, dto);
  }

  @Public()
  @UseGuards(IntegrationApiKeyGuard)
  @Post('bookings/cancel')
  cancel(@Req() request: IntegrationRequest, @Body() dto: ChannelCancelBookingDto) {
    return this.channel.cancelBooking(request.integration!, dto);
  }
}

@ApiTags('integration-webhooks')
@Controller('integrations')
export class IntegrationWebhookController {
  constructor(private readonly webhooks: IntegrationWebhookService) {}

  @Public()
  @Post(':provider/webhook')
  webhook(
    @Param('provider') provider: string,
    @Headers('x-fitora-integration-id') integrationId: string | undefined,
    @Headers('x-fitora-signature') signature: string | undefined,
    @Req() request: RawRequest,
  ) {
    return this.webhooks.handle(
      provider,
      integrationId,
      signature,
      request.rawBody?.toString('utf8') ?? '',
    );
  }
}

@ApiTags('integrations-manager')
@ApiBearerAuth('access-token')
@Roles(UserRole.COURT_OWNER, UserRole.ADMIN)
@Controller('integrations')
export class IntegrationsManagerController {
  constructor(
    private readonly integrations: IntegrationsService,
    private readonly sync: IntegrationSyncService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthUserPayload, @Query('tenantId') tenantId?: string) {
    return this.integrations.list(user, tenantId);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthUserPayload, @Query('tenantId') tenantId?: string) {
    return this.integrations.stats(user, tenantId);
  }

  @Post()
  create(@Body() dto: CreateIntegrationDto, @CurrentUser() user: AuthUserPayload) {
    return this.integrations.create(dto, user);
  }

  @Get(':id')
  detail(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.integrations.detail(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIntegrationDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.integrations.update(id, dto, user);
  }

  @Post(':id/mappings')
  mapping(
    @Param('id') id: string,
    @Body() dto: CreateSlotMappingDto,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.integrations.upsertMapping(id, dto, user);
  }

  @Get(':id/health')
  health(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.integrations.health(id, user);
  }

  @Get(':id/failed-syncs')
  failed(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.integrations.failedSyncs(id, user);
  }

  @Post('sync-jobs/:jobId/retry')
  async retry(@Param('jobId') jobId: string, @CurrentUser() user: AuthUserPayload) {
    const job = await this.integrations.retry(jobId, user);
    await this.sync.dispatchDue();
    return job;
  }

  @Get(':id/conflicts')
  conflicts(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    return this.integrations.conflicts(id, user);
  }

  @Post(':id/conflicts/:conflictId/resolve')
  resolve(
    @Param('id') id: string,
    @Param('conflictId') conflictId: string,
    @Body('note') note: string,
    @CurrentUser() user: AuthUserPayload,
  ) {
    return this.integrations.resolveConflict(id, conflictId, note, user);
  }

  @Post(':id/resync')
  async resync(@Param('id') id: string, @CurrentUser() user: AuthUserPayload) {
    const result = await this.integrations.manualResync(id, user);
    await this.sync.dispatchDue();
    return result;
  }
}
