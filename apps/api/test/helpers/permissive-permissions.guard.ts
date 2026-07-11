import { CanActivate, Injectable } from '@nestjs/common';

/** Bypasses permission checks in API integration tests (covered by PermissionsGuard unit tests). */
@Injectable()
export class PermissivePermissionsGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}
