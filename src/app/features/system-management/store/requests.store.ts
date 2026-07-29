import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';

import { RequestFilters, RequestListItem } from '../models/request.model';
import { RequestService } from '../services/request.service';

export type SortDirection = 'ASC' | 'DESC';

/** Signal-based store for the generic requests list — server-side paging, sorting and filtering. */
@Injectable({ providedIn: 'root' })
export class RequestsStore {
  private readonly service = inject(RequestService);

  private readonly _requests = signal<RequestListItem[]>([]);
  private readonly _totalElements = signal(0);
  private readonly _pageNo = signal(0);
  private readonly _pageSize = signal(10);
  private readonly _sortColumn = signal('id');
  private readonly _sortDirection = signal<SortDirection>('DESC');
  private readonly _filters = signal<RequestFilters>({});
  private readonly _loading = signal(false);

  readonly requests = this._requests.asReadonly();
  readonly totalElements = this._totalElements.asReadonly();
  readonly pageNo = this._pageNo.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly sortColumn = this._sortColumn.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly filters = this._filters.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly hasActiveFilters = computed(() =>
    Object.values(this._filters()).some((v) => v !== undefined && v !== null && v !== '')
  );
  readonly isEmpty = computed(() => !this._loading() && this._requests().length === 0);

  loadRequests(): void {
    this._loading.set(true);
    this.service
      .getRequests({
        pageNo: this._pageNo(),
        size: this._pageSize(),
        sortColumn: this._sortColumn(),
        sortDirection: this._sortDirection(),
        filters: this._filters(),
      })
      .pipe(
        tap((page) => {
          this._requests.set(page.data ?? []);
          this._totalElements.set(page.totalRecords ?? 0);
        }),
        catchError(() => {
          this._requests.set([]);
          return of(null);
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  changePage(pageNo: number, pageSize: number): void {
    this._pageNo.set(pageNo);
    this._pageSize.set(pageSize);
    this.loadRequests();
  }

  changeSort(column: string, direction: SortDirection): void {
    this._sortColumn.set(column);
    this._sortDirection.set(direction);
    this.loadRequests();
  }

  applyFilters(filters: RequestFilters): void {
    this._filters.set(filters);
    this._pageNo.set(0);
    this.loadRequests();
  }

  clearFilters(): void {
    this._filters.set({});
    this._pageNo.set(0);
    this.loadRequests();
  }
}
