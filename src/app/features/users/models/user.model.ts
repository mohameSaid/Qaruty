import { LookupRef } from './lookup.model';

export enum Gender {
  Male = 1,
  Female = 2,
}

export interface UserName {
  arabic: string;
  english: string;
}

export interface UserAddress {
  governorate: number;
  city: number;
  village: number;
  details: string;
}

export interface UserContact {
  email: string;
  mobileNumber: string;
  otherMobileNumber: string;
}

/**
 * Matches the "Create User" body in the Postman collection.
 * NOTE: write-side governorate/city/village/gender are assumed to be raw
 * numeric ids (REST convention, matches the original Postman sample). This
 * was NOT re-verified against the live backend during this pass (doing so
 * would require creating a real record) — verify manually via the running
 * app; if a create/update fails, the backend may instead expect nested
 * `{ id }` objects like the detail response does.
 */
export interface CreateUserRequest {
  /** Set only when resubmitting after the user picked an existing match from the Similar Persons review. */
  id?: number;
  nationalId: number;
  name: UserName;
  address: UserAddress;
  contact: UserContact;
  birthDate: string; // ISO date, e.g. 1993-05-17
  gender: Gender;
}

export type UpdateUserRequest = CreateUserRequest;

/**
 * One candidate returned by `POST /user` when the backend detects possible
 * duplicates instead of creating a record. Confirmed live: nested fields
 * (name.english, address.details, contact.otherMobileNumber/email,
 * nationalId) can be null on a match, unlike the stricter `UserDetail` shape.
 */
export interface PersonMatch {
  id: number;
  nationalId: number | null;
  name: { arabic: string; english: string | null };
  gender: LookupRef;
  birthDate: string;
  address: {
    governorate: LookupRef;
    city: LookupRef;
    village: LookupRef;
    details: string | null;
  };
  contact: {
    mobileNumber: string | null;
    otherMobileNumber: string | null;
    email: string | null;
  } | null;
  /** 0-100 similarity score against the submitted registration data. */
  similarity: number;
}

/**
 * Result of `POST /user`. Confirmed live: when the backend finds possible
 * duplicates it responds with a paged array of `PersonMatch` (same envelope
 * shape as the `GET /user` list) instead of creating anything; otherwise it
 * responds with a single created `UserDetail`. `UserService.createUser`
 * distinguishes the two by checking whether `data` is itself paged.
 */
export type CreateUserResult =
  | { kind: 'created'; person: UserDetail }
  | { kind: 'similar'; matches: PersonMatch[] };

/**
 * Shape of each item in the paged `GET /user` list response.
 * Confirmed live: this DTO is flatter than the detail response and its
 * `address` field is a broken Java `toString()` (backend bug) — do not
 * model or display it. `nationalId` can be null on some records.
 */
export interface UserListItem {
  id: number;
  nationalId: number | null;
  name: UserName;
  email: string | null;
  birthDate: string | null;
  mobileNumber: string | null;
  otherMobileNumber: string | null;
}

/**
 * Shape of `GET /user/{nationalId}` (and assumed for the Create/Update
 * response body). Confirmed live: gender and address entries are nested
 * lookup objects, not raw ids.
 */
export interface UserDetail {
  id: number;
  nationalId: number;
  name: UserName;
  gender: LookupRef;
  birthDate: string;
  address: {
    governorate: LookupRef;
    city: LookupRef;
    village: LookupRef;
    details: string;
  };
  contact: UserContact;
}

/**
 * Optional filter criteria for `GET /user`, layered onto the existing paging/sort
 * params. Modeled after the one confirmed `filters.*` convention in this codebase
 * (`CompetitionService.getStudentHistory` sends `filters.student.id`) — NOT
 * independently confirmed against the live `GET /user` endpoint. If the backend
 * ignores unknown params, filtering will silently no-op; verify manually and
 * adjust the param names built in `UserService.getUsers` if needed.
 */
export interface UserFilters {
  nationalId?: string;
  arabicName?: string;
  englishName?: string;
  mobileNumber?: string;
  email?: string;
  gender?: Gender | null;
}

/** Flat UI-facing model used by the reactive form. */
export interface UserFormModel {
  id: number | null;
  nationalId: string;
  arabicName: string;
  englishName: string;
  birthDate: Date | null;
  gender: Gender | null;
  governorate: number | null;
  city: number | null;
  village: number | null;
  addressDetails: string;
  email: string;
  mobileNumber: string;
  otherMobileNumber: string;
}
