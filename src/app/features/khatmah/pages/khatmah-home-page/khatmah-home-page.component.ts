import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { KhatmahService } from '../../services/khatmah.service';
import { ParticipantIdentityService } from '../../services/participant-identity.service';
import { KhatmahPageMetaService } from '../../services/page-meta.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { getKhatmahErrorMessage } from '../../data/error-messages';
import { CreateKhatmahDialogComponent } from '../../components/create-khatmah-dialog/create-khatmah-dialog.component';
import { ProgressRingComponent } from '../../components/progress-ring/progress-ring.component';
import { KhatmahBreadcrumbComponent } from '../../components/khatmah-breadcrumb/khatmah-breadcrumb.component';

@Component({
  selector: 'app-khatmah-home-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatCardModule, MatIconModule, ProgressRingComponent, KhatmahBreadcrumbComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './khatmah-home-page.component.html',
  styleUrl: './khatmah-home-page.component.scss',
})
export class KhatmahHomePageComponent {
  private readonly khatmahService = inject(KhatmahService);
  private readonly identity = inject(ParticipantIdentityService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly pageMeta = inject(KhatmahPageMetaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly khatmahs = toSignal(this.khatmahService.listPublic(), { initialValue: [] });

  constructor() {
    this.pageMeta.set('ختمات جماعية | قريتي', 'أنشئ ختمة جماعية مع عائلتك أو أصدقائك، شاركوا رابطها، واحجزوا أجزاءكم بلا تسجيل دخول.');
    this.destroyRef.onDestroy(() => this.pageMeta.reset());
  }

  openCreateDialog(): void {
    const dialogRef = this.dialog.open(CreateKhatmahDialogComponent, { width: '520px', maxWidth: '95vw' });
    dialogRef.afterClosed().subscribe((request) => {
      if (!request) return;
      this.khatmahService.createKhatmah(request).subscribe({
        next: (created) => {
          this.identity.setOwnerToken(created.id, created.owner_token);
          this.router.navigate(['/k', created.slug]);
        },
        error: (err) => this.snackbar.error(getKhatmahErrorMessage(err)),
      });
    });
  }

  progressPercent(completedCount: number, totalParts: number): number {
    return totalParts ? Math.round((completedCount / totalParts) * 100) : 0;
  }
}
