import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../models/api-response.model';
import {
  CompetitionHistoryItem,
  RegisterCompetitionRequest,
  UpdateCompetitionRequest,
} from '../models/competition.model';

export interface GetCompetitionHistoryOptions {
  pageNo: number;
  size: number;
  sortColumn: string;
  sortDirection: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/participant`;

  getStudentHistory(
    userId: number,
    options: GetCompetitionHistoryOptions
  ): Observable<PagedData<CompetitionHistoryItem>> {
    const params = new HttpParams()
      .set('filters.user.id', userId)
      .set('page.pageNo', options.pageNo)
      .set('page.size', options.size)
      .set('sort.column', options.sortColumn)
      .set('sort.direction', options.sortDirection);

    return this.http
      .get<ApiEnvelope<PagedData<CompetitionHistoryItem>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  registerCompetition(payload: RegisterCompetitionRequest): Observable<CompetitionHistoryItem> {
    return this.http
      .post<ApiEnvelope<CompetitionHistoryItem>>(this.baseUrl, payload)
      .pipe(map((res) => res.data));
  }

  /** Edits an existing competition registration — `PUT /participant/{id}`. */
  updateParticipant(
    id: number,
    payload: UpdateCompetitionRequest
  ): Observable<CompetitionHistoryItem> {
    return this.http
      .put<ApiEnvelope<CompetitionHistoryItem>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }

  /** Soft-deletes (deactivates) a competition registration — `DELETE /participant/{id}?type=SOFT`. */
  deactivateParticipant(id: number): Observable<void> {
    const params = new HttpParams().set('type', 'SOFT');
    return this.http
      .delete<ApiEnvelope<void>>(`${this.baseUrl}/${id}`, { params })
      .pipe(map(() => undefined));
  }

  /** Hard-deletes a competition registration — `DELETE /participant/{id}?type=HARD`. */
  deleteParticipant(id: number): Observable<void> {
    const params = new HttpParams().set('type', 'HARD');
    return this.http
      .delete<ApiEnvelope<void>>(`${this.baseUrl}/${id}`, { params })
      .pipe(map(() => undefined));
  }
}
