import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@fitora/types';
import { RolesGuard } from '../../common/guards/roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  const createContext = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    }) as ExecutionContext;

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(createContext(null))).toBe(true);
  });

  it('allows admin access to admin-only routes', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const user = { roles: [UserRole.ADMIN] };
    expect(guard.canActivate(createContext(user))).toBe(true);
  });

  it('denies player access to admin routes', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const user = { roles: [UserRole.PLAYER] };
    expect(() => guard.canActivate(createContext(user))).toThrow(ForbiddenException);
  });
});
