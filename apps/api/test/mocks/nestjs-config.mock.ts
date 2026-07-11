export class ConfigService {
  get(key: string, defaultValue?: string) {
    return defaultValue;
  }

  getOrThrow(key: string) {
    if (key === 'JWT_SECRET') return 'test-secret';
    if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
    return 'test-value';
  }
}

export class ConfigModule {
  static forRoot() {
    return { module: ConfigModule };
  }
}
