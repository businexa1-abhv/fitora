import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_OPTIONAL_AUTH_KEY, IS_PUBLIC_KEY } from '../../common/decorators';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const createContext = (headers: Record<string, string> = {}) => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  }) as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('allows public routes without token', () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === IS_PUBLIC_KEY);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('allows optional auth without authorization header', () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === IS_OPTIONAL_AUTH_KEY);
    expect(guard.canActivate(createContext())).toBe(true);
  });

  it('delegates to passport when auth required', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const parent = jest.spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate');
    parent.mockReturnValue(true);
    expect(guard.canActivate(createContext({ authorization: 'Bearer token' }))).toBe(true);
    parent.mockRestore();
  });

  it('handleRequest throws when user missing', () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    expect(() => guard.handleRequest(null, null, null, createContext())).toThrow(
      UnauthorizedException,
    );
  });

  it('handleRequest returns null for optional auth failures', () => {
    reflector.getAllAndOverride.mockImplementation((key) => key === IS_OPTIONAL_AUTH_KEY);
    expect(guard.handleRequest(new Error('bad'), null, null, createContext())).toBeNull();
  });

  it('handleRequest returns user when present', () => {
    const user = { id: 'u1' };
    expect(guard.handleRequest(null, user, null, createContext())).toBe(user);
  });
});
