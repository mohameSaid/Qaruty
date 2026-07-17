import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  effect,
  inject,
  input,
  signal,
} from "@angular/core";
import { Router } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTabsModule } from "@angular/material/tabs";
import { catchError, finalize, of } from "rxjs";

import { UsersStore } from "../../store/users.store";
import { UserService } from "../../services/user.service";
import { CompetitionService } from "../../services/competition.service";
import { SnackbarService } from "../../../../core/services/snackbar.service";
import { UserFormComponent } from "../../components/user-form/user-form.component";
import { SimilarPersonsComponent } from "../../components/similar-persons/similar-persons.component";
import { CompetitionRegistrationComponent } from "../../components/competition-registration/competition-registration.component";
import {
  CreateUserRequest,
  Gender,
  PersonMatch,
  UserDetail,
} from "../../models/user.model";
import {
  CompetitionHistoryItem,
  RegisterCompetitionRequest,
} from "../../models/competition.model";

@Component({
  selector: "app-user-form-page",
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    UserFormComponent,
    SimilarPersonsComponent,
    CompetitionRegistrationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./user-form-page.component.html",
  styleUrl: "./user-form-page.component.scss",
})
export class UserFormPageComponent implements OnInit {
  /** Bound from the `:nationalId` route param via withComponentInputBinding(); absent on /users/new. */
  readonly nationalId = input<string | undefined>();

  private readonly userService = inject(UserService);
  private readonly competitionService = inject(CompetitionService);
  private readonly snackbar = inject(SnackbarService);
  readonly store = inject(UsersStore);
  private readonly router = inject(Router);

  readonly editingUser = signal<UserDetail | null>(null);
  readonly resolving = signal(false);
  readonly resolveError = signal(false);

  readonly activeTabIndex = signal(0);

  /** Id of the match currently being submitted from the review tab, if any — drives that one row's spinner. */
  readonly selectingMatchId = signal<number | null>(null);
  /** Whether "continue as new" is in flight. */
  readonly submittingNew = signal(false);

  /** Set once the person is created/selected — the registration stays on this page until competition assignment succeeds. */
  readonly finalizedPerson = signal<{
    id: number;
    name: string;
    studyYearId: number | null;
  } | null>(null);

  readonly competitionHistory = signal<CompetitionHistoryItem[]>([]);
  readonly loadingCompetitionHistory = signal(false);
  readonly registeringCompetition = signal(false);
  /** Bumped after each successful registration so the form can clear itself for the next entry. */
  readonly competitionFormResetCounter = signal(0);

  /** The original submit's payload, kept so "continue as new" can resubmit it unchanged. */
  private lastSubmittedPayload: CreateUserRequest | null = null;

  constructor() {
    // Jump to the review tab the moment the backend reports possible duplicates.
    effect(() => {
      if (this.store.hasSimilarMatches()) {
        this.activeTabIndex.set(1);
      }
    });
  }

  ngOnInit(): void {
    const id = this.nationalId();
    if (!id) {
      return;
    }

    this.resolving.set(true);
    this.userService
      .getUserByNationalId(id)
      .pipe(
        catchError(() => {
          this.resolveError.set(true);
          return of(null);
        }),
        finalize(() => this.resolving.set(false)),
      )
      .subscribe((user) => this.editingUser.set(user));
  }

  onCreate(payload: CreateUserRequest): void {
    this.lastSubmittedPayload = payload;
    this.store.createUser(payload, (person) =>
      this.onPersonFinalized(payload, person),
    );
  }

  onUpdate(event: { id: number; payload: CreateUserRequest }): void {
    this.store.updateUser(event.id, event.payload, () =>
      this.finalizePerson(
        event.id,
        event.payload.name.arabic,
        event.payload.studyYearId,
      ),
    );
  }

  /** User picked an existing match from the review tab — resubmit that person's own details, not the freshly typed form data. */
  onSelectMatch(match: PersonMatch): void {
    this.selectingMatchId.set(match.id);
    const payload = this.matchToPayload(match);
    this.store.createUser(
      payload,
      (person) => this.onPersonFinalized(payload, person),
      () => this.selectingMatchId.set(null),
    );
  }

