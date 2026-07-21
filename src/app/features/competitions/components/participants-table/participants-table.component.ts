import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ParticipantListItem } from '../../models/participant.model';

@Component({
  selector: 'app-participants-table',
  standalone: true,
  imports: [
    MatCardModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participants-table.component.html',
  styleUrl: './participants-table.component.scss',
})
export class ParticipantsTableComponent {
  readonly participants = input.required<ParticipantListItem[]>();
  readonly totalElements = input<number>(0);
  readonly pageNo = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly sortColumn = input<string>('id');
  readonly sortDirection = input<'ASC' | 'DESC'>('DESC');
  readonly loading = input<boolean>(false);
  readonly isEmpty = input<boolean>(false);

  readonly page = output<PageEvent>();
  readonly sortChange = output<Sort>();
  readonly view = output<ParticipantListItem>();
  readonly evaluate = output<ParticipantListItem>();

  readonly displayedColumns = [
    // 'id',
    'name',
    // 'gender',
    'nationalId',
    'mobileNumber',
    'level',
    'instructor',
    'place',
    'partsCount',
    'score',
    // 'exceptions',
    'actions',
  ];

  /** Placeholder rows rendered while a page of data is loading. */
  readonly skeletonRowIndices = [0, 1, 2, 3, 4, 5];

  readonly matSortDirection = computed(() => this.sortDirection().toLowerCase() as 'asc' | 'desc');

  exceptionNames(participant: ParticipantListItem): string {
    if (!participant.exceptions?.length) {
      return '—';
    }
    return participant.exceptions.map((entry) => entry.exception?.name?.arabic).join('، ');
  }

  onPage(event: PageEvent): void {
    this.page.emit(event);
  }

  onSort(sort: Sort): void {
    this.sortChange.emit(sort);
  }

  onView(participant: ParticipantListItem): void {
    this.view.emit(participant);
  }

  onEvaluate(participant: ParticipantListItem): void {
    this.evaluate.emit(participant);
  }
}
