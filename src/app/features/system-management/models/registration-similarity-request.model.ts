import { LocalizedName, LookupRef } from '../../users/models/lookup.model';

export interface SimilarityQuranLevel {
  id: number;
  name: LocalizedName;
  partsCount: number;
}

export interface SimilarityQuranInfo {
  instructor: LookupRef | null;
  place: LookupRef | null;
  partsCount: number;
  level: SimilarityQuranLevel;
}

export interface SimilarityAddress {
  governorate: LookupRef;
  city: LookupRef;
  /** Can be null when the candidate's address has no village set. */
  village: LookupRef | null;
  details: string | null;
}

export interface SimilarityContact {
  mobileNumber: string | null;
  otherMobileNumber: string | null;
  email: string | null;
}

/** One candidate in `body.similarities` — an existing person the new registrant may match. */
export interface SimilarityCandidate {
  id: number;
  name: { arabic: string; english: string | null };
  nationalId: string | null;
  gender: LookupRef;
  birthDate: string | null;
  address: SimilarityAddress;
  contact: SimilarityContact;
  /** Match percentage (0-100). */
  similarity: number;
  quran: SimilarityQuranInfo | null;
  study: unknown | null;
  father: unknown | null;
  mother: unknown | null;
}

export interface RegistrationRequestAddress {
  governorate: number;
  city: number;
  village: number;
  details: string;
}

export interface RegistrationRequestContact {
  mobileNumber: string;
  otherMobileNumber: string;
  email: string;
}

/** Parsed shape of `RequestDetail.body` for `type.id === RequestTypeId.RegistrationWithSimilarities`. */
export interface RegistrationRequestBody {
  nationalId: number;
  gender: number;
  birthDate: string;
  name: LocalizedName;
  address: RegistrationRequestAddress;
  contact: RegistrationRequestContact;
  /** Bcrypt hash of the chosen password — never render the value, only whether one is set. */
  password: string;
  similarities: SimilarityCandidate[];
}
