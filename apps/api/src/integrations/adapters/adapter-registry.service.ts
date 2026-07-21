import { Injectable } from '@nestjs/common';
import { IntegrationProvider } from '@prisma/client';
import { HttpIntegrationAdapter, PlayArenaAdapter, PlayoAdapter } from './http-integration.adapter';
import type { IntegrationAdapter } from './integration-adapter';

@Injectable()
export class AdapterRegistry {
  private readonly adapters: Map<IntegrationProvider, IntegrationAdapter>;

  constructor(generic: HttpIntegrationAdapter, playo: PlayoAdapter, playArena: PlayArenaAdapter) {
    this.adapters = new Map([
      [IntegrationProvider.GENERIC, generic],
      [IntegrationProvider.PLAYO, playo],
      [IntegrationProvider.PLAYARENA, playArena],
    ]);
  }

  get(provider: IntegrationProvider): IntegrationAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new Error(`No adapter registered for ${provider}`);
    return adapter;
  }
}
