import { AbstractControl, ValidationErrors, ValidatorFn } from "@angular/forms";

export function minWordsValidator(minWords: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value || "").trim();
    const words = value.split(/\s+/).filter(Boolean);
    return words.length >= minWords
      ? null
      : { minWords: { required: minWords, actual: words.length } };
  };
}

/** Applied to the confirm-password control; compares it against a sibling control in the same group. */
export function passwordMatchValidator(passwordControlName: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.parent?.get(passwordControlName)?.value;
    if (!control.value || password === undefined) {
      return null;
    }
    return control.value === password ? null : { passwordMismatch: true };
  };
}
