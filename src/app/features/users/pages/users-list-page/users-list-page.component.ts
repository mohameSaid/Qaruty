import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { catchError, finalize, of } from 'rxjs';

import { UsersStore } from '../../store/users.store';
import { UserService } from '../../services/user.service';
import { AdvancedSearchComponent } from '../../components/advanced-search/advanced-search.component';
import { UsersTableComponent } from '../../components/users-table/users-table.component';
import { UserFilters, UserListItem } from '../../models/user.model';
import { exportUsersToExcel } from '../../../../shared/utils/excel-export.util';

@Component({
  selector: 'app-users-list-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AdvancedSearchComponent,
    UsersTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './users-list-page.component.html',
  styleUrl: './users-list-page.component.scss',
})
export class UsersListPageComponent implements OnInit {
  readonly store = inject(UsersStore);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);

  readonly exporting = signal(false);

  ngOnInit(): void {
    this.store.loadUsers();
  }

  onAddUser(): void {
    this.router.navigate(['/users/new']);
  }

  onExportExcel(): void {
    this.exporting.set(true);
    const total = this.store.totalElements() || 10000;
    this.userService
      .getUsers({ pageNo: 0, size: total, sortColumn: 'id', sortDirection: 'DESC', filters: this.store.filters() })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.exporting.set(false))
      )
      .subscribe((page) => {
        if (page) {
          exportUsersToExcel(page.data ?? []);
        }
      });
  }

  onViewDetails(user: UserListItem): void {
    if (!user.id) {
      return;
    }
    this.router.navigate(['/users', user.id, 'details']);
  }

  onEditRequested(user: UserListItem): void {
    if (!user.id) {
      return;
    }
    this.router.navigate(['/users', user.id, 'edit']);
  }

  onDeactivate(user: UserListItem): void {
    this.store.deactivateUser(user.id, () => {});
  }

  onDelete(user: UserListItem): void {
    this.store.deleteUser(user.id, () => {});
  }

  onFilter(filters: UserFilters): void {
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
}

