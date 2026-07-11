import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, UserRole } from '@fitora/types';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  const createContext = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  it('allows access when no permissions are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(createContext(null))).toBe(true);
  });

  it('allows access when user has required permission', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.COURTS_WRITE]);
    const user = { roles: [UserRole.COURT_OWNER] };

    expect(guard.canActivate(createContext(user))).toBe(true);
  });

  it('denies access when user lacks permission', () => {
    reflector.getAllAndOverride.mockReturnValue([Permission.USERS_MANAGE_ROLES]);
    const user = { roles: [UserRole.PLAYER] };

    expect(() => guard.canActivate(createContext(user))).toThrow(ForbiddenException);
  });
});
