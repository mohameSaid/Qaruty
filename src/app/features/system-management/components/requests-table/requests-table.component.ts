import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

import { RequestListItem, requestStatusChipClass } from '../../models/request.model';

@Component({
  selector: 'app-requests-table',
  standalone: true,
  imports: [DatePipe, MatCardModule, MatTableModule, MatSortModule, MatPaginatorModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './requests-table.component.html',
  styleUrl: './requests-table.component.scss',
})
export class RequestsTableComponent {
  readonly requests = input.required<RequestListItem[]>();
  readonly totalElements = input<number>(0);
  readonly pageNo = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly sortColumn = input<string>('id');
  readonly sortDirection = input<'ASC' | 'DESC'>('DESC');
  readonly loading = input<boolean>(false);
  readonly isEmpty = input<boolean>(false);

  readonly view = output<RequestListItem>();
  readonly page = output<PageEvent>();
  readonly sortChange = output<Sort>();

  readonly displayedColumns = ['nationalId', 'type', 'status', 'createdDate', 'note'];
  readonly skeletonRowIndices = [0, 1, 2, 3, 4, 5];

  readonly matSortDirection = computed(() => this.sortDirection().toLowerCase() as 'asc' | 'desc');
  readonly statusChipClass = requestStatusChipClass;

  onView(request: RequestListItem): void {
    this.view.emit(request);
  }

  onPage(event: PageEvent): void {
    this.page.emit(event);
  }

  onSort(sort: Sort): void {
    this.sortChange.emit(sort);
  }
}
