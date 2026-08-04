import { Injectable, inject } from '@angular/core';
import { Observable, from, map, switchMap } from 'rxjs';

import { ExcelColumnDef, ExcelReportService } from '../../../shared/services/excel-report.service';
import { ParticipantService } from './participant.service';
import { Gender, ParticipantFilters, ParticipantWithGrades } from '../models/participant.model';
import { CompetitionException, CompetitionLevel } from '../models/competition.model';
import { LocalizedName, LookupRef } from '../models/lookup.model';

/** Everything the export needs beyond the raw filter values — mostly id -> name lookups to describe the applied filters. */
export interface ParticipantExportContext {
  competitionId: number;
  competitionName?: string | null;
  filters: ParticipantFilters;
  /** Upper bound for the single-page fetch; defaults to a large fixed size when omitted. */
  pageSizeHint?: number;
  levels?: CompetitionLevel[];
  exceptions?: CompetitionException[];
  places?: LookupRef[];
  instructors?: LookupRef[];
  testers?: LookupRef[];
}

const DEFAULT_PAGE_SIZE = 20000;

/**
 * Builds the "Competition Results" Excel report for a competition's evaluated participants.
 * Fetches `GET /participant/with-grades` (only participants with a non-null score) and maps each
 * row into the generic {@link ExcelReportService} column format — grade columns are generated
 * dynamically from the highest `rank` found in the response, so new exam questions need no code change.
 */
@Injectable({ providedIn: 'root' })
export class ParticipantExcelExportService {
  private readonly participantService = inject(ParticipantService);
  private readonly excelReportService = inject(ExcelReportService);

  /** Fetches, builds and downloads the report; resolves with the number of exported rows. */
  export(context: ParticipantExportContext): Observable<number> {
    const size = context.pageSizeHint && context.pageSizeHint > 0 ? context.pageSizeHint : DEFAULT_PAGE_SIZE;

    return this.participantService
      .getParticipantsWithGrades({
        competitionId: context.competitionId,
        pageNo: 0,
        size,
        sortColumn: 'id',
        sortDirection: 'DESC',
        // The export always reports evaluated participants only, regardless of the table's current filter state.
        filters: { ...context.filters, scoreNotNull: true },
      })
      .pipe(
        switchMap((page) => {
          const participants = page.data ?? [];
          const columns = this.buildColumns(participants);

          return from(
            this.excelReportService.generate({
              filename: this.buildFilename(context.competitionName),
              sheetName: 'Competition Results',
              title: 'تقرير نتائج المشاركين في المسابقة',
              subtitleLines: this.buildSubtitleLines(participants.length, context),
              columns,
              rows: participants,
            })
          ).pipe(map(() => participants.length));
        })
      );
  }

  private buildColumns(participants: ParticipantWithGrades[]): ExcelColumnDef<ParticipantWithGrades>[] {
    const columns: ExcelColumnDef<ParticipantWithGrades>[] = [
      { header: 'رقم المشارك', type: 'integer', minWidth: 8, value: (p) => p.id },
      { header: 'الاسم بالعربية', type: 'text', minWidth: 20, value: (p) => p.user?.name?.arabic },
      {
        header: 'الرقم القومي',
        type: 'idText',
        minWidth: 15,
        value: (p) => (p.user?.nationalId != null ? String(p.user.nationalId) : null),
      },
      { header: 'تاريخ الميلاد', type: 'date', minWidth: 12, value: (p) => p.user?.birthDate },
      { header: 'رقم الهاتف', type: 'idText', minWidth: 13, value: (p) => p.user?.mobileNumber },
      { header: 'اسم المستوى (عربي)', type: 'text', minWidth: 16, value: (p) => p.level?.name?.arabic },
      { header: 'عدد الأجزاء', type: 'integer', minWidth: 10, value: (p) => p.partsCount },
      { header: 'الدرجة الكلية', type: 'decimal', minWidth: 10, colorScale: true, value: (p) => p.score },
      { header: 'المعلم', type: 'text', minWidth: 18, value: (p) => p.instructor?.name?.arabic },
      { header: 'المكان', type: 'text', minWidth: 18, value: (p) => p.place?.name?.arabic },
    ];

    // Each participant's `grades` array holds one entry per exam question, in whatever order the
    // API returns them — `rank` isn't used to line columns up, just the position in that array.
    const maxGradeCount = participants.reduce((max, p) => Math.max(max, p.grades?.length ?? 0), 0);

    for (let i = 0; i < maxGradeCount; i++) {
      columns.push({
        header: `درجة ${i + 1}`,
        type: 'decimal',
        minWidth: 9,
        colorScale: true,
        value: (p) => p.grades?.[i]?.grade ?? null,
      });
    }

    for (let i = 0; i < maxGradeCount; i++) {
      columns.push({
        header: `مقيّم الدرجة ${i + 1}`,
        type: 'text',
        minWidth: 16,
        value: (p) => p.grades?.[i]?.tester?.name?.arabic ?? null,
      });
    }

    return columns;
  }

  private buildSubtitleLines(count: number, context: ParticipantExportContext): string[] {
    const exportDate = new Date().toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
    const filtersText = this.describeFilters(context);
    return [
      `تاريخ التصدير: ${exportDate}`,
      `إجمالي المشاركين: ${count}`,
      `الفلاتر المطبقة: ${filtersText || 'لا توجد فلاتر مطبقة'}`,
    ];
  }

  private describeFilters(context: ParticipantExportContext): string {
    const f = context.filters;
    const parts: string[] = [];

    if (f.search) parts.push(`بحث: "${f.search}"`);
    if (f.nationalId) parts.push(`الرقم القومي: ${f.nationalId}`);
    if (f.mobileNumber) parts.push(`رقم الهاتف: ${f.mobileNumber}`);
    if (f.genderId) parts.push(`النوع: ${f.genderId === Gender.Male ? 'ذكر' : 'أنثى'}`);
    if (f.createdDate) parts.push(`تاريخ التسجيل: ${f.createdDate}`);
    if (f.placeId) parts.push(`المكان: ${this.findName(context.places, f.placeId)}`);
    if (f.levelId) parts.push(`المستوى: ${this.findName(context.levels, f.levelId)}`);
    if (f.instructorId) parts.push(`المعلم: ${this.findName(context.instructors, f.instructorId)}`);
    if (f.testerId) parts.push(`المُقيّم: ${this.findName(context.testers, f.testerId)}`);
    if (f.partsCount) parts.push(`عدد الأجزاء: ${f.partsCount}`);
    if (f.privateInstructorNotNull) parts.push('له معلم خاص');
    if (f.exceptionId) parts.push(`الاستثناء: ${this.findName(context.exceptions, f.exceptionId)}`);
    if (f.scoreMin != null) parts.push(`الدرجة من: ${f.scoreMin}`);
    if (f.scoreMax != null) parts.push(`الدرجة إلى: ${f.scoreMax}`);

    return parts.join('، ');
  }

  private findName(list: { id: number; name: LocalizedName }[] | undefined, id: number): string {
    return list?.find((item) => item.id === id)?.name?.arabic ?? `#${id}`;
  }

  private buildFilename(competitionName?: string | null): string {
    const datePart = new Date().toISOString().slice(0, 10);
    const safeName = (competitionName ?? 'المسابقة').replace(/[\\/:*?"<>|]/g, '').trim();
    return `تقرير-نتائج-${safeName}-${datePart}.xlsx`;
  }
}
