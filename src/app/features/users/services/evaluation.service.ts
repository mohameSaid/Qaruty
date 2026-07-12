import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope } from '../models/api-response.model';
import { SubmitEvaluationRequest } from '../models/evaluation.model';

/**
 * Not confirmed against a live backend — there was no evaluation endpoint in the
 * Postman collection this project was built from. Modeled as a sub-resource of the
 * competition-registration record it evaluates, following the same
 * `{baseUrl}/competition-participant/{id}/...` nesting `CompetitionService` already uses.
 * Adjust the path/shape here once the real endpoint is confirmed.
 */
@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/competition-participant`;

  submitEvaluation(payload: SubmitEvaluationRequest): Observable<void> {
    return this.http
      .post<ApiEnvelope<void>>(`${this.baseUrl}/${payload.competitionUserId}/evaluation`, payload)
      .pipe(map(() => undefined));
  }
}
