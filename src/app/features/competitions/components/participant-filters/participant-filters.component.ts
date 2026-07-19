import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { CompetitionException, CompetitionLevel } from '../../models/competition.model';
import { LookupRef } from '../../models/lookup.model';
import { Gender, ParticipantFilters } from '../../models/participant.model';

/** Collapsible filters panel for the participants table — mirrors the users feature's `AdvancedSearchComponent`. */
@Component({
  selector: 'app-participant-filters',
  standalone: true,
  providers: [provideNativeDateAdapter()],
  imports: [
    ReactiveFormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participant-filters.component.html',
  styleUrl: './participant-filters.component.scss',
})
export class ParticipantFiltersComponent {
  readonly searching = input<boolean>(false);
  /** Currently-applied filters (e.g. from the store), used to rebind the form when this panel is re-created. */
  readonly initialFilters = input<ParticipantFilters>({});
  readonly levels = input<CompetitionLevel[]>([]);
  readonly exceptions = input<CompetitionException[]>([]);
  readonly places = input<LookupRef[]>([]);
  readonly instructors = input<LookupRef[]>([]);

  readonly search = output<ParticipantFilters>();
  readonly clear = output<void>();

  readonly Gender = Gender;

  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    search: [''],
    nationalId: [''],
    mobileNumber: [''],
    gender: this.fb.control<Gender | null>(null),
    createdDate: this.fb.control<Date | null>(null),
    placeId: this.fb.control<number | null>(null),
    levelId: this.fb.control<number | null>(null),
    instructorId: this.fb.control<number | null>(null),
    partsCount: this.fb.control<number | null>(null),
    exceptionId: this.fb.control<number | null>(null),
    privateInstructorNotNull: [false],
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Count of non-empty fields, shown as a live badge on the panel header. */
  readonly activeCount = computed(
    () =>
      Object.values(this.formValue()).filter((v) => v !== null && v !== undefined && v !== '' && v !== false).length
  );

  constructor() {
    effect(() => {
      const filters = this.initialFilters();
      this.form.patchValue(
        {
          search: filters.search ?? '',
          nationalId: filters.nationalId ?? '',
          mobileNumber: filters.mobileNumber ?? '',
          gender: (filters.genderId as Gender) ?? null,
          createdDate: filters.createdDate ? new Date(filters.createdDate) : null,
          placeId: filters.placeId ?? null,
          levelId: filters.levelId ?? null,
          instructorId: filters.instructorId ?? null,
          partsCount: filters.partsCount ?? null,
          exceptionId: filters.exceptionId ?? null,
          privateInstructorNotNull: filters.privateInstructorNotNull ?? false,
        },
        { emitEvent: false }
      );
    });
  }

  onSearch(): void {
    const raw = this.form.getRawValue();
    const filters: ParticipantFilters = {
      search: raw.search.trim() || undefined,
      nationalId: raw.nationalId.trim() || undefined,
      mobileNumber: raw.mobileNumber.trim() || undefined,
      genderId: raw.gender ?? undefined,
      createdDate: raw.createdDate ? this.toIsoDate(raw.createdDate) : undefined,
      placeId: raw.placeId ?? undefined,
      levelId: raw.levelId ?? undefined,
      instructorId: raw.instructorId ?? undefined,
      partsCount: raw.partsCount ?? undefined,
      exceptionId: raw.exceptionId ?? undefined,
      privateInstructorNotNull: raw.privateInstructorNotNull || undefined,
    };

    this.search.emit(filters);
  }

  onClear(): void {
    this.form.reset({
      search: '',
      nationalId: '',
      mobileNumber: '',
      gender: null,
      createdDate: null,
      placeId: null,
      levelId: null,
      instructorId: null,
      partsCount: null,
      exceptionId: null,
      privateInstructorNotNull: false,
    });
    this.clear.emit();
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
