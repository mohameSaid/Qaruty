import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, finalize, of, tap } from 'rxjs';

import { DashboardService } from '../services/dashboard.service';
import {
  DashboardCompetitionSummary,
  DashboardExceptionBreakdown,
  DashboardInstructorBreakdown,
} from '../models/dashboard-summary.model';

/**
 * Signal-based store for the overview dashboard. Mirrors `CompetitionsStore`/`UsersStore`,
 * but backed by a single `DashboardService.getSummary()` call (`GET /dashboard/summary` —
 * requested from the backend, see `docs/api-requests/dashboard-summary.md`; the service
 * returns fixture data until that endpoint is implemented) instead of assembling metrics
 * from several existing list endpoints on the client.
 *
 * `totalCompetitions` / `activeCompetitions` / `inactiveCompetitions` / `totalUsers` /
 * `competitions` are global and never change with the filter. Everything under
 * "participants" (`totalParticipants`, evaluated/pending, instructor/exception breakdowns)
 * is scoped to `selectedCompetitionId` — `null` means aggregated across every competition.
 */
@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private readonly dashboardService = inject(DashboardService);

  private readonly _selectedCompetitionId = signal<number | null>(null);

  private readonly _totalCompetitions = signal(0);
  private readonly _activeCompetitions = signal(0);
  private readonly _inactiveCompetitions = signal(0);
  private readonly _totalUsers = signal(0);
  private readonly _competitions = signal<DashboardCompetitionSummary[]>([]);

  private readonly _totalParticipants = signal(0);
  private readonly _evaluatedParticipants = signal(0);
  private readonly _pendingParticipants = signal(0);
  private readonly _instructorBreakdown = signal<DashboardInstructorBreakdown[]>([]);
  private readonly _exceptionBreakdown = signal<DashboardExceptionBreakdown[]>([]);

  private readonly _loading = signal(false);
  private readonly _loadError = signal(false);

  readonly selectedCompetitionId = this._selectedCompetitionId.asReadonly();

  readonly totalCompetitions = this._totalCompetitions.asReadonly();
  readonly activeCompetitions = this._activeCompetitions.asReadonly();
  readonly inactiveCompetitions = this._inactiveCompetitions.asReadonly();
  readonly totalUsers = this._totalUsers.asReadonly();
  readonly competitions = this._competitions.asReadonly();

  readonly totalParticipants = this._totalParticipants.asReadonly();
  readonly evaluatedParticipants = this._evaluatedParticipants.asReadonly();
  readonly pendingParticipants = this._pendingParticipants.asReadonly();
  readonly evaluatedPercent = computed(() =>
    this._totalParticipants() === 0
      ? 0
      : Math.round((this._evaluatedParticipants() / this._totalParticipants()) * 100)
  );
  readonly instructorBreakdown = this._instructorBreakdown.asReadonly();
  readonly exceptionBreakdown = this._exceptionBreakdown.asReadonly();

  readonly loading = this._loading.asReadonly();
  readonly loadError = this._loadError.asReadonly();

  /** Initial load — always the "all competitions" scope. */
  load(): void {
    this.fetch(null);
  }

  /** Re-scopes the participant metrics to one competition (`null` = back to "all"). */
  selectCompetition(competitionId: number | null): void {
    if (competitionId === this._selectedCompetitionId()) {
      return;
    }
    this.fetch(competitionId);
  }

  reload(): void {
    this.fetch(this._selectedCompetitionId());
  }

  private fetch(competitionId: number | null): void {
    this._loading.set(true);
    this._loadError.set(false);

    this.dashboardService
      .getSummary(competitionId)
      .pipe(
        tap((summary) => {
          this._selectedCompetitionId.set(competitionId);

          this._totalCompetitions.set(summary.totalCompetitions);
          this._activeCompetitions.set(summary.activeCompetitions);
          this._inactiveCompetitions.set(summary.inactiveCompetitions);
          this._totalUsers.set(summary.totalUsers);
          this._competitions.set(summary.competitions);

          this._totalParticipants.set(summary.participants.totalParticipants);
          this._evaluatedParticipants.set(summary.participants.evaluatedParticipants);
          this._pendingParticipants.set(summary.participants.pendingParticipants);
          this._instructorBreakdown.set(summary.participants.instructorBreakdown);
          this._exceptionBreakdown.set(summary.participants.exceptionBreakdown);
        }),
        catchError(() => {
          this._loadError.set(true);
          return of(null);
        }),
        finalize(() => this._loading.set(false))
      )
      .subscribe();
  }
}
