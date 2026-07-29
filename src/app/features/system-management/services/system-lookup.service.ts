import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../../users/models/api-response.model';
import { LookupItem } from '../../users/models/lookup.model';
import { LookupItemInput, LookupTypeKey } from '../models/lookup.model';

/** Types served under `/lookup/{type}` — the rest (`instructor`, `place`) are flat root resources. */
const NESTED_LOOKUP_TYPES: LookupTypeKey[] = ['governorate', 'city', 'village', 'studyLevel'];
const TYPES_WITH_CHILDREN: LookupTypeKey[] = ['city', 'village', 'studyLevel'];

@Injectable({ providedIn: 'root' })
export class SystemLookupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly lookupBase = `${environment.baseUrl}/lookup`;

  private resourceUrl(typeKey: LookupTypeKey): string {
    return NESTED_LOOKUP_TYPES.includes(typeKey) ? `${this.lookupBase}/${typeKey}` : `${this.baseUrl}/${typeKey}`;
  }

  getItems(typeKey: LookupTypeKey, parentId?: number): Observable<LookupItem[]> {
    let params = new HttpParams()
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', typeKey === 'city' || typeKey === 'village' ? 'DESC' : 'ASC');

    if (TYPES_WITH_CHILDREN.includes(typeKey)) {
      params = params.set('withChildren', 'true');
    }
    if (parentId != null) {
      params = params.set('parentId', parentId);
    }

    return this.http
      .get<ApiEnvelope<PagedData<LookupItem>>>(this.resourceUrl(typeKey), { params })
      .pipe(map((res) => res.data.data ?? []));
  }

  create(typeKey: LookupTypeKey, input: LookupItemInput, parentId?: number): Observable<LookupItem> {
    const body = parentId != null ? { ...input, parentId } : input;
    return this.http.post<ApiEnvelope<LookupItem>>(this.resourceUrl(typeKey), body).pipe(map((res) => res.data));
  }

  update(typeKey: LookupTypeKey, id: number, input: LookupItemInput): Observable<LookupItem> {
    return this.http
      .put<ApiEnvelope<LookupItem>>(`${this.resourceUrl(typeKey)}/${id}`, input)
      .pipe(map((res) => res.data));
  }

  delete(typeKey: LookupTypeKey, id: number): Observable<void> {
    return this.http.delete<void>(`${this.resourceUrl(typeKey)}/${id}`);
  }
}
