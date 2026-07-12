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
