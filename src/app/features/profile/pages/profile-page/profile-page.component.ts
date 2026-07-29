import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { catchError, finalize, of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { ChangePasswordDialogComponent } from '../../../auth/components/change-password-dialog/change-password-dialog.component';
import { UserAvatarComponent } from '../../../../shared/components/user-avatar/user-avatar.component';
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
    MatProgressSpinnerModule,
    MatTableModule,
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
  private readonly dialog = inject(MatDialog);

  readonly user = signal<UserDetail | null>(null);
  readonly loading = signal(false);
  readonly loadError = signal(false);

  readonly competitionHistory = signal<CompetitionHistoryItem[]>([]);
  readonly loadingHistory = signal(false);
  readonly historyColumns = ['name', 'level', 'partsCount', 'score', 'status'];

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
}
