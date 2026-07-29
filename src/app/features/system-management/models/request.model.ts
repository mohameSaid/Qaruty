import { LookupRef } from '../../users/models/lookup.model';

/** Known `type.id` values for `GET /request`. New request types get a new entry here plus a route in app.routes.ts. */
export enum RequestTypeId {
  RegistrationWithSimilarities = 1,
  ResetPassword = 2,
}

/** Known `status.id` values for `GET /request`, confirmed against the `PATCH /request/:id` action payload. */
export enum RequestStatusId {
  New = 1,
  Approved = 2,
  Rejected = 3,
}

export const REQUEST_TYPE_OPTIONS: LookupRef[] = [
  { id: RequestTypeId.RegistrationWithSimilarities, name: { arabic: 'طلب تسجيل مع وجود تشابهات', english: 'Registration Request With Similarities' } },
  { id: RequestTypeId.ResetPassword, name: { arabic: 'طلب إعادة تعيين كلمة المرور', english: 'Reset Password Request' } },
];

export const REQUEST_STATUS_OPTIONS: LookupRef[] = [
  { id: RequestStatusId.New, name: { arabic: 'جديد', english: 'New' } },
  { id: RequestStatusId.Approved, name: { arabic: 'مقبول', english: 'Approved' } },
  { id: RequestStatusId.Rejected, name: { arabic: 'مرفوض', english: 'Rejected' } },
];

/** CSS modifier class for the shared `.status-chip` style, keyed by `status.id`. */
export function requestStatusChipClass(statusId: number): string {
  switch (statusId) {
    case RequestStatusId.Approved:
      return 'status-chip--active';
    case RequestStatusId.Rejected:
      return 'status-chip--deleted';
    default:
      return 'status-chip--pending';
  }
}

/** One row of `GET /request`. */
export interface RequestListItem {
  id: number;
  nationalId: number | string;
  type: LookupRef;
  status: LookupRef;
  createdDate: string;
  note: string | null;
  deleted: boolean;
}

/** Response of `GET /request/:id` — same fields as the list row plus the type-specific `body` payload. */
export interface RequestDetail extends RequestListItem {
  /** Raw JSON string; shape depends on `type.id` and is parsed by the consuming detail page. */
  body: string | null;
}

export interface RequestFilters {
  nationalId?: string | null;
  statusId?: number | null;
  typeId?: number | null;
}
