import { LocalizedName } from './lookup.model';

/** One level/track nested inside a competition — confirmed live via `GET /competition`. */
export interface CompetitionLevel {
  id: number;
  name: LocalizedName;
  partsCount: number;
}

/** One registration exception nested inside a competition (e.g. "out of country", "full Quran"). */
export interface CompetitionException {
  id: number;
  name: LocalizedName;
}

/**
 * One row of `GET /competition` — confirmed live (see the users feature's
 * `LookupService.getActiveCompetitions`). `createdDate` is assumed (the confirmed
 * shape didn't need it) since the list-page card displays it; verify the field name
 * against the live response and adjust if the backend differs.
 */
export interface Competition {
  id: number;
  name: LocalizedName;
  year: number;
  registrationStartDate: string | null;
  registrationEndDate: string | null;
  date: string | null;
  createdDate: string | null;
  active: boolean;
  levels: CompetitionLevel[];
  exceptions: CompetitionException[];
}

/** Body of `PATCH /competition/{id}` to toggle active/inactive status. */
export interface UpdateCompetitionStatusRequest {
  active: boolean;
}
