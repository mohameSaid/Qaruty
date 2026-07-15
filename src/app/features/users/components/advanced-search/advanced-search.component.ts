import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { Gender, UserFilters } from '../../models/user.model';

/**
 * Collapsible advanced-search panel for the users table. Replaces the previous
 * dedicated "search by National ID" box: National ID is now just one of several
 * filter fields, and submitting never navigates away — it only updates the
 * table's active filters (see UsersStore.applyFilters).
 */
@Component({
  selector: 'app-advanced-search',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './advanced-search.component.html',
  styleUrl: './advanced-search.component.scss',
})
export class AdvancedSearchComponent {
  readonly searching = input<boolean>(false);
  /** Currently-applied filters (e.g. from the store), used to rebind the form when this panel is re-created. */
  readonly initialFilters = input<UserFilters>({});

  readonly search = output<UserFilters>();
  readonly clear = output<void>();

  readonly Gender = Gender;

  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    nationalId: [''],
    arabicName: [''],
    englishName: [''],
    mobileNumber: [''],
    email: [''],
    gender: this.fb.control<Gender | null>(null),
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Count of non-empty fields, shown as a live badge on the panel header. */
  readonly activeCount = computed(
    () => Object.values(this.formValue()).filter((v) => v !== null && v !== undefined && v !== '').length
  );

  constructor() {
    
    effect(() => {
      const filters = this.initialFilters();
      this.form.patchValue(
        {
          nationalId: filters.nationalId ?? '',
          arabicName: filters.arabicName ?? '',
          englishName: filters.englishName ?? '',
          mobileNumber: filters.mobileNumber ?? '',
          email: filters.email ?? '',
          gender: filters.gender ?? null,
        },
        { emitEvent: false }
      );
    });
  }

  onSearch(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const filters: UserFilters = {
      nationalId: raw.nationalId.trim() || undefined,
      arabicName: raw.arabicName.trim() || undefined,
      englishName: raw.englishName.trim() || undefined,
      mobileNumber: raw.mobileNumber.trim() || undefined,
      email: raw.email.trim() || undefined,
      gender: raw.gender,
    };

    this.search.emit(filters);
  }

  onClear(): void {
    this.form.reset({
      nationalId: '',
      arabicName: '',
      englishName: '',
      mobileNumber: '',
      email: '',
      gender: null,
    });
    this.clear.emit();
  }
}
