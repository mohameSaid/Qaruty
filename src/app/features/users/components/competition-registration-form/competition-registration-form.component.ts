import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import { toSignal } from "@angular/core/rxjs-interop";
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatSelectModule } from "@angular/material/select";
import { catchError, of } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

import { LookupService } from "../../services/lookup.service";
import { LookupItem } from "../../models/lookup.model";
import {
  CompetitionOption,
  RegisterCompetitionRequest,
  UpdateCompetitionRequest,
} from "../../models/competition.model";
import { HasPermissionDirective } from "../../../../core/directives/has-permission.directive";
import { Permission } from "../../../../core/models/permission.model";

/**
 * Register-or-edit form for a competition registration, shared between the
 * per-user "المسابقات" tab (competition-registration.component) and the
 * competition participants table (which only ever drives it in edit mode).
 */
@Component({
  selector: "app-competition-registration-form",
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    NgxMatSelectSearchModule,
    HasPermissionDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./competition-registration-form.component.html",
  styleUrl: "./competition-registration-form.component.scss",
})
export class CompetitionRegistrationFormComponent {
  readonly Permission = Permission;

  private readonly fb = inject(FormBuilder);
  private readonly lookupService = inject(LookupService);

  readonly userId = input.required<number>();
  readonly registering = input<boolean>(false);
  readonly resetTrigger = input<number>(0);
  /** Prefills the study-year field; stays editable afterwards. */
  readonly defaultStudyYearId = input<number | null>(null);
  /** Set from outside to open the form pre-filled for editing an existing registration. */
  readonly editRequest = input<UpdateCompetitionRequest | null>(null);
  /** Whether to show the "تسجيل في مسابقة جديدة" trigger button (hidden on pages with no create flow). */
  readonly showAddButton = input<boolean>(true);

  readonly register = output<RegisterCompetitionRequest>();
  readonly edit = output<UpdateCompetitionRequest>();
  readonly formCancelled = output<void>();

  /** Form starts hidden behind the "Add" button; only one registration is edited at a time. */
  readonly showForm = signal(false);

  /** Set to the history row's id while editing an existing registration; null while creating a new one. */
  readonly editingId = signal<number | null>(null);

  readonly competitions = signal<CompetitionOption[]>([]);
  readonly instructors = signal<LookupItem[]>([]);
  readonly places = signal<LookupItem[]>([]);
  readonly studyLevels = signal<LookupItem[]>([]);
  readonly loadingLookups = signal(false);

  readonly instructorSearchCtrl = new FormControl("");
  readonly placeSearchCtrl = new FormControl("");

  private readonly instructorSearch = toSignal(
    this.instructorSearchCtrl.valueChanges,
    { initialValue: "" },
  );
  private readonly placeSearch = toSignal(this.placeSearchCtrl.valueChanges, {
    initialValue: "",
  });

  readonly filteredInstructors = computed(() => {
    const term = (this.instructorSearch() ?? "").trim().toLowerCase();
    if (!term) {
      return this.instructors();
    }
    return this.instructors().filter((item) =>
      item.name.arabic.toLowerCase().includes(term),
    );
  });

  readonly filteredPlaces = computed(() => {
    const term = (this.placeSearch() ?? "").trim().toLowerCase();
    if (!term) {
      return this.places();
    }
    return this.places().filter((item) =>
      item.name.arabic.toLowerCase().includes(term),
    );
  });

  readonly form = this.fb.nonNullable.group({
    competitionId: this.fb.control<number | null>(null, Validators.required),
    levelId: this.fb.control<number | null>(null, Validators.required),
    partsCount: this.fb.control<number | null>(null, Validators.required),
    studyYearId: this.fb.control<number | null>(null),
    instructorId: this.fb.control<number | null>(null),
    placeId: this.fb.control<number | null>(null),
    exceptionIdList: this.fb.nonNullable.control<number[]>([]),
    notes: [null],
  });

  /** Tracks the competition select reactively so the level dropdown can cascade from it. */
  private readonly selectedCompetitionId = toSignal(
    this.form.controls.competitionId.valueChanges,
    {
      initialValue: this.form.controls.competitionId.value,
    },
  );

