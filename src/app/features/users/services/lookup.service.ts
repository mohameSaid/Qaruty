import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../models/api-response.model';
import { City, Governorate, LookupItem, Village } from '../models/lookup.model';
import { CompetitionOption } from '../models/competition.model';

@Injectable({ providedIn: 'root' })
export class LookupService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.baseUrl;
  private readonly lookupBase = `${environment.baseUrl}/lookup`;

  getGovernorates(): Observable<PagedData<Governorate>> {
    const params = new HttpParams()
      .set('withChildren', 'false')
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'ASC');

    return this.http
      .get<ApiEnvelope<PagedData<Governorate>>>(`${this.lookupBase}/governorate`, { params })
      .pipe(map((res) => res.data));
  }

  getCities(governorateId: number): Observable<PagedData<City>> {
    const params = new HttpParams()
      .set('parentId', governorateId)
      .set('withChildren', 'true')
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'DESC');

    return this.http
      .get<ApiEnvelope<PagedData<City>>>(`${this.lookupBase}/city`, { params })
      .pipe(map((res) => res.data));
  }

  getVillages(cityId: number): Observable<PagedData<Village>> {
    const params = new HttpParams()
      .set('parentId', cityId)
      .set('withChildren', 'true')
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'DESC');

    return this.http
      .get<ApiEnvelope<PagedData<Village>>>(`${this.lookupBase}/village`, { params })
      .pipe(map((res) => res.data));
  }

  /**
   * `GET /competition?filters.active=true&...` — confirmed live. Not under `/lookup`
   * (it's the actual competition resource), and each item carries its own `levels`
   * array, so there's no separate "competition levels" lookup call — the registration
   * form's Level dropdown is populated from the selected competition's `levels`.
   */
  getActiveCompetitions(): Observable<PagedData<CompetitionOption>> {
    const params = new HttpParams()
      .set('filters.active', 'true')
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'ASC');

    return this.http
      .get<ApiEnvelope<PagedData<CompetitionOption>>>(`${this.baseUrl}/competition`, { params })
      .pipe(map((res) => res.data));
  }

  getInstructors(): Observable<PagedData<LookupItem>> {
    return this.getSimple<LookupItem>('instructor');
  }

  getPlaces(): Observable<PagedData<LookupItem>> {
    return this.getSimple<LookupItem>('place');
  }

  /** Registration exceptions dropdown (e.g. "out of country", "three countries", "full Quran"). */
  getExceptions(): Observable<PagedData<LookupItem>> {
    return this.getSimpleLookup<LookupItem>('exception');
  }

  /**
   * `GET /lookup/studyLevel?withChildren=true&...` — confirmed live. Returns a real
   * 2-level tree (educational stage -> grade, e.g. "ابتدائي" -> "الرابع"), unlike the
   * flat lookups above, so it's rendered with `TreeSelectComponent` instead of a plain
   * `mat-select`.
   */
  getStudyLevels(): Observable<PagedData<LookupItem>> {
    const params = new HttpParams()
      .set('withChildren', 'true')
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'ASC');

    return this.http
      .get<ApiEnvelope<PagedData<LookupItem>>>(`${this.lookupBase}/studyLevel`, { params })
      .pipe(map((res) => res.data));
  }

  /** `instructor` / `place` lookups are NOT confirmed live — same `/lookup/{type}` guess as before. */
  private getSimpleLookup<T>(type: string): Observable<PagedData<T>> {
    const params = new HttpParams()
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'ASC');

    return this.http
      .get<ApiEnvelope<PagedData<T>>>(`${this.lookupBase}/${type}`, { params })
      .pipe(map((res) => res.data));
  }
  private getSimple<T>(type: string): Observable<PagedData<T>> {
    const params = new HttpParams()
      .set('page.pageNo', 0)
      .set('page.size', 100)
      .set('sort.column', 'id')
      .set('sort.direction', 'ASC');

    return this.http
      .get<ApiEnvelope<PagedData<T>>>(`${this.baseUrl}/${type}`, { params })
      .pipe(map((res) => res.data));
  }
}
