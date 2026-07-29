import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';

import { SnackbarService } from '../../../core/services/snackbar.service';
import { LookupItem } from '../../users/models/lookup.model';
import { LOOKUP_TYPES, LookupItemInput, LookupTypeConfig, LookupTypeKey } from '../models/lookup.model';
import { SystemLookupService } from '../services/system-lookup.service';

@Injectable({ providedIn: 'root' })
export class SystemLookupStore {
  private readonly service = inject(SystemLookupService);
  private readonly snackbar = inject(SnackbarService);

  readonly types = signal<LookupTypeConfig[]>(LOOKUP_TYPES);

  private readonly _selectedTypeKey = signal<LookupTypeKey | null>(null);
  private readonly _governorateOptions = signal<LookupItem[]>([]);
  private readonly _selectedGovernorateId = signal<number | null>(null);
  private readonly _cityOptions = signal<LookupItem[]>([]);
  private readonly _selectedCityId = signal<number | null>(null);
  private readonly _items = signal<LookupItem[]>([]);
  private readonly _loading = signal(false);
  private readonly _saving = signal(false);

  readonly selectedTypeKey = this._selectedTypeKey.asReadonly();
  readonly governorateOptions = this._governorateOptions.asReadonly();
  readonly selectedGovernorateId = this._selectedGovernorateId.asReadonly();
  readonly cityOptions = this._cityOptions.asReadonly();
  readonly selectedCityId = this._selectedCityId.asReadonly();
  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();

  readonly selectedType = computed(() => this.types().find((t) => t.key === this._selectedTypeKey()) ?? null);
  readonly needsGovernorate = computed(() => this.selectedType()?.parentType === 'governorate' || this.selectedType()?.parentType === 'city');
  readonly needsCity = computed(() => this.selectedType()?.parentType === 'city');

  /** Whether the current type's required parent(s) are picked, i.e. it's ready to show items. */
  readonly parentSelected = computed(() => {
    const type = this.selectedType();
    if (!type?.parentType) {
      return true;
    }
    if (type.parentType === 'governorate') {
      return this._selectedGovernorateId() != null;
    }
    if (type.parentType === 'city') {
      return this._selectedCityId() != null;
    }
    return true;
  });

  readonly isEmpty = computed(() => !this._loading() && this.parentSelected() && this._items().length === 0);

  init(): void {
    const first = this.types()[0];
    if (first) {
      this.selectType(first.key);
    }
  }

  selectType(typeKey: LookupTypeKey): void {
    this._selectedTypeKey.set(typeKey);
    this._selectedGovernorateId.set(null);
    this._selectedCityId.set(null);
    this._cityOptions.set([]);
    this._items.set([]);

    const type = this.types().find((t) => t.key === typeKey);
    if (!type?.parentType) {
      this.loadItems(typeKey);
      return;
    }
    if (type.parentType === 'governorate') {
      this.ensureGovernorateOptions();
    } else if (type.parentType === 'city') {
      this.ensureGovernorateOptions();
    }
  }

  private ensureGovernorateOptions(): void {
    if (this._governorateOptions().length > 0) {
      return;
    }
    this.service.getItems('governorate').subscribe((items) => this._governorateOptions.set(items));
  }

  selectGovernorate(governorateId: number): void {
    this._selectedGovernorateId.set(governorateId);
    this._selectedCityId.set(null);
    this._items.set([]);

    const type = this.selectedType();
    if (type?.key === 'city') {
      this.loadItems('city', governorateId);
    } else if (type?.key === 'village') {
      this._loading.set(true);
      this.service
        .getItems('city', governorateId)
        .pipe(finalize(() => this._loading.set(false)))
        .subscribe((items) => this._cityOptions.set(items));
    }
  }

  selectCity(cityId: number): void {
    this._selectedCityId.set(cityId);
    this.loadItems('village', cityId);
  }

  private loadItems(typeKey: LookupTypeKey, parentId?: number): void {
    this._loading.set(true);
    this.service
      .getItems(typeKey, parentId)
      .pipe(
        tap((items) => this._items.set(items)),
        catchError(() => {
          this._items.set([]);
          return of(null);
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  private reload(): void {
    const type = this.selectedType();
    if (!type) {
      return;
    }
    if (type.key === 'city') {
      this.loadItems('city', this._selectedGovernorateId() ?? undefined);
    } else if (type.key === 'village') {
      this.loadItems('village', this._selectedCityId() ?? undefined);
    } else {
      this.loadItems(type.key);
    }
  }

  createItem(input: LookupItemInput, onSuccess?: () => void): void {
    const type = this.selectedType();
    if (!type) {
      return;
    }
    const parentId = type.key === 'city' ? this._selectedGovernorateId() : type.key === 'village' ? this._selectedCityId() : undefined;

    this._saving.set(true);
    this.service
      .create(type.key, input, parentId ?? undefined)
      .pipe(
        tap(() => {
          this.snackbar.success('تمت إضافة العنصر بنجاح.');
          this.reload();
          onSuccess?.();
        }),
        catchError(() => {
          this.snackbar.error('حدث خطأ أثناء إضافة العنصر.');
          return of(null);
        }),
        finalize(() => this._saving.set(false))
      )
      .subscribe();
  }

  updateItem(id: number, input: LookupItemInput, onSuccess?: () => void): void {
    const type = this.selectedType();
    if (!type) {
      return;
    }
    this._saving.set(true);
    this.service
      .update(type.key, id, input)
      .pipe(
        tap(() => {
          this.snackbar.success('تم تحديث العنصر بنجاح.');
          this.reload();
          onSuccess?.();
        }),
        catchError(() => {
          this.snackbar.error('حدث خطأ أثناء تحديث العنصر.');
          return of(null);
        }),
        finalize(() => this._saving.set(false))
      )
      .subscribe();
  }

  deleteItem(id: number): void {
    const type = this.selectedType();
    if (!type) {
      return;
    }
    this._saving.set(true);
    this.service
      .delete(type.key, id)
      .pipe(
        tap(() => {
          this.snackbar.success('تم حذف العنصر بنجاح.');
          this.reload();
        }),
        catchError(() => {
          this.snackbar.error('حدث خطأ أثناء حذف العنصر.');
          return of(null);
        }),
        finalize(() => this._saving.set(false))
      )
      .subscribe();
  }
}
