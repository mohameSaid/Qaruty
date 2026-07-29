/** Every Qaryati API response is wrapped in this envelope. */
export interface ApiEnvelope<T> {
  code: string;
  status: string;
  timeStamp: string;
  message: { arabic: string; english: string };
  data: T;
}
