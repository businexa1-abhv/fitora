import { Module } from '@nestjs/common';
import { AvailabilityModule } from '../availability/availability.module';
import { AdapterRegistry } from './adapters/adapter-registry.service';
import {
  HttpIntegrationAdapter,
  PlayArenaAdapter,
  PlayoAdapter,
} from './adapters/http-integration.adapter';
import { ChannelAvailabilityService } from './channel-availability.service';
import { IntegrationCryptoService } from './integration-crypto.service';
import { IntegrationSyncService } from './integration-sync.service';
import { IntegrationWebhookService } from './integration-webhook.service';
import {
  IntegrationChannelController,
  IntegrationsManagerController,
  IntegrationWebhookController,
} from './integrations.controller';
import { IntegrationsService } from './integrations.service';
import { IntegrationApiKeyGuard, IntegrationOrJwtGuard } from './guards/integration-api-key.guard';

@Module({
  imports: [AvailabilityModule],
  controllers: [
    IntegrationChannelController,
    IntegrationWebhookController,
    IntegrationsManagerController,
  ],
  providers: [
    IntegrationCryptoService,
    IntegrationApiKeyGuard,
    IntegrationOrJwtGuard,
    HttpIntegrationAdapter,
    PlayoAdapter,
    PlayArenaAdapter,
    AdapterRegistry,
    IntegrationsService,
    ChannelAvailabilityService,
    IntegrationWebhookService,
    IntegrationSyncService,
  ],
  exports: [
    IntegrationApiKeyGuard,
    IntegrationOrJwtGuard,
    ChannelAvailabilityService,
    IntegrationSyncService,
  ],
})
export class IntegrationsModule {}
