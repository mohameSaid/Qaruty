import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { ChangePasswordDialogComponent } from '../../../auth/components/change-password-dialog/change-password-dialog.component';
import { ResultShareCardComponent } from '../../../../shared/components/result-share-card/result-share-card.component';
import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar.component';
import { ShareCardService } from '../../../../shared/services/share-card.service';
import { readFileAsDataUrl } from '../../../../shared/utils/file.util';
import { CompetitionHistoryItem } from '../../../users/models/competition.model';
import { Gender, UserDetail } from '../../../users/models/user.model';
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
    MatTooltipModule,
    RouterLink,
    ResultShareCardComponent,
    UserAvatarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  readonly Gender = Gender;

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

  /**
   * Row currently feeding the off-screen `ResultShareCardComponent` for capture — set only while a
   * share is in flight. The card itself stays permanently mounted in the template (see
   * `share-capture-host`) so this `viewChild` never races the card's own creation — it used to be
   * behind an `@if`, which meant `shareCard()` could still be `undefined` by the time `shareResult()`
   * read it right after setting this signal, since the child hadn't been created by CD yet.
   */
  readonly shareRow = signal<CompetitionHistoryItem | null>(null);
  readonly sharingRowId = signal<number | null>(null);
  private readonly shareCard = viewChild(ResultShareCardComponent);

  readonly shareCompetitionName = computed(() => {
    const row = this.shareRow();
    return row ? `${row.competition.name.arabic} — ${row.level.name.arabic}` : '';
  });
  readonly shareEvaluation = computed(() => this.shareRow()?.grade?.name.arabic ?? '');

  /** Photo the user picked for their share card, as a data URL — chosen once via the avatar camera button, reused for every share. */
  readonly sharePhoto = signal<string | null>(null);

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

    // Most students don't notice the small camera button on their avatar on their own — require
    // a photo before sharing rather than silently exporting the generic placeholder icon.
    if (!this.sharePhoto()) {
      this.snackbar.error('يجب إضافة صورتك الشخصية أولاً عبر زر الكاميرا بجانب صورتك بالأعلى.');
      return;
    }

    this.sharingRowId.set(row.id);
    try {
      const resultUrl = `${window.location.origin}/users/${user.nationalId}/result/${row.id}`;
      this.shareRow.set(row);
      // The card stays permanently mounted (see `share-capture-host`) so this signal write just
      // updates its inputs — wait a couple of frames for that DOM update (and the participant photo
      // `<img>` decode, if one was chosen) to actually paint before capturing it.
      await this.waitForNextPaint();

      const el = this.shareCard()?.captureRoot().nativeElement;
      if (!el) {
        throw new Error('تعذر تجهيز بطاقة النتيجة.');
      }
      // The card element is reused across shares, so the service's per-element cache must be
      // dropped each time or a later share would silently reuse an earlier row's rendered PNG.
      this.shareCardService.invalidate(el);

      const options = {
        fileName: `نتيجتي-${row.competition.name.arabic}.png`,
        shareTitle: `نتيجتي في ${row.competition.name.arabic}`,
        shareText: `حصلت على ${row.score ?? '—'} / 100 في ${row.competition.name.arabic} عبر قريتي: ${resultUrl}`,
        pageUrl: resultUrl,
      };
      if (target === 'whatsapp') {
        await this.shareCardService.shareToWhatsApp(el, options);
      } else {
        await this.shareCardService.shareToFacebook(el, options);
      }
      this.snackbar.info('تم تنزيل صورة النتيجة، يمكنك إرفاقها يدويًا في المحادثة بجانب الرابط.');
    } catch (err) {
      console.error('shareResult failed', err);
      this.snackbar.error('تعذرت مشاركة النتيجة، حاول مرة أخرى.');
    } finally {
      this.sharingRowId.set(null);
      this.shareRow.set(null);
    }
  }

  /** Reads the chosen file into `sharePhoto` as a data URL, ready to bind to the card's `participantPhoto` input. */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    readFileAsDataUrl(file).then((dataUrl) => this.sharePhoto.set(dataUrl));
  }

  private waitForNextPaint(): Promise<void> {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }
}
