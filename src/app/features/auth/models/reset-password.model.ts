export interface ResetPasswordContact {
  mobileNumber: string;
  otherMobileNumber: string;
  email: string;
}

/** JSON-stringified into `ResetPasswordRequest.details`. */
export interface ResetPasswordDetails {
  aprroveImage: string;
  contactDto: ResetPasswordContact;
  password: string;
}

/** Payload for POST guest/reset-password. */
export interface ResetPasswordRequest {
  nationalId: number;
  type: number;
  details: string;
}
