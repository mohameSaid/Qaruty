import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { sanitizeReturnUrl } from '../utils/return-url.util';

/** Redirects to /login (preserving the attempted URL) when there's no active session. */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  const returnUrl = sanitizeReturnUrl(state.url);
  console.debug('[AuthGuard] blocking access, redirecting to /login', { attemptedUrl: state.url, returnUrl });

  return router.createUrlTree(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
};
