/**
 * Every Qaryati API response is wrapped in this envelope, confirmed against
 * the live backend (https://qaryati.onrender.com) — the raw HTTP body is
 * never the payload itself.
 */
export interface ApiEnvelope<T> {
  code: string;
  status: string;
  timeStamp: string;
  message: { arabic: string; english: string };
  data: T;
}

/** Shape of `ApiEnvelope.data` for paged list endpoints. */
export interface PagedData<T> {
  data: T[];
  totalRecords: number;
}
