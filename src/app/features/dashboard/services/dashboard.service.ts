import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

import { LocalizedName, LookupRef } from '../../competitions/models/lookup.model';
import {
  DashboardExceptionBreakdown,
  DashboardInstructorBreakdown,
  DashboardParticipantsSummary,
  DashboardSummary,
} from '../models/dashboard-summary.model';

/**
 * `GET /dashboard/summary` does not exist on the backend yet — the requested contract is
 * written up in `docs/api-requests/dashboard-summary.md`. Until the backend implements it,
 * `getSummary()` returns fixture data shaped exactly like that contract, so the dashboard
 * page can be built/reviewed today without hitting (or waiting on) the real API.
 *
 * Once the endpoint exists, swap the body of `getSummary()` for the commented-out
 * `HttpClient` call below — nothing else in the dashboard feature needs to change.
 */
@Injectable({ providedIn: 'root' })
export class DashboardService {
  // private readonly http = inject(HttpClient);
  // private readonly baseUrl = `${environment.baseUrl}/dashboard/summary`;

  /** `competitionId: null` (or omitted) = aggregate across every competition. */
  getSummary(competitionId: number | null = null): Observable<DashboardSummary> {
    // const params = competitionId ? new HttpParams().set('competitionId', competitionId) : undefined;
    // return this.http.get<ApiEnvelope<DashboardSummary>>(this.baseUrl, { params }).pipe(map((res) => res.data));
    return of(buildFixtureSummary(competitionId));
  }
}

/** One fixture participant row — stands in for what the backend would group/count over. */
interface FixtureParticipant {
  competitionId: number;
  instructor: LookupRef | null;
  exceptions: { id: number; name: LocalizedName }[];
  evaluated: boolean;
}

const instructorA: LookupRef = { id: 1, name: { arabic: 'الشيخ أحمد فتحي', english: 'Sheikh Ahmed Fathy' } };
const instructorB: LookupRef = { id: 2, name: { arabic: 'الشيخ محمود سيد', english: 'Sheikh Mahmoud Sayed' } };
const instructorC: LookupRef = { id: 3, name: { arabic: 'الشيخة سعاد علي', english: 'Sheikha Souad Ali' } };

const exceptionOutOfCountry = { id: 1, name: { arabic: 'مقيم خارج البلاد', english: 'Out of country' } };
const exceptionRepeat = { id: 2, name: { arabic: 'إعادة تسجيل', english: 'Re-registration' } };

const FIXTURE_COMPETITIONS = [
  {
    id: 1,
    name: { arabic: 'مسابقة كفر أبو الحسن 2026', english: 'Kafr Abu El-Hassan Competition 2026' },
    year: 2026,
    createdDate: '2025-12-01',
    active: true,
    participantCount: 42,
  },
  {
    id: 2,
    name: { arabic: 'مسابقة الناشئين 2026', english: 'Youth Competition 2026' },
    year: 2026,
    createdDate: '2025-12-10',
    active: true,
    participantCount: 18,
  },
  {
    id: 5,
    name: { arabic: 'مسابقة رمضان 2026', english: 'Ramadan Competition 2026' },
    year: 2026,
    createdDate: '2026-01-05',
    active: true,
    participantCount: 27,
  },
  {
    id: 3,
    name: { arabic: 'مسابقة الحفاظ الكبرى 2025', english: 'Grand Memorization Competition 2025' },
    year: 2025,
    createdDate: '2024-12-01',
    active: false,
    participantCount: 9,
  },
  {
    id: 4,
    name: { arabic: 'مسابقة الأشبال 2025', english: 'Cubs Competition 2025' },
    year: 2025,
    createdDate: '2024-12-15',
    active: false,
    participantCount: 6,
  },
];

/**
 * Fixture participant rows, spread unevenly across competitions/instructors/exceptions so
 * filtering by competition visibly changes the numbers (an instructor teaching in one
 * competition shouldn't show up when another competition is selected, etc.). This is a
 * small illustrative subset, not a full roster — counts here don't need to add up to
 * `FIXTURE_COMPETITIONS[].participantCount`; a real backend would derive both from the
 * same `participant` table.
 */
