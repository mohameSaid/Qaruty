import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { sanitizeReturnUrl } from '../utils/return-url.util';

/**
 * Attaches the bearer token to every request and logs the user out on 401
 * (expired/invalid token) so a stale session doesn't keep guarded routes open.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const token = auth.token;
  const authorizedReq = token
    ? req.clone({ setHeaders: { Authorization: `${auth.tokenType ?? 'Bearer'} ${token}` } })
    : req;

  return next(authorizedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        auth.logout();

        // Avoid re-navigating (and re-recording a returnUrl) if we're already
        // on /login, which would otherwise create a redirect loop.
        if (!router.url.startsWith('/login')) {
          const returnUrl = sanitizeReturnUrl(router.url);
          console.debug('[AuthInterceptor] 401 received, logging out and redirecting to /login', {
            failedUrl: req.url,
            currentUrl: router.url,
            returnUrl,
          });
          router.navigate(['/login'], returnUrl ? { queryParams: { returnUrl } } : undefined);
        } else {
          console.debug('[AuthInterceptor] 401 received while already on /login, skipping redirect', {
            failedUrl: req.url,
          });
        }
      }

      return throwError(() => error);
    })
  );
};
