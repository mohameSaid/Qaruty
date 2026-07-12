export interface LocalizedName {
  arabic: string;
  english: string;
}

export interface LookupItem {
  id: number;
  name: LocalizedName;
  /** Present when withChildren=true is passed, e.g. cities under a governorate. */
  children?: LookupItem[];
}

export type Governorate = LookupItem;
export type City = LookupItem;
export type Village = LookupItem;

/** A minimal lookup reference as embedded in a user detail record (e.g. gender, address.governorate). */
export interface LookupRef {
  id: number;
  name: LocalizedName;
}
