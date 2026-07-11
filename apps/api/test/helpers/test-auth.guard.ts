import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_OPTIONAL_AUTH_KEY, IS_PUBLIC_KEY } from '../../src/common/decorators';
import { TEST_USERS } from './auth.fixtures';

@Injectable()
export class TestAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(IS_OPTIONAL_AUTH_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;
    const roleHeader = request.headers['x-test-role'] as string | undefined;

    if (isOptionalAuth && !authHeader && !roleHeader) return true;
    if (authHeader === 'Bearer invalid') {
      throw new UnauthorizedException();
    }
    if (!authHeader && !roleHeader) {
      throw new UnauthorizedException();
    }

    const roleKey = roleHeader ?? 'player';
    request.user = TEST_USERS[roleKey] ?? TEST_USERS.player;
    return true;
  }
}
