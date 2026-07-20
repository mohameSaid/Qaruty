export interface LocalizedName {
  arabic: string;
  english: string;
}

/** A minimal lookup reference as embedded in a competition/participant record (e.g. place, instructor). */
export interface LookupRef {
  id: number;
  name: LocalizedName;
}
