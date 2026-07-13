import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SnackbarService } from '../services/snackbar.service';

/**
 * Global error handling interceptor.
 * Displays the most specific backend message available and
 * propagates the error so callers can still handle it.
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
  switch (error.status) {
    case 0:
      return (
        extractServerMessage(error) ??
        'خطأ في الاتصال بالشبكة: تعذر الوصول إلى الخادم. يرجى التحقق من اتصالك بالإنترنت.'
      );

    case 400:
    case 422:
      return (
        extractServerMessage(error) ??
        'خطأ في التحقق من البيانات: يرجى مراجعة البيانات المدخلة.'
      );

    case 401:
    case 403:
      return (
        extractServerMessage(error) ??
        'غير مصرح لك بتنفيذ هذا الإجراء.'
      );

    case 404:
      return (
        extractServerMessage(error) ??
        'لم يتم العثور على العنصر المطلوب.'
      );

    default:
      if (error.status >= 500) {
        return (
          extractServerMessage(error) ??
          'خطأ في الخادم: حدث خطأ ما. يرجى المحاولة مرة أخرى لاحقًا.'
        );
      }

      return (
        extractServerMessage(error) ??
        'حدث خطأ غير متوقع.'
      );
  }
}

/**
 * Extracts the most meaningful message from the backend response.
 *
 * Priority:
 * 1. data.message.arabic / english (business errors)
 * 2. message.arabic / english (general API message)
 * 3. message (string)
 * 4. error (string)
 */
function extractServerMessage(error: HttpErrorResponse): string | null {
  const body = error.error;

  if (!body) {
    return null;
  }

  if (typeof body === 'string') {
    return body;
  }

  // Business error
  if (body.data?.message) {
    if (typeof body.data.message === 'object') {
      return (
        body.data.message.arabic ??
        body.data.message.english ??
        null
      );
    }

    if (typeof body.data.message === 'string') {
      return body.data.message;
    }
  }

  // General API message
  if (body.message) {
    if (typeof body.message === 'object') {
      return (
        body.message.arabic ??
        body.message.english ??
        null
      );
    }

    if (typeof body.message === 'string') {
      return body.message;
    }
  }

  if (typeof body.error === 'string') {
    return body.error;
  }

  return null;
}