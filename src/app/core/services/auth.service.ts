import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { map } from 'rxjs/operators';
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
      tap((data) => this.storeSession(data))
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

  private storeSession(data: LoginResponse): void {
    const session: AuthSession = {
      accessToken: data.accessToken,
      tokenType: data.tokenType,
      userId: data.userId,
      nationalId: data.nationalId,
      roles: data.roles,
      permissions: data.permissions,
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
