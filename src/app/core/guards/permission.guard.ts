import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Permission } from '../models/permission.model';

/**
 * Route guard factory: blocks navigation unless the logged-in user holds at
 * least one of the given permissions (from the login response), redirecting
 * to /dashboard otherwise. Assumes authGuard already ran (session exists).
 */
export function permissionGuard(...permissions: Permission[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (permissions.some((permission) => auth.hasPermission(permission))) {
      return true;
    }

    return router.createUrlTree(['/dashboard']);
  };
}
