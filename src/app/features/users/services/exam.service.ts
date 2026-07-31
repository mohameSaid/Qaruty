import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiEnvelope, PagedData } from '../models/api-response.model';
import { ExamDetail, ExamSummary } from '../models/exam.model';

@Injectable({ providedIn: 'root' })
export class ExamService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.baseUrl}/exam`;

  /** Exams available to the given tester for a competition/level — `GET /exam?filters...`. */
  getAvailableExams(
    testerId: number,
    competitionId: number,
    levelId: number
  ): Observable<PagedData<ExamSummary>> {
    const params = new HttpParams()
      .set('filters.testers.id', testerId)
      .set('filters.competitionLevels.competition.id', competitionId)
      .set('filters.competitionLevels.level.id', levelId)
      .set('page.pageNo', 0)
      .set('page.size', 10)
      .set('sort.column', 'id')
      .set('sort.direction', 'DESC');

    return this.http
      .get<ApiEnvelope<PagedData<ExamSummary>>>(this.baseUrl, { params })
      .pipe(map((res) => res.data));
  }

  /** The selected exam with its questions — `GET /exam/{id}`. */
  getExamById(examId: number): Observable<ExamDetail> {
    return this.http
      .get<ApiEnvelope<ExamDetail>>(`${this.baseUrl}/${examId}`)
      .pipe(map((res) => res.data));
  }
}
