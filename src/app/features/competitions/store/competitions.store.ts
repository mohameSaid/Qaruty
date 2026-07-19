import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';
import { CompetitionService } from '../services/competition.service';
import { SnackbarService } from '../../../core/services/snackbar.service';
import { Competition } from '../models/competition.model';

/**
 * Signal-based store for the Competitions list page. Mirrors the users feature's
 * `UsersStore` pattern (see `features/users/store/users.store.ts`).
 */
@Injectable({ providedIn: 'root' })
export class CompetitionsStore {
  private readonly competitionService = inject(CompetitionService);
  private readonly snackbar = inject(SnackbarService);

  private readonly _competitions = signal<Competition[]>([]);
  private readonly _totalElements = signal(0);
  private readonly _loading = signal(false);
  /** Id of the competition currently being activated/deactivated, if any — only that card's button spins. */
  private readonly _togglingId = signal<number | null>(null);

  readonly competitions = this._competitions.asReadonly();
  readonly totalElements = this._totalElements.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly togglingId = this._togglingId.asReadonly();
  readonly isEmpty = computed(() => !this._loading() && this._competitions().length === 0);

  loadCompetitions(): void {
    this._loading.set(true);
    this.competitionService
      .getCompetitions({ pageNo: 0, size: 100, sortColumn: 'id', sortDirection: 'DESC' })
      .pipe(
        tap((page) => {
          this._competitions.set(page.data ?? []);
          this._totalElements.set(page.totalRecords ?? 0);
        }),
        catchError(() => {
          this._competitions.set([]);
          return of(null);
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  /** Flips active/inactive optimistically, then confirms against the API — reverts on failure. */
  toggleStatus(competition: Competition): void {
    const nextActive = !competition.active;
    const previous = this._competitions();

    this._competitions.set(previous.map((c) => (c.id === competition.id ? { ...c, active: nextActive } : c)));
    this._togglingId.set(competition.id);

    this.competitionService
      .updateStatus(competition.id, { active: nextActive })
      .pipe(
        tap(() => {
          this.snackbar.success(nextActive ? 'تم تفعيل المسابقة بنجاح.' : 'تم إلغاء تفعيل المسابقة بنجاح.');
        }),
        catchError(() => {
          this._competitions.set(previous);
          this.snackbar.error('تعذر تحديث حالة المسابقة، يرجى المحاولة مرة أخرى.');
          return of(null);
        }),
        finalize(() => this._togglingId.set(null))
      )
      .subscribe();
  }
}
