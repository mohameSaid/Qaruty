import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dateRangeValidator(startControlName: string, endControlName: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const start = group.get(startControlName)?.value;
    const end = group.get(endControlName)?.value;
    if (!start || !end) {
      return null;
    }
    return new Date(start) <= new Date(end) ? null : { dateRange: true };
  };
}
