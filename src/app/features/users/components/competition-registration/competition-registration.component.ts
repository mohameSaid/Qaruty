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
import { MatTableModule } from "@angular/material/table";
import { MatTooltipModule } from "@angular/material/tooltip";
import { catchError, of } from "rxjs";
import { NgxMatSelectSearchModule } from "ngx-mat-select-search";

import { LookupService } from "../../services/lookup.service";
import { LookupItem } from "../../models/lookup.model";
import {
  CompetitionHistoryItem,
  CompetitionOption,
  RegisterCompetitionRequest,
} from "../../models/competition.model";

@Component({
  selector: "app-competition-registration",
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
    MatTableModule,
    MatTooltipModule,
    NgxMatSelectSearchModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./competition-registration.component.html",
  styleUrl: "./competition-registration.component.scss",
})
export class CompetitionRegistrationComponent {
  private readonly fb = inject(FormBuilder);
  private readonly lookupService = inject(LookupService);

  readonly userId = input.required<number>();
  readonly history = input<CompetitionHistoryItem[]>([]);
  readonly loadingHistory = input<boolean>(false);
  readonly registering = input<boolean>(false);
  readonly resetTrigger = input<number>(0);

  readonly register = output<RegisterCompetitionRequest>();
  readonly evaluate = output<CompetitionHistoryItem>();

  readonly historyColumns = ["name", "level", "partsCount", "score", "actions"];

  /** Form starts hidden behind the "Add" button; only one registration is edited at a time. */
  readonly showForm = signal(false);

  readonly competitions = signal<CompetitionOption[]>([]);
  readonly instructors = signal<LookupItem[]>([]);
  readonly places = signal<LookupItem[]>([]);
  readonly loadingLookups = signal(false);

  readonly searchCtrl = new FormControl("");

  private readonly instructorSearch = toSignal(this.searchCtrl.valueChanges, {
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

  readonly form = this.fb.nonNullable.group({
    competitionId: this.fb.control<number | null>(null, Validators.required),
    levelId: this.fb.control<number | null>(null, Validators.required),
    partsCount: this.fb.control<number | null>(null, Validators.required),
    instructorId: this.fb.control<number | null>(null),
    placeId: this.fb.control<number | null>(null),
    exceptionId: this.fb.control<number | null>(null),
    notes: [""],
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

    // Changing the competition invalidates the previously chosen level/parts/exception.
    this.form.controls.competitionId.valueChanges.subscribe(() => {
      this.form.controls.levelId.setValue(null);
      this.form.controls.partsCount.setValue(null);
      this.form.controls.exceptionId.setValue(null);
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
        this.form.reset({
          competitionId: null,
          levelId: null,
          partsCount: null,
          instructorId: null,
          placeId: null,
          exceptionId: null,
          notes: "",
        });
        this.showForm.set(false);
      }
    });
  }

  openForm(): void {
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.form.reset({
      competitionId: null,
      levelId: null,
      partsCount: null,
      instructorId: null,
      placeId: null,
      exceptionId: null,
      notes: "",
    });
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
      .subscribe((page) => {
        this.places.set(page.data ?? []);
        this.loadingLookups.set(false);
      });
  }

  onEvaluate(item: CompetitionHistoryItem): void {
    this.evaluate.emit(item);
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
      notes: raw.notes,
      exceptionId: raw.exceptionId ? [raw.exceptionId] : null,
    };

    this.register.emit(payload);
  }
}
