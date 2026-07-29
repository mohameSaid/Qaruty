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
import { RegistrationRequestBody, SimilarityCandidate } from '../../models/registration-similarity-request.model';
import { RequestService } from '../../services/request.service';

/**
 * Details screen for a "Registration Request With Similarities" (type.id = 1).
 * `RequestDetail.body` is a JSON string holding the submitted registration form
 * plus the list of existing people it was flagged as similar to.
 */
@Component({
  selector: 'app-registration-similarity-request-detail-page',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registration-similarity-request-detail-page.component.html',
  styleUrl: './registration-similarity-request-detail-page.component.scss',
})
export class RegistrationSimilarityRequestDetailPageComponent implements OnInit {
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

  readonly body = computed<RegistrationRequestBody | null>(() => {
    const raw = this.request()?.body;
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as RegistrationRequestBody;
    } catch {
      return null;
    }
  });

  readonly similarities = computed<SimilarityCandidate[]>(() => this.body()?.similarities ?? []);

  readonly isPending = computed(() => this.request()?.status.id === RequestStatusId.New);

  /** Index of the candidate currently centered in the similarities carousel. */
  readonly activeSlide = signal(0);
  /** Candidate the reviewer has picked as the actual match, if any. */
  readonly selectedSimilarityId = signal<number | null>(null);

  selectSimilarity(candidateId: number): void {
    this.selectedSimilarityId.set(this.selectedSimilarityId() === candidateId ? null : candidateId);
  }

  onPrevSlide(): void {
    this.activeSlide.set(Math.max(0, this.activeSlide() - 1));
  }

  onNextSlide(): void {
    this.activeSlide.set(Math.min(this.similarities().length - 1, this.activeSlide() + 1));
  }

  onConfirmSelection(): void {
    const candidate = this.similarities().find((c) => c.id === this.selectedSimilarityId());
    if (!candidate) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'تأكيد التطابق',
        message: `هل أنت متأكد من اعتماد "${candidate.name.arabic}" كتطابق فعلي وقبول الطلب؟`,
        confirmLabel: 'تأكيد',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.updateStatus(RequestStatusId.Approved, 'تم اعتماد التطابق وقبول الطلب بنجاح.', candidate.id);
      }
    });
  }

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
        message: 'هل أنت متأكد من قبول طلب التسجيل؟',
        confirmLabel: 'قبول',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.updateStatus(RequestStatusId.Approved, 'تم قبول الطلب بنجاح.', this.selectedSimilarityId() ?? undefined);
      }
    });
  }

  onReject(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'رفض الطلب',
        message: 'هل أنت متأكد من رفض طلب التسجيل؟',
        confirmLabel: 'رفض',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.updateStatus(RequestStatusId.Rejected, 'تم رفض الطلب.');
      }
    });
  }

  private updateStatus(statusId: RequestStatusId, successMessage: string, similarId?: number): void {
    this.processing.set(true);
    this.requestService
      .updateStatus(this.requestId, RequestTypeId.RegistrationWithSimilarities, statusId, similarId)
      .pipe(
        tap((updated) => {
          this.request.set(updated);
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
