import { ChangeDetectionStrategy, Component, OnInit, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { ChangePasswordDialogComponent } from '../../../auth/components/change-password-dialog/change-password-dialog.component';
import { ResultShareCardComponent } from '../../../../shared/components/result-share-card/result-share-card.component';
import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar.component';
import { ShareCardService } from '../../../../shared/services/share-card.service';
import { CompetitionHistoryItem } from '../../../users/models/competition.model';
import { UserDetail } from '../../../users/models/user.model';
import { CompetitionService } from '../../../users/services/competition.service';
import { UserService } from '../../../users/services/user.service';

/** Read-only "my profile" view for the signed-in user, reusing `UserService.getUserByNationalId`. */
@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTableModule,
    RouterLink,
    ResultShareCardComponent,
    UserAvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly userService = inject(UserService);
  private readonly competitionService = inject(CompetitionService);
  private readonly shareCardService = inject(ShareCardService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(MatDialog);

  readonly user = signal<UserDetail | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  readonly competitionHistory = signal<CompetitionHistoryItem[]>([]);
  readonly loadingHistory = signal(false);
  readonly historyColumns = ['name', 'level', 'partsCount', 'score', 'status', 'actions'];

  /** Row currently rendered into the off-screen `ResultShareCardComponent` for capture — set only while a share is in flight. */
  readonly shareRow = signal<CompetitionHistoryItem | null>(null);
  readonly shareQr = signal<string | null>(null);
  readonly sharingRowId = signal<number | null>(null);
  private readonly shareCard = viewChild(ResultShareCardComponent);

  ngOnInit(): void {
    const nationalId = this.auth.nationalId();
    if (nationalId == null) {
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.userService
      .getUserByNationalId(String(nationalId), 'NATIONAL_ID')
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((user) => {
        this.user.set(user);
        if (user) {
          this.loadCompetitionHistory(user.id);
        }
      });
  }

  private loadCompetitionHistory(userId: number): void {
    this.loadingHistory.set(true);
    this.competitionService
      .getStudentHistory(userId, { pageNo: 0, size: 10, sortColumn: 'id', sortDirection: 'DESC' })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loadingHistory.set(false))
      )
      .subscribe((page) => this.competitionHistory.set(page?.data ?? []));
  }

  onChangePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '420px' });
  }

  async shareResult(row: CompetitionHistoryItem, target: 'whatsapp' | 'facebook'): Promise<void> {
    const user = this.user();
    if (!user || !user.nationalId || this.sharingRowId() != null) {
      return;
    }

    this.sharingRowId.set(row.id);
    try {
      const resultUrl = `${window.location.origin}/users/${user.nationalId}/result/${row.id}`;
      this.shareQr.set(await this.shareCardService.buildQrCodeDataUrl(resultUrl));
      this.shareRow.set(row);
      // Let the `@if` above render the off-screen card and the QR <img> (a data: URL — decodes within a frame or two) paint before capturing it.
      await this.waitForNextPaint();

      const el = this.shareCard()?.captureRoot().nativeElement;
      if (!el) {
        throw new Error('تعذر تجهيز بطاقة النتيجة.');
      }

      const options = {
        fileName: `نتيجتي-${row.competition.name.arabic}.png`,
        shareTitle: `نتيجتي في ${row.competition.name.arabic}`,
        shareText: `حصلت على ${row.score ?? '—'} / 100 في ${row.competition.name.arabic} عبر قريتي: ${resultUrl}`,
        pageUrl: resultUrl,
      };
      const outcome =
        target === 'whatsapp'
          ? await this.shareCardService.shareToWhatsApp(el, options)
          : await this.shareCardService.shareToFacebook(el, options);

      if (outcome === 'downloaded') {
        this.snackbar.info('تم تنزيل صورة النتيجة، يمكنك إرفاقها يدويًا في المحادثة.');
      }
    } catch {
      this.snackbar.error('تعذرت مشاركة النتيجة، حاول مرة أخرى.');
    } finally {
      this.sharingRowId.set(null);
      this.shareRow.set(null);
      this.shareQr.set(null);
    }
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }
}
