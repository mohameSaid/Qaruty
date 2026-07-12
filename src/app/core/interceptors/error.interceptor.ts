import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SnackbarService } from '../services/snackbar.service';

/**
 * Global error handling interceptor.
 * Normalizes network / validation / server errors into a single
 * user-facing message and surfaces it via a Material snackbar,
 * while still propagating the error so callers can react (e.g. stop a spinner).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackbar = inject(SnackbarService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = resolveErrorMessage(error);
      snackbar.error(message);
      return throwError(() => error);
    })
  );
};

function resolveErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'خطأ في الاتصال بالشبكة: تعذر الوصول إلى الخادم. يرجى التحقق من اتصالك بالإنترنت.';
  }

  if (error.status === 400 || error.status === 422) {
    return extractServerMessage(error) ?? 'خطأ في التحقق من البيانات: يرجى مراجعة البيانات المدخلة.';
  }

  if (error.status === 404) {
    return extractServerMessage(error) ?? 'لم يتم العثور على العنصر المطلوب.';
  }

  if (error.status === 401 || error.status === 403) {
    return 'غير مصرح لك بتنفيذ هذا الإجراء.';
  }

  if (error.status >= 500) {
    return 'خطأ في الخادم: حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقًا.';
  }

  return extractServerMessage(error) ?? 'حدث خطأ غير متوقع.';
}

/** Backend errors follow the same envelope as successes: `message: { arabic, english }`. */
function extractServerMessage(error: HttpErrorResponse): string | null {
  const body = error.error;
  if (!body) {
    return null;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (body.message && typeof body.message === 'object') {
    return body.message.arabic ?? body.message.english ?? null;
  }
  if (typeof body.message === 'string') {
    return body.message;
  }
  if (typeof body.error === 'string') {
    return body.error;
  }
  return null;
}
