import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CreateKhatmahRequest } from '../../models/khatmah.model';
import { KHATMAH_THEME_COLORS, DEFAULT_KHATMAH_THEME_COLOR } from '../../data/theme-colors';
import { dateRangeValidator } from '../../validators/khatmah-form.validators';

@Component({
  selector: 'app-create-khatmah-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
  ],
  providers: [provideNativeDateAdapter()],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-khatmah-dialog.component.html',
  styleUrl: './create-khatmah-dialog.component.scss',
})
export class CreateKhatmahDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateKhatmahDialogComponent, CreateKhatmahRequest>);
  private readonly fb = inject(FormBuilder);

  readonly themeColors = KHATMAH_THEME_COLORS;

  readonly form = this.fb.group(
    {
      title: this.fb.control('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
      description: this.fb.control('', { nonNullable: true }),
      intention: this.fb.control('', { nonNullable: true }),
      is_public: this.fb.control(true, { nonNullable: true }),
      start_date: this.fb.control<Date | null>(null),
      end_date: this.fb.control<Date | null>(null),
      theme_color: this.fb.control(DEFAULT_KHATMAH_THEME_COLOR, { nonNullable: true }),
    },
    { validators: dateRangeValidator('start_date', 'end_date') }
  );

  selectThemeColor(value: string): void {
    this.form.controls.theme_color.setValue(value);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const request: CreateKhatmahRequest = {
      title: value.title.trim(),
      description: value.description.trim() || null,
      intention: value.intention.trim() || null,
      is_public: value.is_public,
      start_date: toIsoDate(value.start_date),
      end_date: toIsoDate(value.end_date),
      theme_color: value.theme_color,
    };
    this.dialogRef.close(request);
  }
}

function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}