  /** Levels come from the selected competition's own `levels` array — no separate endpoint. */
  readonly availableLevels = computed(
    () =>
      this.competitions().find((c) => c.id === this.selectedCompetitionId())
        ?.levels ?? [],
  );

  /** Exceptions come from the selected competition's own `exceptions` array — no separate endpoint. */
  readonly availableExceptions = computed(
    () =>
      this.competitions().find((c) => c.id === this.selectedCompetitionId())
        ?.exceptions ?? [],
  );

  constructor() {
    this.loadLookups();

    // Prefills the study-year field from the person's own record; stays editable afterwards.
    effect(() => {
      this.form.controls.studyYearId.setValue(this.defaultStudyYearId(), {
        emitEvent: false,
      });
    });

    // Changing the competition invalidates the previously chosen level/parts/exception.
    this.form.controls.competitionId.valueChanges.subscribe(() => {
      this.form.controls.levelId.setValue(null);
      this.form.controls.partsCount.setValue(null);
      this.form.controls.exceptionIdList.setValue([]);
    });

    // Parts count is a property of the level, not something the judge types by hand.
    this.form.controls.levelId.valueChanges.subscribe((levelId) => {
      const level = this.availableLevels().find((l) => l.id === levelId);
      this.form.controls.partsCount.setValue(level?.partsCount ?? null);
    });

    let previousResetTrigger = this.resetTrigger();
    effect(() => {
      const trigger = this.resetTrigger();
      if (trigger !== previousResetTrigger) {
        previousResetTrigger = trigger;
        this.resetAndHideForm();
      }
    });

    // Driven by a parent table's "edit" action — opens the form pre-filled for that row.
    effect(() => {
      const req = this.editRequest();
      if (!req) {
        return;
      }
      this.editingId.set(req.id);
      this.form.reset({
        competitionId: req.competitionId,
        levelId: req.levelId,
        partsCount: req.partsCount,
        studyYearId: req.studyYearId,
        instructorId: req.instructorId,
        placeId: req.placeId,
        exceptionIdList: req.exceptionIdList ?? [],
        notes: null,
      });
      this.showForm.set(true);
    });
  }

  openForm(): void {
    this.editingId.set(null);
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.resetAndHideForm();
    this.formCancelled.emit();
  }

  private resetAndHideForm(): void {
    this.form.reset({
      competitionId: null,
      levelId: null,
      partsCount: null,
      studyYearId: this.defaultStudyYearId(),
      instructorId: null,
      placeId: null,
      exceptionIdList: [],
      notes: null,
    });
    this.showForm.set(false);
    this.editingId.set(null);
  }

  private loadLookups(): void {
    this.loadingLookups.set(true);

    this.lookupService
      .getActiveCompetitions()
      .pipe(
        catchError(() =>
          of({ data: [] as CompetitionOption[], totalRecords: 0 }),
        ),
      )
      .subscribe((page) => this.competitions.set(page.data ?? []));

    this.lookupService
      .getInstructors()
      .pipe(catchError(() => of({ data: [] as LookupItem[], totalRecords: 0 })))
      .subscribe((page) => this.instructors.set(page.data ?? []));

    this.lookupService
      .getPlaces()
      .pipe(catchError(() => of({ data: [] as LookupItem[], totalRecords: 0 })))
      .subscribe((page) => this.places.set(page.data ?? []));

    this.lookupService
      .getStudyLevels()
      .pipe(catchError(() => of({ data: [] as LookupItem[], totalRecords: 0 })))
      .subscribe((page) => {
        this.studyLevels.set(page.data ?? []);
        this.loadingLookups.set(false);
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: RegisterCompetitionRequest = {
      competitionId: raw.competitionId!,
      userId: this.userId(),
      instructorId: raw.instructorId,
      placeId: raw.placeId,
      levelId: raw.levelId!,
      partsCount: raw.partsCount!,
      studyYearId: raw.studyYearId,
      notes: raw.notes,
      exceptionIdList: raw.exceptionIdList.length ? raw.exceptionIdList : null,
    };

    const editingId = this.editingId();
    if (editingId != null) {
      this.edit.emit({ ...payload, id: editingId });
    } else {
      this.register.emit(payload);
    }
  }
}
