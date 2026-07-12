import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validates that a control's value is exactly 14 digits (Egyptian-style National ID).
 * Accepts numeric or string input.
 */
export function nationalIdValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || value === '') {
      return null; // required validator handles empty case
    }
    const asString = String(value).trim();
    const isFourteenDigits = /^\d{14}$/.test(asString);
    return isFourteenDigits ? null : { nationalId: true };
  };
}

export function mobileNumberValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const isValid = /^\+?\d{8,15}$/.test(String(value).trim());
    return isValid ? null : { mobileNumber: true };
  };
}
