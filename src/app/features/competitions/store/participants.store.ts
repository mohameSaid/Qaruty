import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';
import { ParticipantService } from '../services/participant.service';
import { CompetitionService } from '../services/competition.service';
import { Competition } from '../models/competition.model';
import { ParticipantFilters, ParticipantListItem } from '../models/participant.model';

export type SortDirection = 'ASC' | 'DESC';

/**
 * Signal-based store for a single competition's participants table — server-side paging,
 * sorting and filtering. Mirrors `features/users/store/users.store.ts`.
 */
@Injectable({ providedIn: 'root' })
export class ParticipantsStore {
  private readonly participantService = inject(ParticipantService);
  private readonly competitionService = inject(CompetitionService);

  private readonly _competitionId = signal<number | null>(null);
  private readonly _competition = signal<Competition | null>(null);

  private readonly _participants = signal<ParticipantListItem[]>([]);
  private readonly _totalElements = signal(0);
  private readonly _pageNo = signal(0);
  private readonly _pageSize = signal(10);
  private readonly _sortColumn = signal('id');
  private readonly _sortDirection = signal<SortDirection>('DESC');
  private readonly _filters = signal<ParticipantFilters>({});

  private readonly _loading = signal(false);
  private readonly _loadingCompetition = signal(false);

  readonly competition = this._competition.asReadonly();
  readonly loadingCompetition = this._loadingCompetition.asReadonly();

  readonly participants = this._participants.asReadonly();
  readonly totalElements = this._totalElements.asReadonly();
  readonly pageNo = this._pageNo.asReadonly();
  readonly pageSize = this._pageSize.asReadonly();
  readonly sortColumn = this._sortColumn.asReadonly();
  readonly sortDirection = this._sortDirection.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly filters = this._filters.asReadonly();

  readonly hasActiveFilters = computed(() =>
    Object.values(this._filters()).some((v) => v !== undefined && v !== null && v !== '' && v !== false)
  );
  readonly isEmpty = computed(() => !this._loading() && this._participants().length === 0);

  /** Resets and loads everything for the given competition — call once from the page's ngOnInit. */
  init(competitionId: number): void {
    if (this._competitionId() === competitionId) {
      return;
    }
    this._competitionId.set(competitionId);
    this._pageNo.set(0);
    this._sortColumn.set('id');
    this._sortDirection.set('DESC');
    this._filters.set({});
    this.loadCompetition();
    this.loadParticipants();
  }

  private loadCompetition(): void {
    const competitionId = this._competitionId();
    if (competitionId == null) {
      return;
    }
    this._loadingCompetition.set(true);
    this.competitionService
      .getCompetitionById(competitionId)
      .pipe(
        tap((competition) => this._competition.set(competition)),
        catchError(() => {
          this._competition.set(null);
          return of(null);
        }),
        finalize(() => this._loadingCompetition.set(false))
      )
      .subscribe();
  }

  loadParticipants(): void {
    const competitionId = this._competitionId();
    if (competitionId == null) {
      return;
    }
    this._loading.set(true);
    this.participantService
      .getParticipants({
        competitionId,
        pageNo: this._pageNo(),
        size: this._pageSize(),
        sortColumn: this._sortColumn(),
        sortDirection: this._sortDirection(),
        filters: this._filters(),
      })
      .pipe(
        tap((page) => {
          this._participants.set(page.data ?? []);
          this._totalElements.set(page.totalRecords ?? 0);
        }),
        catchError(() => {
          this._participants.set([]);
          return of(null);
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }

  changePage(pageNo: number, pageSize: number): void {
    this._pageNo.set(pageNo);
    this._pageSize.set(pageSize);
    this.loadParticipants();
  }

  changeSort(column: string, direction: SortDirection): void {
    this._sortColumn.set(column);
    this._sortDirection.set(direction);
    this.loadParticipants();
  }

  applyFilters(filters: ParticipantFilters): void {
    this._filters.set(filters);
    this._pageNo.set(0);
    this.loadParticipants();
  }

  clearFilters(): void {
    this._filters.set({});
    this._pageNo.set(0);
    this.loadParticipants();
  }
}
