import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize, of, tap } from 'rxjs';

import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { RequestDetail, RequestStatusId, RequestTypeId, requestStatusChipClass } from '../../models/request.model';
import { ResetPasswordRequestBody } from '../../models/reset-password-request.model';
import { RequestService } from '../../services/request.service';

/**
 * Details screen for a "Reset Password Request" (type.id = 2).
 * `RequestDetail.body` is a JSON string holding the applicant's contact info,
 * new password, and an identity proof image to review.
 */
@Component({
  selector: 'app-reset-password-request-detail-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password-request-detail-page.component.html',
  styleUrl: './reset-password-request-detail-page.component.scss',
})
export class ResetPasswordRequestDetailPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly requestService = inject(RequestService);
  private readonly dialog = inject(MatDialog);
  private readonly snackbar = inject(SnackbarService);

  readonly RequestStatusId = RequestStatusId;
  readonly statusChipClass = requestStatusChipClass;

  private readonly requestId = Number(this.route.snapshot.paramMap.get('id'));

  readonly loading = signal(false);
  readonly processing = signal(false);
  readonly loadError = signal(false);
  readonly request = signal<RequestDetail | null>(null);

  readonly body = computed<ResetPasswordRequestBody | null>(() => {
    const raw = this.request()?.body;
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ResetPasswordRequestBody;
    } catch {
      return null;
    }
  });

  readonly approveImageSrc = computed(() => {
    const image = this.body()?.aprroveImage;
    return image ? `data:image/webp;base64,${image}` : null;
  });

  readonly isPending = computed(() => this.request()?.status.id === RequestStatusId.New);

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.requestService
      .getById(this.requestId)
      .pipe(
        tap((request) => this.request.set(request)),
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe();
  }

  onApprove(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'قبول الطلب',
        message: 'هل أنت متأكد من قبول طلب إعادة تعيين كلمة المرور؟',
        confirmLabel: 'قبول',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.updateStatus(RequestStatusId.Approved, 'تم قبول الطلب بنجاح.');
      }
    });
  }

  onReject(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'رفض الطلب',
        message: 'هل أنت متأكد من رفض طلب إعادة تعيين كلمة المرور؟',
        confirmLabel: 'رفض',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.updateStatus(RequestStatusId.Rejected, 'تم رفض الطلب.');
      }
    });
  }

  private updateStatus(statusId: RequestStatusId, successMessage: string): void {
    this.processing.set(true);
    this.requestService
      .updateStatus(this.requestId, RequestTypeId.ResetPassword, statusId)
      .pipe(
        tap(() => {
          this.snackbar.success(successMessage);
          this.onBack();
        }),
        catchError(() => of(null)),
        finalize(() => this.processing.set(false))
      )
      .subscribe();
  }

  onBack(): void {
    this.router.navigate(['/system-management/requests']);
  }
}
