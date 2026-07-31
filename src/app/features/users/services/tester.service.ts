import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../models/api-response.model';
import { TesterEvaluateRequest } from '../models/exam.model';

@Injectable({ providedIn: 'root' })
export class TesterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/tester`;

  /** Submits a participant's exam-question grades — `POST /tester/{testerId}/evaluate`. */
  submitEvaluation(testerId: number, payload: TesterEvaluateRequest): Observable<void> {
    return this.http
      .post<ApiEnvelope<void>>(`${this.baseUrl}/${testerId}/evaluate`, payload)
      .pipe(map(() => undefined));
  }
}
