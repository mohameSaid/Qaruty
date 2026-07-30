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
import { Role } from '../../../../core/models/role.model';

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
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        this.router.navigateByUrl(returnUrl || this.resolvePostLoginRoute());
      },
      error: (_error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.loginFailed.set(true);
        this.form.controls.password.reset('');
      },
    });
  }

  /** ADMIN lands on the dashboard, USER_MANAGER on the users list; everyone else sees their own profile. */
  private resolvePostLoginRoute(): string {
    if (this.auth.hasRole(Role.Admin)) {
      return '/dashboard';
    }
    if (this.auth.hasRole(Role.UserManager)) {
      return '/users';
    }
    return '/profile';
  }
}
