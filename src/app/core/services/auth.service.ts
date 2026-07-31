import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ApiEnvelope } from '../models/api-response.model';
import { AuthSession, ChangePasswordRequest, LoginRequest, LoginResponse } from '../models/auth.model';
import { Permission } from '../models/permission.model';

const STORAGE_KEY = 'qaryati-auth-session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/auth`;

  private readonly _session = signal<AuthSession | null>(this.readStoredSession());

  readonly session = this._session.asReadonly();
  readonly isAuthenticated = computed(() => this._session() !== null);
  readonly nationalId = computed(() => this._session()?.nationalId ?? null);
  /** `user.id` fetched right after login; use this (not `userId`) to identify the signed-in user elsewhere in the app. */
  readonly currentUserId = computed(() => this._session()?.currentUserId ?? null);

  get token(): string | null {
    return this._session()?.accessToken ?? null;
  }

  get tokenType(): string | null {
    return this._session()?.tokenType ?? null;
  }

  hasRole(role: string): boolean {
    return this._session()?.roles.includes(role) ?? false;
  }

  hasPermission(permission: Permission): boolean {
    return this._session()?.permissions.includes(permission) ?? false;
  }

  login(nationalId: string, password: string): Observable<LoginResponse> {
    const payload: LoginRequest = { nationalId, password };

    return this.http.post<ApiEnvelope<LoginResponse>>(`${this.baseUrl}/login`, payload).pipe(
      map((res) => res.data),
      tap((data) => this.storeSession(data)),
      switchMap((data) => this.fetchCurrentUserId(data.nationalId).pipe(map(() => data)))
    );
  }

  logout(): void {
    this._session.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  changePassword(oldPassword: string, newPassword: string): Observable<ApiEnvelope<unknown>> {
    const payload: ChangePasswordRequest = {
      nationalId: this.nationalId()!,
      oldPassword,
      newPassword,
    };

    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/change-password`, payload);
  }

  /** GET /user/{nationalId}?type=NATIONAL_ID (same lookup as the profile page) to resolve `user.id` and persist it as `currentUserId`. */
  private fetchCurrentUserId(nationalId: number): Observable<void> {
    const params = new HttpParams().set('type', 'NATIONAL_ID');

    return this.http
      .get<ApiEnvelope<{ id: number }>>(`${environment.baseUrl}/user/${nationalId}`, { params })
      .pipe(
        tap((res) => this.persistSession({ currentUserId: res.data.id })),
        map(() => void 0),
        catchError(() => of(void 0))
      );
  }

  private persistSession(patch: Partial<AuthSession>): void {
    const current = this._session();
    if (!current) {
      return;
    }

    const session: AuthSession = { ...current, ...patch };
    this._session.set(session);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private storeSession(data: LoginResponse): void {
    const session: AuthSession = {
      accessToken: data.accessToken,
      tokenType: data.tokenType,
      userId: data.userId,
      nationalId: data.nationalId,
      roles: data.roles,
      permissions: data.permissions,
      currentUserId: null,
    };

    this._session.set(session);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private readStoredSession(): AuthSession | null {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
}
