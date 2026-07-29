import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Router } from '@angular/router';

import { RequestFiltersComponent } from '../../components/request-filters/request-filters.component';
import { RequestsTableComponent } from '../../components/requests-table/requests-table.component';
import { RequestFilters, RequestListItem, RequestTypeId } from '../../models/request.model';
import { RequestsStore } from '../../store/requests.store';

/** Maps a request's `type.id` to the route segment for its details page. */
const REQUEST_TYPE_DETAIL_SEGMENTS: Record<number, string> = {
  [RequestTypeId.RegistrationWithSimilarities]: 'similarities',
  [RequestTypeId.ResetPassword]: 'reset-password',
};

@Component({
  selector: 'app-requests-list-page',
  standalone: true,
  imports: [RequestFiltersComponent, RequestsTableComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './requests-list-page.component.html',
  styleUrl: './requests-list-page.component.scss',
})
export class RequestsListPageComponent implements OnInit {
  readonly store = inject(RequestsStore);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.store.loadRequests();
  }

  onFilter(filters: RequestFilters): void {
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

  onView(request: RequestListItem): void {
    const segment = REQUEST_TYPE_DETAIL_SEGMENTS[request.type.id];
    if (!segment) {
      return;
    }
    this.router.navigate(['/system-management/requests', request.id, segment]);
  }
}
