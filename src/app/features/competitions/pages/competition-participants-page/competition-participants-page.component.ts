import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { catchError, finalize, of } from 'rxjs';

import { ParticipantsStore } from '../../store/participants.store';
import { CompetitionsLookupService } from '../../services/competitions-lookup.service';
import { ParticipantService } from '../../services/participant.service';
import { ParticipantFiltersComponent } from '../../components/participant-filters/participant-filters.component';
import { ParticipantsTableComponent } from '../../components/participants-table/participants-table.component';
import { ParticipantFilters, ParticipantListItem } from '../../models/participant.model';
import { LookupRef } from '../../models/lookup.model';
import { exportParticipantsToExcel } from '../../../../shared/utils/excel-export.util';

@Component({
  selector: 'app-competition-participants-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ParticipantFiltersComponent,
    ParticipantsTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './competition-participants-page.component.html',
  styleUrl: './competition-participants-page.component.scss',
})
export class CompetitionParticipantsPageComponent implements OnInit {
  readonly store = inject(ParticipantsStore);
  private readonly lookupService = inject(CompetitionsLookupService);
  private readonly participantService = inject(ParticipantService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private competitionId!: number;

  readonly places = signal<LookupRef[]>([]);
  readonly instructors = signal<LookupRef[]>([]);
  readonly exporting = signal(false);

  ngOnInit(): void {
    this.competitionId = Number(this.route.snapshot.paramMap.get('id'));
    this.store.init(this.competitionId);
    this.loadLookups();
  }

  onExportExcel(): void {
    this.exporting.set(true);
    const total = this.store.totalElements() || 10000;
    this.participantService
      .getParticipants({
        competitionId: this.competitionId,
        pageNo: 0,
        size: total,
        sortColumn: 'id',
        sortDirection: 'DESC',
        filters: this.store.filters(),
      })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.exporting.set(false))
      )
      .subscribe((page) => {
        if (page) {
          exportParticipantsToExcel(page.data ?? []);
        }
      });
  }

  onView(participant: ParticipantListItem): void {
    const id = participant.user?.id;
    if (!id) {
      return;
    }
    // Reuses the existing user-detail page for now; a dedicated participant-detail view may follow later.
    this.router.navigate(['/users', id, 'details']);
  }

  onEvaluate(participant: ParticipantListItem): void {
    const id = participant.user?.id;
    if (!id) {
      return;
    }
    this.router.navigate(['/users', id, 'evaluate', participant.id]);
  }

  onFilter(filters: ParticipantFilters): void {
    this.store.applyFilters(filters);
  }

  onClearFilters(): void {
    this.store.clearFilters();
  }

  onPage(event: PageEvent): void {
    this.store.changePage(event.pageIndex, event.pageSize);
  }

  onSortChange(sort: Sort): void {
    if (!sort.active || !sort.direction) {
      this.store.changeSort('id', 'DESC');
      return;
    }
    this.store.changeSort(sort.active, sort.direction.toUpperCase() as 'ASC' | 'DESC');
  }

  onBack(): void {
    this.router.navigate(['/competitions']);
  }

  private loadLookups(): void {
    this.lookupService
      .getPlaces()
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (page) {
          this.places.set(page.data ?? []);
        }
      });

    this.lookupService
      .getInstructors()
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (page) {
          this.instructors.set(page.data ?? []);
        }
      });
  }
}
