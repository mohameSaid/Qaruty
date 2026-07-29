import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { LookupItem, LookupItemInput } from '../../models/lookup.model';

export interface LookupFormDialogData {
  title: string;
  item: LookupItem | null;
}

@Component({
  selector: 'app-lookup-form-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lookup-form-dialog.component.html',
  styleUrl: './lookup-form-dialog.component.scss',
})
export class LookupFormDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LookupFormDialogComponent>);
  readonly data: LookupFormDialogData = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    arabicName: [this.data.item?.name.arabic ?? '', Validators.required],
    englishName: [this.data.item?.name.english ?? '', Validators.required],
  });

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const result: LookupItemInput = {
      name: { arabic: value.arabicName, english: value.englishName },
    };
    this.dialogRef.close(result);
  }
}
