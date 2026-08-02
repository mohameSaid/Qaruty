import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject, input, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { Observable, interval, of, tap } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { KhatmahService } from '../../services/khatmah.service';
import { PartsService } from '../../services/parts.service';
import { KhatmahRealtimeService } from '../../services/khatmah-realtime.service';
import { ParticipantIdentityService } from '../../services/participant-identity.service';
import { KhatmahPageMetaService } from '../../services/page-meta.service';
import { KhatmahStore } from '../../store/khatmah.store';
import { PartsBoardStore } from '../../store/parts-board.store';
import { ActivityFeedStore } from '../../store/activity-feed.store';
import { Part } from '../../models/part.model';
import { getKhatmahErrorMessage } from '../../data/error-messages';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { JoinDialogComponent } from '../../components/join-dialog/join-dialog.component';
import { ShareSheetComponent } from '../../components/share-sheet/share-sheet.component';
import { KhatmahSummaryHeaderComponent } from '../../components/khatmah-summary-header/khatmah-summary-header.component';
import { PartsBoardComponent } from '../../components/parts-board/parts-board.component';
import { ActivityFeedComponent } from '../../components/activity-feed/activity-feed.component';
import { KhatmahBreadcrumbComponent } from '../../components/khatmah-breadcrumb/khatmah-breadcrumb.component';

const EXPIRED_RESERVATIONS_POLL_MS = 60_000;

@Component({
  selector: 'app-khatmah-view-page',
  standalone: true,
  imports: [
    MatIconModule,
    MatProgressSpinnerModule,
    KhatmahSummaryHeaderComponent,
    PartsBoardComponent,
    ActivityFeedComponent,
    KhatmahBreadcrumbComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './khatmah-view-page.component.html',
  styleUrl: './khatmah-view-page.component.scss',
})
export class KhatmahViewPageComponent {
  readonly slug = input.required<string>();

  protected readonly khatmahStore = inject(KhatmahStore);
  protected readonly partsBoardStore = inject(PartsBoardStore);
  protected readonly activityFeedStore = inject(ActivityFeedStore);

  private readonly khatmahService = inject(KhatmahService);
  private readonly partsService = inject(PartsService);
  private readonly khatmahRealtime = inject(KhatmahRealtimeService);
  private readonly identity = inject(ParticipantIdentityService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageMeta = inject(KhatmahPageMetaService);

  private sessionDisplayName: string | null = null;

  isOwner(): boolean {
    const khatmah = this.khatmahStore.khatmah();
    return khatmah ? this.identity.isOwner(khatmah.id) : false;
  }

  myPartIds(): string[] {
    return this.partsBoardStore.myParts().map((p) => p.id);
  }

  constructor() {
    effect(() => {
      const slug = this.slug();
      untracked(() => this.load(slug));
    });

    interval(EXPIRED_RESERVATIONS_POLL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        const khatmahId = this.khatmahStore.khatmah()?.id;
        if (khatmahId) {
          this.partsService.releaseExpiredReservations(khatmahId).subscribe();
        }
      });

    this.destroyRef.onDestroy(() => {
      this.khatmahRealtime.disconnect();
      this.pageMeta.reset();
    });
  }

  onReserve(part: Part): void {
    const khatmah = this.khatmahStore.khatmah();
    if (!khatmah) return;

    this.ensureDisplayName(khatmah.title).subscribe((name) => {
      if (!name) return;
      this.partsService.reservePart(khatmah.id, part.part_number, this.identity.getParticipantToken(), name).subscribe({
        next: (updated) => {
          this.partsBoardStore.applyPartRealtimeUpdate(updated);
          this.identity.addMyPartId(khatmah.id, updated.id);
        },
        error: (err) => this.snackbar.error(getKhatmahErrorMessage(err)),
      });
    });
  }

  onOpenReader(part: Part): void {
    const khatmah = this.khatmahStore.khatmah();
    if (!khatmah) return;
    this.router.navigate(['/k', khatmah.slug, 'read', part.part_number]);
  }

  onCancel(part: Part): void {
    const khatmah = this.khatmahStore.khatmah();
    if (!khatmah) return;
    this.partsService.releasePart(part.id, this.identity.getParticipantToken()).subscribe({
      next: (updated) => {
        this.partsBoardStore.applyPartRealtimeUpdate(updated);
        this.identity.removeMyPartId(khatmah.id, updated.id);
      },
      error: (err) => this.snackbar.error(getKhatmahErrorMessage(err)),
    });
  }

  onAdminRelease(part: Part): void {
    const khatmah = this.khatmahStore.khatmah();
    const ownerToken = khatmah ? this.identity.getOwnerToken(khatmah.id) : null;
    if (!khatmah || !ownerToken) return;
    this.khatmahService.adminReleasePart(part.id, ownerToken).subscribe({
      next: (updated) => this.partsBoardStore.applyPartRealtimeUpdate(updated),
      error: (err) => this.snackbar.error(getKhatmahErrorMessage(err)),
    });
  }

  onShare(): void {
    const khatmah = this.khatmahStore.khatmah();
    if (!khatmah) return;
    this.dialog.open(ShareSheetComponent, { width: '420px', maxWidth: '95vw', data: { slug: khatmah.slug, title: khatmah.title } });
  }

  onCloseKhatmah(): void {
    const khatmah = this.khatmahStore.khatmah();
    const ownerToken = khatmah ? this.identity.getOwnerToken(khatmah.id) : null;
    if (!khatmah || !ownerToken) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'إغلاق الختمة',
        message: 'هل أنت متأكد من إغلاق هذه الختمة؟ لن يتمكن أحد من حجز أجزاء جديدة بعد ذلك.',
        confirmLabel: 'إغلاق',
        cancelLabel: 'تراجع',
      } satisfies ConfirmDialogData,
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;
      this.khatmahService.closeKhatmah(khatmah.id, ownerToken).subscribe({
        next: (updated) => this.khatmahStore.setKhatmah(updated),
        error: (err) => this.snackbar.error(getKhatmahErrorMessage(err)),
      });
    });
  }

  private load(slug: string): void {
    this.khatmahStore.clear();
    this.partsBoardStore.clear();
    this.activityFeedStore.clear();
    this.khatmahStore.setLoading(true);

    this.khatmahService.getBySlug(slug).subscribe({
      next: (khatmah) => {
        this.khatmahStore.setKhatmah(khatmah);
        this.khatmahStore.setLoading(false);
        this.khatmahRealtime.connect(khatmah.id);
        this.partsService.listParts(khatmah.id).subscribe((parts) => this.partsBoardStore.setParts(khatmah.id, parts));
        this.khatmahService.listActivity(khatmah.id).subscribe((entries) => this.activityFeedStore.setInitial(entries));
        this.pageMeta.set(`${khatmah.title} | ختمات جماعية | قريتي`, khatmah.intention || khatmah.description || undefined);
      },
      error: () => {
        this.khatmahStore.setLoading(false);
        this.snackbar.error('تعذر العثور على هذه الختمة.');
      },
    });
  }

  private ensureDisplayName(khatmahTitle: string): Observable<string | undefined> {
    if (this.sessionDisplayName) {
      return of(this.sessionDisplayName);
    }
    const dialogRef = this.dialog.open(JoinDialogComponent, {
      width: '420px',
      maxWidth: '95vw',
      data: { khatmahTitle },
    });
    return dialogRef.afterClosed().pipe(
      tap((name) => {
        if (name) this.sessionDisplayName = name;
      })
    );
  }
}
