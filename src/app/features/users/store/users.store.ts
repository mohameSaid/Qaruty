import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';
import { UserService } from '../services/user.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import {
  CreateUserRequest,
  PersonMatch,
  UpdateUserRequest,
  UserDetail,
  UserFilters,
  UserListItem,
} from '../models/user.model';

export type SortDirection = 'ASC' | 'DESC';

/**
 * Signal-based store for the Users feature.
 * Centralizes API calls + loading/error state so components stay presentation-only.
 */
@Injectable({ providedIn: 'root' })
export class UsersStore {
  private readonly userService = inject(UserService);
  private readonly snackbar = inject(SnackbarService);

  // ----- state -----
  private readonly _users = signal<UserListItem[]>([]);
  private readonly _totalElements = signal(0);
  private readonly _pageNo = signal(0);
  private readonly _pageSize = signal(10);
  private readonly _sortColumn = signal('id');
  private readonly _sortDirection = signal<SortDirection>('DESC');

  private readonly _loading = signal(false);
  private readonly _saving = signal(false);
  private readonly _deleting = signal(false);

  /** Advanced-search criteria currently applied to the list request; `{}` means "no filters". */
  private readonly _filters = signal<UserFilters>({});

  private readonly _similarMatches = signal<PersonMatch[] | null>(null);

  // ----- public readonly signals -----
  readonly users = this._users.asReadonly();
  readonly totalElements = this._totalElements.asReadonly();
  readonly pageNo = this._pageNo.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();

  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly deleting = this._deleting.asReadonly();

  readonly filters = this._filters.asReadonly();
  readonly hasActiveFilters = computed(() =>
    Object.values(this._filters()).some((v) => v !== undefined && v !== null && v !== '')
  );

  readonly similarMatches = this._similarMatches.asReadonly();
  readonly hasSimilarMatches = computed(() => (this._similarMatches()?.length ?? 0) > 0);

  readonly isEmpty = computed(() => !this._loading() && this._users().length === 0);
  readonly anyBusy = computed(() => this._loading() || this._saving() || this._deleting());

  loadUsers(): void {
    this._loading.set(true);
    this.userService
      .getUsers({
        pageNo: this._pageNo(),
        size: this._pageSize(),
        sortColumn: this._sortColumn(),
        sortDirection: this._sortDirection(),
        filters: this._filters(),
      })
      .pipe(
        tap((page) => {
          this._users.set(page.data ?? []);
          this._totalElements.set(page.totalRecords ?? 0);
        }),
        catchError(() => {
          this._users.set([]);
          return of(null);
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  changePage(pageNo: number, pageSize: number): void {
    this._pageNo.set(pageNo);
    this._pageSize.set(pageSize);
    this.loadUsers();
  }

  changeSort(column: string, direction: SortDirection): void {
    this._sortColumn.set(column);
    this._sortDirection.set(direction);
    this.loadUsers();
  }

  /** Applies advanced-search criteria to the table and reloads from page 0. */
  applyFilters(filters: UserFilters): void {
    this._filters.set(filters);
    this._pageNo.set(0);
    this.loadUsers();
  }

  clearFilters(): void {
    this._filters.set({});
    this._pageNo.set(0);
    this.loadUsers();
  }

  /**
   * On success either finalizes the person (`onSuccess`, given the created/selected `UserDetail`) or,
   * if the backend found possible duplicates, populates `similarMatches` for review.
   * `onSettled` always fires once the request completes (success, similar, or error) so callers can
   * clear per-action loading state (e.g. which "select match" button was pressed).
   */
  createUser(payload: CreateUserRequest, onSuccess: (person: UserDetail) => void, onSettled?: () => void): void {
    this._saving.set(true);
    this.userService
      .createUser(payload)
      .pipe(
        tap((result) => {
          if (result.kind === 'similar') {
            const sorted = [...result.matches].sort((a, b) => b.similarity - a.similarity);
            this._similarMatches.set(sorted);
            this.snackbar.info('تم العثور على أشخاص مشابهين، يرجى مراجعتهم قبل المتابعة.');
            return;
          }
          this._similarMatches.set(null);
          this.snackbar.success('تم إنشاء المستخدم بنجاح.');
          this.loadUsers();
          onSuccess(result.person);
        }),
        catchError(() => of(null)),
        finalize(() => {
          this._saving.set(false);
          onSettled?.();
        })
      )
      .subscribe();
  }

  clearSimilarMatches(): void {
    this._similarMatches.set(null);
  }

  updateUser(id: number, payload: UpdateUserRequest, onSuccess: () => void): void {
    this._saving.set(true);
    this.userService
      .updateUser(id, payload)
      .pipe(
        tap(() => {
          this.snackbar.success('تم تحديث المستخدم بنجاح.');
          this.loadUsers();
          onSuccess();
        }),
        catchError(() => of(null)),
        finalize(() => this._saving.set(false))
      )
      .subscribe();
  }

  deleteUser(id: number, onSuccess: () => void): void {
    this._deleting.set(true);
    this.userService
      .deleteUser(id)
      .pipe(
        tap(() => {
          this.snackbar.success('تم حذف المستخدم بنجاح.');
          this.loadUsers();
          onSuccess();
        }),
        catchError(() => of(null)),
        finalize(() => this._deleting.set(false))
      )
      .subscribe();
  }
}
