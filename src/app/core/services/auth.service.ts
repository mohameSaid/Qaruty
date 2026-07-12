import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

const STORAGE_KEY = 'qaryati-auth-session';

/**
 * Fake, client-side-only authentication. Credentials live in `environment.auth`
 * (see the doc comment there for why this is not real security) — this service
 * just compares against them and remembers the result in `sessionStorage` so a
 * page refresh doesn't bounce the user back to /login. There is no token, no
 * backend call, and no expiry beyond "tab/browser closed".
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _isAuthenticated = signal(this.resolveInitialState());
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  private readonly _username = signal<string | null>(this.resolveInitialState() ? this.readStoredUsername() : null);
  readonly username = this._username.asReadonly();

  login(username: string, password: string): boolean {
    const matches = username.trim() === environment.auth.username && password === environment.auth.password;

    if (matches) {
      this._isAuthenticated.set(true);
      this._username.set(username.trim());
      sessionStorage.setItem(STORAGE_KEY, username.trim());
    }

    return matches;
  }

  logout(): void {
    this._isAuthenticated.set(false);
    this._username.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  private resolveInitialState(): boolean {
    return !!sessionStorage.getItem(STORAGE_KEY);
  }

  private readStoredUsername(): string | null {
    return sessionStorage.getItem(STORAGE_KEY);
  }
}
