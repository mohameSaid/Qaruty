export interface RegisterName {
  arabic: string;
  english: string;
}

export interface RegisterAddress {
  governorate: number;
  city: number;
  village: number;
  details: string;
}

export interface RegisterContact {
  email: string;
  mobileNumber: string;
  otherMobileNumber: string;
}

/** Payload for POST guest/register. */
export interface RegisterRequest {
  nationalId: number;
  name: RegisterName;
  address: RegisterAddress;
  contact: RegisterContact;
  birthDate: string;
  gender: number;
  password: string;
}

/** Backend response codes that drive special-case UI on the register screen. */
export const RegisterResponseCode = {
  NationalIdAlreadyRegistered: 'QARYATI-ERROR-6',
  RegistrationRequestCreated: 'QARYATI-MESSAGE-2',
} as const;
