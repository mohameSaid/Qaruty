import { LocalizedName, LookupRef } from "./lookup.model";

/**
 * One level/track *nested inside* a competition, as returned by `GET /competition`
 * — confirmed live. Distinct from `CompetitionLevel` below, which is the level shape
 * embedded in a `CompetitionHistoryItem` (`GET /competition-participant` rows) — the two
 * endpoints don't share a DTO (this one has `partsCount`, that one has `numberOfParts`).
 */
export interface CompetitionLevelOption {
  id: number;
  name: LocalizedName;
  partsCount: number;
}

/** One registration exception nested inside a competition (e.g. "out of country", "full Quran"). */
export interface CompetitionExceptionOption {
  id: number;
  name: LocalizedName;
}

/**
 * One row of `GET /competition?filters.active=true&...` — confirmed live. Used to
 * populate the "Competition" dropdown in the registration form; each competition's
 * `levels` and `exceptions` then populate their dependent dropdowns (no separate
 * levels/exceptions endpoints — both come nested in this response).
 */
export interface CompetitionOption {
  id: number;
  name: LocalizedName;
  year: number;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  date: string | null;
  active: boolean;
  levels: CompetitionLevelOption[];
  exceptions: CompetitionExceptionOption[];
}

export interface CompetitionRef {
  id: number;
  name: LocalizedName;
  competitionYear: number;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  competitionDate: string | null;
  exceptions: LookupRef[];
  active: boolean;
}

export interface CompetitionLevel {
  id: number;
  name: LocalizedName;
  numberOfParts: number;
}

export interface StudyClassRef {
  id: number;
  level: LookupRef;
  year: LookupRef;
}

/**
 * One row of `GET /competition-participant` (a student's competition history).
 * Confirmed live: `instructor`, `placeDto`, `studyClass` and `score` can all be null.
 */
export interface CompetitionHistoryItem {
  id: number;
  competition: CompetitionRef;
  instructor: LookupRef | null;
  placeDto: LookupRef | null;
  level: CompetitionLevel;
  partsCount: number;
  studyClass: StudyClassRef | null;
  score: number | null;
  deleted: boolean;
}

/** Body of `POST /competition-participant` to enroll a student in a new competition. */
export interface RegisterCompetitionRequest {
  competitionId: number;
  userId: number;
  instructorId: number | null;
  placeId: number | null;
  levelId: number;
  partsCount: number;
  studyYearId: number | null;
  notes: string | null;
  /** Id from the `exceptions` lookup (`GET /lookup/exceptions`). */
  exceptionIdList: null | number[];
}

/** Body of `PUT /participant/{id}` to edit an existing competition registration. */
export interface UpdateCompetitionRequest extends RegisterCompetitionRequest {
  id: number;
}
