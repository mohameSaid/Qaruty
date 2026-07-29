import { ChangeDetectionStrategy, Component, computed, effect, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { REQUEST_STATUS_OPTIONS, REQUEST_TYPE_OPTIONS, RequestFilters } from '../../models/request.model';

/** Collapsible filters panel for the requests table — mirrors `ParticipantFiltersComponent`. */
@Component({
  selector: 'app-request-filters',
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
  templateUrl: './request-filters.component.html',
  styleUrl: './request-filters.component.scss',
})
export class RequestFiltersComponent {
  readonly searching = input<boolean>(false);
  readonly initialFilters = input<RequestFilters>({});

  readonly search = output<RequestFilters>();
  readonly clear = output<void>();

  readonly statusOptions = REQUEST_STATUS_OPTIONS;
  readonly typeOptions = REQUEST_TYPE_OPTIONS;

  private readonly fb = new FormBuilder();

  readonly form = this.fb.nonNullable.group({
    nationalId: [''],
    statusId: this.fb.control<number | null>(null),
    typeId: this.fb.control<number | null>(null),
  });

  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  readonly activeCount = computed(
    () => Object.values(this.formValue()).filter((v) => v !== null && v !== undefined && v !== '').length
  );

  constructor() {
    effect(() => {
      const filters = this.initialFilters();
      this.form.patchValue(
        {
          nationalId: filters.nationalId ?? '',
          statusId: filters.statusId ?? null,
          typeId: filters.typeId ?? null,
        },
        { emitEvent: false }
      );
    });
  }

  onSearch(): void {
    const raw = this.form.getRawValue();
    const filters: RequestFilters = {
      nationalId: raw.nationalId.trim() || undefined,
      statusId: raw.statusId ?? undefined,
      typeId: raw.typeId ?? undefined,
    };

    this.search.emit(filters);
  }

  onClear(): void {
    this.form.reset({ nationalId: '', statusId: null, typeId: null });
    this.clear.emit();
  }
}
