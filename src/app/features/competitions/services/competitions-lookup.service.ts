import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../models/api-response.model';
import { LookupRef } from '../models/lookup.model';

/** Lookup options for the participant filters panel — places and instructors are flat, system-wide resources. */
@Injectable({ providedIn: 'root' })
export class CompetitionsLookupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;

  getPlaces(): Observable<PagedData<LookupRef>> {
    return this.getSimple('place');
  }

  getInstructors(): Observable<PagedData<LookupRef>> {
    return this.getSimple('instructor');
  }

  private getSimple(type: string): Observable<PagedData<LookupRef>> {
    const params = new HttpParams()
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'ASC');

    return this.http
      .get<ApiEnvelope<PagedData<LookupRef>>>(`${this.baseUrl}/${type}`, { params })
      .pipe(map((res) => res.data));
  }
}
