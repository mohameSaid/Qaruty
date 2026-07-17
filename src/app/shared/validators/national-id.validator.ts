import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { Gender } from '../../features/users/models/user.model';
import { extractGenderFromNationalId } from '../utils/national-id.util';

/**
 * Validates that a control's value is exactly 14 digits (Egyptian-style National ID).
 * Accepts numeric or string input.
 */
export function nationalIdValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = String(control.value || '').trim();

    // Field is optional (e.g. father/mother) — only validate format once something is entered.
    if (!value) {
      return null;
    }

    const errors: any = {};

    // 1. Length check
    if (!/^\d{14}$/.test(value)) {
      errors.invalidLength = true;
      return errors;
    }

    // 2. Century check
    const century = Number(value[0]);
    if (![2, 3].includes(century)) {
      errors.invalidCentury = true;
    }

    // 3. Date check
    const year = Number(value.substring(1, 3));
    const month = Number(value.substring(3, 5));
    const day = Number(value.substring(5, 7));

    const fullYear = (century === 2 ? 1900 : 2000) + year;
    const date = new Date(fullYear, month - 1, day);

    const validDate =
      date.getFullYear() === fullYear &&
      date.getMonth() === month - 1 &&
      date.getDate() === day;

    if (!validDate) {
      errors.invalidDate = true;
    }

    // 4. Governorate check
    const governorate = Number(value.substring(7, 9));
    const validGovs = [
      1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 18, 19,
      21, 22, 23, 24, 25, 26, 27, 28, 29,
      31, 32, 33, 34, 35, 88
    ];

    if (!validGovs.includes(governorate)) {
      errors.invalidGovernorate = true;
    }

    // If any errors exist → return them
    return Object.keys(errors).length ? errors : null;
  };
}


/**
 * Ensures a parent's National ID (when fully entered) encodes the expected gender —
 * e.g. a mother's National ID must not decode to Male, and a father's must not decode to Female.
 */
export function parentGenderValidator(expectedGender: Gender): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    if (!value) {
      return null;
    }
    const gender = extractGenderFromNationalId(value);
    if (gender === null || gender === expectedGender) {
      return null;
    }
    return { parentGender: true };
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
