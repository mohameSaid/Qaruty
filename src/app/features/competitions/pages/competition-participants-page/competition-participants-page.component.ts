import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { catchError, finalize, of, tap } from 'rxjs';

import { ParticipantsStore } from '../../store/participants.store';
import { CompetitionsLookupService } from '../../services/competitions-lookup.service';
import { ParticipantService } from '../../services/participant.service';
import { ParticipantFiltersComponent } from '../../components/participant-filters/participant-filters.component';
import { ParticipantsTableComponent } from '../../components/participants-table/participants-table.component';
import { ParticipantFilters, ParticipantListItem } from '../../models/participant.model';
import { LookupRef } from '../../models/lookup.model';
import { ParticipantExcelExportService } from '../../services/participant-excel-export.service';
import { ParticipantEditDialogComponent } from '../../components/participant-edit-dialog/participant-edit-dialog.component';
import { UpdateCompetitionRequest } from '../../../users/models/competition.model';
import { SnackbarService } from '../../../../core/services/snackbar.service';

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
  private readonly participantExcelExportService = inject(ParticipantExcelExportService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private competitionId!: number;

  readonly places = signal<LookupRef[]>([]);
  readonly instructors = signal<LookupRef[]>([]);
  readonly testers = signal<LookupRef[]>([]);
  readonly exporting = signal(false);

  ngOnInit(): void {
    this.competitionId = Number(this.route.snapshot.paramMap.get('id'));
    this.store.init(this.competitionId);
    this.loadLookups();
  }

  onExportExcel(): void {
    this.exporting.set(true);
    this.participantExcelExportService
      .export({
        competitionId: this.competitionId,
        competitionName: this.store.competition()?.name?.arabic,
        filters: this.store.filters(),
        pageSizeHint: this.store.totalElements(),
        levels: this.store.competition()?.levels ?? [],
        exceptions: this.store.competition()?.exceptions ?? [],
        places: this.places(),
        instructors: this.instructors(),
        testers: this.testers(),
      })
      .pipe(
        catchError(() => {
          this.snackbar.error('حدث خطأ أثناء تصدير ملف Excel.');
          return of(null);
        }),
        finalize(() => this.exporting.set(false))
      )
      .subscribe();
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
    this.router.navigate(['/users', id, 'evaluate-v2', participant.id]);
  }

  /** Opens the shared registration form in a modal, pre-filled to edit this participant's registration. */
  onEditParticipant(participant: ParticipantListItem): void {
    const exceptionIdList =
      participant.exceptions
        ?.map((e) => e.exception?.id)
        .filter((id): id is number => id != null) ?? [];

    const editRequest: UpdateCompetitionRequest = {
      id: participant.id,
      competitionId: this.competitionId,
      userId: participant.user?.id ?? 0,
      levelId: participant.level.id,
      partsCount: participant.partsCount,
      studyYearId: null,
      instructorId: participant.instructor?.id ?? null,
      placeId: participant.place?.id ?? null,
      exceptionIdList,
      notes: null,
    };

    const ref = this.dialog.open(ParticipantEditDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: { userId: editRequest.userId, editRequest },
    });

    ref.afterClosed().subscribe((updated) => {
      if (updated) {
        this.store.loadParticipants();
      }
    });
  }

  onDeactivateParticipant(participant: ParticipantListItem): void {
    this.participantService
      .deactivateParticipant(participant.id)
      .pipe(
        tap(() => {
          this.snackbar.success('تم إلغاء تفعيل التسجيل بنجاح.');
          this.store.loadParticipants();
        }),
        catchError(() => of(null))
      )
      .subscribe();
  }

  onActivateParticipant(participant: ParticipantListItem): void {
    this.participantService
      .activateParticipant(participant.id)
      .pipe(
        tap(() => {
          this.snackbar.success('تم إعادة تفعيل التسجيل بنجاح.');
          this.store.loadParticipants();
        }),
        catchError(() => of(null))
      )
      .subscribe();
  }

  onDeleteParticipant(participant: ParticipantListItem): void {
    this.participantService
      .deleteParticipant(participant.id)
      .pipe(
        tap(() => {
          this.snackbar.success('تم حذف التسجيل نهائيًا بنجاح.');
          this.store.loadParticipants();
        }),
        catchError(() => of(null))
      )
      .subscribe();
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

    this.lookupService
      .getTesters()
      .pipe(catchError(() => of(null)))
      .subscribe((page) => {
        if (page) {
          this.testers.set(page.data ?? []);
        }
      });
  }
}
