import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../models/api-response.model';
import { ParticipantFilters, ParticipantListItem } from '../models/participant.model';

export interface GetParticipantsOptions {
  competitionId: number;
  pageNo: number;
  size: number;
  sortColumn: string;
  sortDirection: 'ASC' | 'DESC';
  filters?: ParticipantFilters;
}

@Injectable({ providedIn: 'root' })
export class ParticipantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/participant`;

  getParticipants(options: GetParticipantsOptions): Observable<PagedData<ParticipantListItem>> {
    let params = new HttpParams()
      .set('filters.competition.id', options.competitionId)
      .set('page.pageNo', options.pageNo)
      .set('page.size', options.size)
      .set('sort.column', options.sortColumn)
      .set('sort.direction', options.sortDirection);

    params = this.applyFilterParams(params, options.filters);

    return this.http
      .get<ApiEnvelope<PagedData<ParticipantListItem>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  /** Appends `filters.*` / `search.*` query params, matching the confirmed curl example for this endpoint. */
  private applyFilterParams(params: HttpParams, filters: ParticipantFilters | undefined): HttpParams {
    if (!filters) {
      return params;
    }
    if (filters.genderId) {
      params = params.set('filters.user.gender.id', filters.genderId);
    }
    if (filters.createdDate) {
      params = params.set('filters.createdDate', filters.createdDate);
    }
    if (filters.placeId) {
      params = params.set('filters.place.id', filters.placeId);
    }
    if (filters.levelId) {
      params = params.set('filters.level.id', filters.levelId);
    }
    if (filters.instructorId) {
      params = params.set('filters.instructor.id', filters.instructorId);
    }
    if (filters.partsCount) {
      params = params.set('filters.partsCount', filters.partsCount);
    }
    if (filters.nationalId) {
      params = params.set('filters.user.nationalId', filters.nationalId);
    }
    if (filters.mobileNumber) {
      params = params.set('filters.user.contact.mobileNumber', filters.mobileNumber);
    }
    if (filters.privateInstructorNotNull) {
      params = params.set('filters.privateInstructor', 'not_null');
    }
    if (filters.exceptionId) {
      params = params.set('filters.exceptions.exception.id', filters.exceptionId);
    }
    if (filters.search) {
      params = params.set('search.columnValues', filters.search);
      params = params.set('search.columnNames', 'user.name.arName,user.name.enName');
    }
    return params;
  }
}
