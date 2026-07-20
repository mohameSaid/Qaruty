import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../models/api-response.model';
import { Competition, UpdateCompetitionStatusRequest } from '../models/competition.model';

export interface GetCompetitionsOptions {
  pageNo: number;
  size: number;
  sortColumn: string;
  sortDirection: 'ASC' | 'DESC';
}

@Injectable({ providedIn: 'root' })
export class CompetitionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/competition`;

  getCompetitions(options: GetCompetitionsOptions): Observable<PagedData<Competition>> {
    const params = new HttpParams()
      .set('page.pageNo', options.pageNo)
      .set('page.size', options.size)
      .set('sort.column', options.sortColumn)
      .set('sort.direction', options.sortDirection);

    return this.http
      .get<ApiEnvelope<PagedData<Competition>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * `GET /competition/{id}` isn't a confirmed single-resource route in this codebase, so
   * this reuses the same paged list the cards page loads and finds the match client-side —
   * enough for the participants page header/level/exception filter options.
   */
  getCompetitionById(id: number): Observable<Competition | null> {
    return this.getCompetitions({ pageNo: 0, size: 200, sortColumn: 'id', sortDirection: 'ASC' }).pipe(
      map((page) => page.data.find((competition) => competition.id === id) ?? null)
    );
  }

  /** Toggles active/inactive status — `PATCH /competition/{id}`. */
  updateStatus(id: number, payload: UpdateCompetitionStatusRequest): Observable<Competition> {
    return this.http
      .patch<ApiEnvelope<Competition>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((res) => res.data));
  }
}
