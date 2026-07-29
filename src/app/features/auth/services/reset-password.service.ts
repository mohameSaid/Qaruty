import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../../../core/models/api-response.model';
import { ResetPasswordRequest } from '../models/reset-password.model';

@Injectable({ providedIn: 'root' })
export class ResetPasswordService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/guest`;

  resetPassword(payload: ResetPasswordRequest): Observable<ApiEnvelope<unknown>> {
    return this.http.post<ApiEnvelope<unknown>>(`${this.baseUrl}/reset-password`, payload);
  }
}
