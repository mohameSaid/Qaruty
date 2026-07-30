import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ResetPasswordService } from '../../services/reset-password.service';
import { ResetPasswordDetails, ResetPasswordRequest } from '../../models/reset-password.model';
import { RequestTypeId } from '../../../system-management/models/request.model';
import { nationalIdValidator, mobileNumberValidator } from '../../../../shared/validators/national-id.validator';
import { passwordMatchValidator } from '../../../../shared/validators/shared-validators';
import { readFileAsBase64 } from '../../../../shared/utils/file.util';

type SubmitOutcome = 'idle' | 'success';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
})
export class ResetPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly resetPasswordService = inject(ResetPasswordService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly outcome = signal<SubmitOutcome>('idle');
  readonly resultMessage = signal('');

  readonly proofFile = signal<File | null>(null);
  readonly proofFileTouched = signal(false);

  readonly form = this.fb.nonNullable.group({
    nationalId: ['', [Validators.required, nationalIdValidator()]],
    mobileNumber: ['', [Validators.required, mobileNumberValidator()]],
    otherMobileNumber: ['', mobileNumberValidator()],
    email: ['', [Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, passwordMatchValidator('password')]],
  });

  onProofFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.proofFileTouched.set(true);
    this.proofFile.set(input.files?.[0] ?? null);
  }

  submit(): void {
    this.proofFileTouched.set(true);

    if (this.form.invalid || !this.proofFile()) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);

    const raw = this.form.getRawValue();

    readFileAsBase64(this.proofFile()!).then((aprroveImage) => {
      const details: ResetPasswordDetails = {
        aprroveImage,
        contactDto: {
          mobileNumber: raw.mobileNumber,
          otherMobileNumber: raw.otherMobileNumber,
          email: raw.email,
        },
        password: raw.password,
      };

      const payload: ResetPasswordRequest = {
        nationalId: Number(raw.nationalId),
        type: RequestTypeId.ResetPassword,
        details: JSON.stringify(details),
      };

      this.resetPasswordService.resetPassword(payload).subscribe({
        next: (res) => {
          this.submitting.set(false);
          this.resultMessage.set(
            res.message?.arabic ?? 'تم إرسال طلب إعادة تعيين كلمة المرور بنجاح، وهو بانتظار موافقة المسؤول.'
          );
          this.outcome.set('success');
        },
        error: (_error: HttpErrorResponse) => {
          this.submitting.set(false);
        },
      });
    });
  }

  goToLogin(): void {
    this.router.navigateByUrl('/login');
  }
}
