import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { catchError, finalize, of, tap } from "rxjs";

import { GetUsersOptions, UserService } from "../../services/user.service";
import { CompetitionService } from "../../services/competition.service";
import { SnackbarService } from "../../../../core/services/snackbar.service";
import { CompetitionRegistrationComponent } from "../../components/competition-registration/competition-registration.component";
import { Gender, UserDetail } from "../../models/user.model";
import {
  CompetitionHistoryItem,
  RegisterCompetitionRequest,
  UpdateCompetitionRequest,
} from "../../models/competition.model";

/**
 * Read-only profile view for a single user, reached from the users table's "view
 * details" action. Also hosts the "register in a new competition" flow for an
 * *existing* user — see the "المسابقات" tab — reusing the same
 * CompetitionRegistrationComponent the Add-User flow uses after finalizing a new
 * person, so the two entry points (new vs. existing user) share one UX.
 */
@Component({
  selector: "app-user-detail-page",
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    CompetitionRegistrationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./user-detail-page.component.html",
  styleUrl: "./user-detail-page.component.scss",
})
export class UserDetailPageComponent implements OnInit {
  /** Bound from the `:nationalId` route param via withComponentInputBinding(). */
  readonly nationalId = input<string | undefined>();

  private readonly userService = inject(UserService);
  private readonly competitionService = inject(CompetitionService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);

  readonly user = signal<UserDetail | null>(null);
  readonly loadingUser = signal(false);
  readonly loadError = signal(false);

  readonly competitionHistory = signal<CompetitionHistoryItem[]>([]);
  readonly loadingHistory = signal(false);
  readonly registering = signal(false);
  /** Bumped after each successful registration so the form clears itself and re-hides behind the Add button. */
  readonly competitionFormResetCounter = signal(0);
  shownewCompitionForm: boolean = true;
  readonly Gender = Gender;

  ngOnInit(): void {
    const id = this.nationalId();
    if (!id) {
      this.loadError.set(true);
      return;
    }

    this.loadingUser.set(true);
    this.userService
      .getUserByNationalId(id)
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        }),
        finalize(() => this.loadingUser.set(false)),
      )
      .subscribe((user) => {
        if (user) {
          this.user.set(user);
          this.loadCompetitionHistory(user?.id);
        }
      });
  }

  onEdit(): void {
    const id = this.nationalId();
    if (id) {
      this.router.navigate(["/users", id, "edit"]);
    }
  }

  onEvaluate(item: CompetitionHistoryItem): void {
    const id = this.nationalId();
    if (id) {
      this.router.navigate(["/users", id, "evaluate", item.id]);
    }
  }

  onBack(): void {
    this.router.navigate(["/users"]);
  }

  onRegisterCompetition(payload: RegisterCompetitionRequest): void {
    this.registering.set(true);
    this.competitionService
      .registerCompetition(payload)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.registering.set(false)),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.snackbar.success("تم التسجيل في المسابقة بنجاح.");
        const userId = this.user()?.id;
        if (userId) {
          this.loadCompetitionHistory(userId);
        }
        this.competitionFormResetCounter.update((v) => v + 1);
      });
  }

  onEditParticipant(payload: UpdateCompetitionRequest): void {
    this.registering.set(true);
    this.competitionService
      .updateParticipant(payload.id, payload)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.registering.set(false)),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.snackbar.success("تم تعديل التسجيل بنجاح.");
        const userId = this.user()?.id;
        if (userId) {
          this.loadCompetitionHistory(userId);
        }
        this.competitionFormResetCounter.update((v) => v + 1);
      });
  }

  onDeactivateParticipant(item: CompetitionHistoryItem): void {
    this.competitionService
      .deactivateParticipant(item.id)
      .pipe(
        tap(() => {
          this.snackbar.success("تم إلغاء تفعيل التسجيل بنجاح.");
          const userId = this.user()?.id;
          if (userId) {
            this.loadCompetitionHistory(userId);
          }
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  onActivateParticipant(item: CompetitionHistoryItem): void {
    this.competitionService
      .activateParticipant(item.id)
      .pipe(
        tap(() => {
          this.snackbar.success("تم إعادة تفعيل التسجيل بنجاح.");
          const userId = this.user()?.id;
          if (userId) {
            this.loadCompetitionHistory(userId);
          }
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  onDeleteParticipant(item: CompetitionHistoryItem): void {
    this.competitionService
      .deleteParticipant(item.id)
      .pipe(
        tap(() => {
          this.snackbar.success("تم حذف التسجيل نهائيًا بنجاح.");
          const userId = this.user()?.id;
          if (userId) {
            this.loadCompetitionHistory(userId);
          }
        }),
        catchError(() => of(null)),
      )
      .subscribe();
  }

  private loadCompetitionHistory(userId: number): void {
    this.loadingHistory.set(true);
    this.competitionService
      .getStudentHistory(userId, {
        pageNo: 0,
        size: 10,
        sortColumn: "id",
        sortDirection: "DESC",
      })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loadingHistory.set(false)),
      )
      .subscribe((page) => {
        this.competitionHistory.set(page?.data ?? []);
      });
  }
}
