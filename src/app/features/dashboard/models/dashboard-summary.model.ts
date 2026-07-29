import { LocalizedName, LookupRef } from '../../competitions/models/lookup.model';

/** One row of `DashboardSummary.competitions` — see `docs/api-requests/dashboard-summary.md`. */
export interface DashboardCompetitionSummary {
  id: number;
  name: LocalizedName;
  year: number;
  createdDate: string | null;
  active: boolean;
  participantCount: number;
}

/** One row of `DashboardParticipantsSummary.instructorBreakdown`. `instructor: null` = no instructor assigned. */
export interface DashboardInstructorBreakdown {
  instructor: LookupRef | null;
  studentCount: number;
}

/** One row of `DashboardParticipantsSummary.exceptionBreakdown`. */
export interface DashboardExceptionBreakdown {
  exception: { id: number; name: LocalizedName };
  participantCount: number;
}

/**
 * Everything that only makes sense **relative to a set of participants** — evaluation
 * progress, instructor load, exception counts. `competitionId: null` means "aggregated
 * across every competition"; otherwise every count/breakdown here is scoped to that one
 * competition's participants only (an instructor's student count, an exception's
 * participant count, etc. are only meaningful per-competition, not summed blindly across
 * competitions — see the discussion in `docs/api-requests/dashboard-summary.md`).
 */
export interface DashboardParticipantsSummary {
  competitionId: number | null;
  totalParticipants: number;
  /** Participants with a non-null `score` (i.e. the "Evaluate" flow has been completed for them). */
  evaluatedParticipants: number;
  /** Participants still awaiting evaluation — `totalParticipants - evaluatedParticipants`. */
  pendingParticipants: number;
  instructorBreakdown: DashboardInstructorBreakdown[];
  exceptionBreakdown: DashboardExceptionBreakdown[];
}

/**
 * Shape of `GET /dashboard/summary` — NOT YET IMPLEMENTED by the backend. This is the
 * requested contract; see `docs/api-requests/dashboard-summary.md` for the full spec.
 * `DashboardService.getSummary()` returns fixture data matching this exact shape until
 * the real endpoint exists.
 *
 * `totalCompetitions` / `activeCompetitions` / `inactiveCompetitions` / `totalUsers` /
 * `competitions` are **global** — they never change based on the competition filter.
 * `participants` is the one part of the response that's scoped by the optional
 * `competitionId` query param.
 */
export interface DashboardSummary {
  totalCompetitions: number;
  activeCompetitions: number;
  inactiveCompetitions: number;
  totalUsers: number;
  competitions: DashboardCompetitionSummary[];
  participants: DashboardParticipantsSummary;
}
