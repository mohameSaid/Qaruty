export interface ResetPasswordContact {
  mobileNumber: string;
  otherMobileNumber: string;
  email: string;
}

/** Parsed shape of `RequestDetail.body` for `type.id === RequestTypeId.ResetPassword`. */
export interface ResetPasswordRequestBody {
  /** Base64-encoded identity proof image submitted by the applicant (field name matches the backend typo). */
  aprroveImage: string;
  contactDto: ResetPasswordContact;
  /** New plaintext password requested — shown once for reviewer verification, never persisted client-side. */
  password: string;
}
