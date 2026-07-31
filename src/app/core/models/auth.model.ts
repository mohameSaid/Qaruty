/** Payload for POST auth/login. */
export interface LoginRequest {
  nationalId: string;
  password: string;
}

/** Shape of `ApiEnvelope.data` for auth/login. */
export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  userId: number;
  nationalId: number;
  roles: string[];
  permissions: string[];
}

/** Persisted auth session, derived from the last successful login response. */
export interface AuthSession {
  accessToken: string;
  tokenType: string;
  userId: number;
  nationalId: number;
  roles: string[];
  permissions: string[];
  /** `user.id` from GET /user/{nationalId}?type=NATIONAL_ID, fetched right after login. */
  currentUserId: number | null;
}

/** Payload for POST auth/change-password. */
export interface ChangePasswordRequest {
  nationalId: number;
  oldPassword: string;
  newPassword: string;
}
