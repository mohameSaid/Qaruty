import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthService } from '../../../../core/services/auth.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { passwordMatchValidator } from '../../../../shared/validators/shared-validators';

@Component({
  selector: 'app-change-password-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './change-password-dialog.component.html',
  styleUrl: './change-password-dialog.component.scss',
})
export class ChangePasswordDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  readonly dialogRef = inject(MatDialogRef<ChangePasswordDialogComponent>);

  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    oldPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmNewPassword: ['', [Validators.required, passwordMatchValidator('newPassword')]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const { oldPassword, newPassword } = this.form.getRawValue();

    this.auth.changePassword(oldPassword, newPassword).subscribe({
      next: (res) => {
        this.submitting.set(false);
        this.snackbar.success(res.message?.arabic ?? 'تم تغيير كلمة المرور بنجاح.');
        this.dialogRef.close(true);
      },
      error: (_error: HttpErrorResponse) => {
        this.submitting.set(false);
      },
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
