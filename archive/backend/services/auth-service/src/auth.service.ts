import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  health() {
    return {
      service: 'auth-service',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
