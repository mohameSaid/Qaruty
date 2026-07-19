import { LocalizedName, LookupRef } from './lookup.model';
import { CompetitionException, CompetitionLevel } from './competition.model';

export enum Gender {
  Male = 1,
  Female = 2,
}

export interface ParticipantUser {
  id: number;
  name: LocalizedName;
  nationalId: number | string | null;
  birthDate: string | null; // ISO date (YYYY-MM-DD)
  mobileNumber: string | null;
  email: string | null;
  gender?: LookupRef | null;
}

/** One entry of `ParticipantListItem.exceptions` — matches the `filters.exceptions.exception.id` dot-path. */
export interface ParticipantExceptionEntry {
  exception: CompetitionException;
}

/**
 * One row of `GET /participant?filters.competition.id=...`. Field names are modeled after
 * the confirmed `filters.*` query dot-paths this feature sends (see `ParticipantService`) —
 * not independently confirmed against a live payload, so adjust names if the actual
 * response shape differs.
 */
export interface ParticipantListItem {
  id: number;
  user: ParticipantUser;
  level: CompetitionLevel;
  instructor: LookupRef | null;
  place: LookupRef | null;
  partsCount: number;
  createdDate: string | null;
  /** Free-form/lookup value; only ever queried via the `not_null` existence filter, never by concrete value. */
  privateInstructor: LookupRef | string | null;
  exceptions: ParticipantExceptionEntry[];
  /** Evaluation score set via the "Evaluate" flow — null until the participant has been evaluated. */
  score: number | null;
}

/** Optional filter criteria for `GET /participant`, layered onto the paging/sort params. */
export interface ParticipantFilters {
  genderId?: number | null;
  createdDate?: string | null;
  placeId?: number | null;
  levelId?: number | null;
  instructorId?: number | null;
  partsCount?: number | null;
  nationalId?: string | null;
  mobileNumber?: string | null;
  /** When true, sends `filters.privateInstructor=not_null` (only rows with a private instructor assigned). */
  privateInstructorNotNull?: boolean;
  exceptionId?: number | null;
  /** Free-text search across `user.name.arName` and `user.name.enName`. */
  search?: string | null;
}