const FIXTURE_PARTICIPANTS: FixtureParticipant[] = [
  // Competition 1 — كفر أبو الحسن
  { competitionId: 1, instructor: instructorA, exceptions: [exceptionOutOfCountry], evaluated: true },
  { competitionId: 1, instructor: instructorA, exceptions: [], evaluated: true },
  { competitionId: 1, instructor: instructorA, exceptions: [], evaluated: false },
  { competitionId: 1, instructor: instructorB, exceptions: [exceptionRepeat], evaluated: true },
  { competitionId: 1, instructor: instructorB, exceptions: [], evaluated: false },
  { competitionId: 1, instructor: null, exceptions: [], evaluated: false },
  // Competition 2 — الناشئين
  { competitionId: 2, instructor: instructorA, exceptions: [], evaluated: true },
  { competitionId: 2, instructor: instructorC, exceptions: [exceptionOutOfCountry], evaluated: false },
  { competitionId: 2, instructor: null, exceptions: [], evaluated: false },
  // Competition 5 — رمضان
  { competitionId: 5, instructor: instructorA, exceptions: [exceptionOutOfCountry], evaluated: true },
  { competitionId: 5, instructor: instructorC, exceptions: [exceptionRepeat], evaluated: true },
  { competitionId: 5, instructor: instructorC, exceptions: [], evaluated: false },
  // Competition 3 — الحفاظ الكبرى (inactive)
  { competitionId: 3, instructor: instructorB, exceptions: [], evaluated: true },
  { competitionId: 3, instructor: instructorB, exceptions: [exceptionRepeat], evaluated: true },
  // Competition 4 — الأشبال (inactive)
  { competitionId: 4, instructor: null, exceptions: [exceptionRepeat], evaluated: false },
];

function buildFixtureSummary(competitionId: number | null): DashboardSummary {
  return {
    totalCompetitions: FIXTURE_COMPETITIONS.length,
    activeCompetitions: FIXTURE_COMPETITIONS.filter((c) => c.active).length,
    inactiveCompetitions: FIXTURE_COMPETITIONS.filter((c) => !c.active).length,
    totalUsers: 236,
    competitions: FIXTURE_COMPETITIONS,
    participants: buildParticipantsSummary(competitionId),
  };
}

function buildParticipantsSummary(competitionId: number | null): DashboardParticipantsSummary {
  const rows = competitionId === null
    ? FIXTURE_PARTICIPANTS
    : FIXTURE_PARTICIPANTS.filter((row) => row.competitionId === competitionId);

  const evaluatedParticipants = rows.filter((row) => row.evaluated).length;

  return {
    competitionId,
    totalParticipants: rows.length,
    evaluatedParticipants,
    pendingParticipants: rows.length - evaluatedParticipants,
    instructorBreakdown: buildInstructorBreakdown(rows),
    exceptionBreakdown: buildExceptionBreakdown(rows),
  };
}

function buildInstructorBreakdown(rows: FixtureParticipant[]): DashboardInstructorBreakdown[] {
  const byId = new Map<number | null, DashboardInstructorBreakdown>();
  for (const row of rows) {
    const key = row.instructor?.id ?? null;
    const existing = byId.get(key);
    if (existing) {
      existing.studentCount++;
    } else {
      byId.set(key, { instructor: row.instructor, studentCount: 1 });
    }
  }
  return [...byId.values()].sort((a, b) => b.studentCount - a.studentCount);
}

function buildExceptionBreakdown(rows: FixtureParticipant[]): DashboardExceptionBreakdown[] {
  const byId = new Map<number, DashboardExceptionBreakdown>();
  for (const row of rows) {
    for (const exception of row.exceptions) {
      const existing = byId.get(exception.id);
      if (existing) {
        existing.participantCount++;
      } else {
        byId.set(exception.id, { exception, participantCount: 1 });
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.participantCount - a.participantCount);
}