  /** User dismissed all matches — resubmit the original data unchanged so the backend creates a new record. */
  onContinueNew(): void {
    if (!this.lastSubmittedPayload) {
      return;
    }
    const payload = this.lastSubmittedPayload;
    payload.id = 0;
    this.submittingNew.set(true);
    this.store.createUser(
      payload,
      (person) => this.onPersonFinalized(payload, person),
      () => this.submittingNew.set(false),
    );
  }

  onCancelEdit(): void {
    this.store.clearSimilarMatches();
    this.goToList();
  }

  /**
   * Person created/selected — stay on this page; the mandatory competition-assignment step lands here next.
   * The "created" response has come back missing fields (`id`, `name`) in practice, so the display data
   * and student id are built from what we submitted — which is always complete — falling back to the
   * response only when the payload itself didn't carry that field (a genuinely new record's id).
   */
  private onPersonFinalized(
    payload: CreateUserRequest,
    person: UserDetail,
  ): void {
    const userId = payload.id ? payload.id : person?.id;
    if (!userId) {
      return;
    }

    this.finalizePerson(
      userId,
      payload.name.arabic || person?.name?.arabic || "",
      payload.studyYearId,
    );
  }

  private finalizePerson(
    id: number,
    name: string,
    studyYearId: number | null,
  ): void {
    this.finalizedPerson.set({ id, name, studyYearId });
    this.activeTabIndex.set(1);
    this.loadCompetitionHistory(id);
  }

  private loadCompetitionHistory(userId: number): void {
    this.loadingCompetitionHistory.set(true);
    this.competitionService
      .getStudentHistory(userId, {
        pageNo: 0,
        size: 10,
        sortColumn: "id",
        sortDirection: "DESC",
      })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loadingCompetitionHistory.set(false)),
      )
      .subscribe((page) => this.competitionHistory.set(page?.data ?? []));
  }

  /** Registration is only complete once this succeeds, but the user may still want to register the
   *  same person in another competition, so success here stays on this tab and refreshes the history
   *  instead of navigating away. */
  onRegisterCompetition(payload: RegisterCompetitionRequest): void {
    this.registeringCompetition.set(true);
    this.competitionService
      .registerCompetition(payload)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.registeringCompetition.set(false)),
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }
        this.snackbar.success("تم التسجيل في المسابقة بنجاح.");
        const person = this.finalizedPerson();
        if (person) {
          this.loadCompetitionHistory(person.id);
        }
        this.competitionFormResetCounter.update((v) => v + 1);
      });
  }

  /**
   * Maps a review-tab match to the create payload, tagged with the selected person's `id`.
   * The originally typed form data wins for every field — the match's value is only used to
   * fill in what the user left empty (match records routinely have nulls, e.g. `nationalId`
   * is commonly absent on duplicates).
   */
  private matchToPayload(match: PersonMatch): CreateUserRequest {
    // Matches only ever exist after a submission populated `lastSubmittedPayload`, so it's always set here.
    const original = this.lastSubmittedPayload!;
    return {
      id: match.id,
      nationalId: original.nationalId || match.nationalId || 0,
      name: {
        arabic: original.name.arabic || match.name.arabic,
        english: original.name.english || match.name.english || "",
      },
      address: {
        governorate:
          original.address.governorate || match.address.governorate?.id || 0,
        city: original.address.city || match.address.city?.id || 0,
        village: original.address.village || match.address.village?.id || 0,
        details: original.address.details || match.address.details || "",
      },
      contact: {
        email: original.contact.email || match.contact?.email || "",
        mobileNumber:
          original.contact.mobileNumber || match.contact?.mobileNumber || "",
        otherMobileNumber:
          original.contact.otherMobileNumber ||
          match.contact?.otherMobileNumber ||
          "",
      },
      birthDate: original.birthDate || match.birthDate,
      gender: original.gender ?? (match.gender?.id as Gender),
      studyYearId: original.studyYearId,
      father: original.father,
      mother: original.mother,
    };
  }

  private goToList(): void {
    this.router.navigate(["/users"]);
  }
}
