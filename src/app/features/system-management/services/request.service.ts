import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../../users/models/api-response.model';
import { RequestDetail, RequestFilters, RequestListItem } from '../models/request.model';

export interface GetRequestsOptions {
  pageNo: number;
  size: number;
  sortColumn: string;
  sortDirection: 'ASC' | 'DESC';
  filters?: RequestFilters;
}

@Injectable({ providedIn: 'root' })
export class RequestService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/request`;

  getRequests(options: GetRequestsOptions): Observable<PagedData<RequestListItem>> {
    let params = new HttpParams()
      .set('page.pageNo', options.pageNo)
      .set('page.size', options.size)
      .set('sort.column', options.sortColumn)
      .set('sort.direction', options.sortDirection);

    params = this.applyFilterParams(params, options.filters);

    return this.http
      .get<ApiEnvelope<PagedData<RequestListItem>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  getById(id: number): Observable<RequestDetail> {
    return this.http.get<ApiEnvelope<RequestDetail>>(`${this.baseUrl}/${id}`).pipe(map((res) => res.data));
  }

  updateStatus(id: number, typeId: number, statusId: number, similarId?: number): Observable<RequestDetail> {
    const body: { type: number; status: number; similarId?: number } = { type: typeId, status: statusId };
    if (similarId != null) {
      body.similarId = similarId;
    }
    return this.http.post<ApiEnvelope<RequestDetail>>(`${this.baseUrl}/${id}`, body).pipe(map((res) => res.data));
  }

  private applyFilterParams(params: HttpParams, filters: RequestFilters | undefined): HttpParams {
    if (!filters) {
      return params;
    }
    if (filters.nationalId) {
      params = params.set('filters.nationalId', filters.nationalId);
    }
    if (filters.statusId != null) {
      params = params.set('filters.status.id', filters.statusId);
    }
    if (filters.typeId != null) {
      params = params.set('filters.type.id', filters.typeId);
    }
    return params;
  }
}
