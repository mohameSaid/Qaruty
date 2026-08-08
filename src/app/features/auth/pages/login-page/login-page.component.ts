import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AuthService } from '../../../../core/services/auth.service';
import { sanitizeReturnUrl } from '../../../../core/utils/return-url.util';

@Component({
  selector: 'app-login-page',
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
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly loginFailed = signal(false);
  readonly hidePassword = signal(true);

  readonly form = this.fb.nonNullable.group({
    nationalId: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loginFailed.set(false);
    this.submitting.set(true);

    const { nationalId, password } = this.form.getRawValue();

    this.auth.login(nationalId, password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.redirectAfterLogin();
      },
      error: (_error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.loginFailed.set(true);
        this.form.controls.password.reset('');
      },
    });
  }

  /**
   * Navigates to the sanitized `returnUrl` when present and safe, otherwise to
   * the role-based default route. Falls back to the default route if the
   * navigation itself fails, so a bad/stale returnUrl can never strand the
   * user on /login after a successful authentication.
   */
  private redirectAfterLogin(): void {
    const rawReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const safeReturnUrl = sanitizeReturnUrl(rawReturnUrl);
    const defaultRoute = this.resolvePostLoginRoute();
    const target = safeReturnUrl ?? defaultRoute;

    console.debug('[Login] post-login redirect decision', {
      rawReturnUrl,
      safeReturnUrl,
      defaultRoute,
      target,
    });

    this.router.navigateByUrl(target).then((succeeded) => {
      if (succeeded) {
        return;
      }

      console.warn('[Login] navigateByUrl failed for target, falling back to default route', {
        target,
        defaultRoute,
      });

      if (target !== defaultRoute) {
        this.router.navigateByUrl(defaultRoute);
      }
    });
  }

  /** Without an explicit returnUrl, everyone lands on their own profile regardless of role. */
  private resolvePostLoginRoute(): string {
    return '/profile';
  }
}
