import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { UserListItem } from '../../models/user.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-users-table',
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
  templateUrl: './users-table.component.html',
  styleUrl: './users-table.component.scss',
})
export class UsersTableComponent {
  private readonly dialog = inject(MatDialog);

  readonly users = input.required<UserListItem[]>();
  readonly totalElements = input<number>(0);
  readonly pageNo = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly loading = input<boolean>(false);
  readonly deleting = input<boolean>(false);
  readonly isEmpty = input<boolean>(false);

  readonly view = output<UserListItem>();
  readonly edit = output<UserListItem>();
  readonly delete = output<UserListItem>();
  readonly page = output<PageEvent>();
  readonly sortChange = output<Sort>();

  readonly displayedColumns = [
    'id',
    'nationalId',
    'arabicName',
    'englishName',
    'birthDate',
    'email',
    'mobile',
    'actions',
  ];

  /** Placeholder rows rendered while a page of data is loading. */
  readonly skeletonRowIndices = [0, 1, 2, 3, 4, 5];

  onView(user: UserListItem): void {
    if (!user.id) {
      return;
    }
    this.view.emit(user);
  }

  onEdit(user: UserListItem): void {
    if (!user.id) {
      return;
    }
    this.edit.emit(user);
  }

  onDelete(user: UserListItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'حذف المستخدم',
        message: `هل أنت متأكد من حذف "${user.name.arabic}"؟ لا يمكن التراجع عن هذا الإجراء.`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete.emit(user);
      }
    });
  }

  onPage(event: PageEvent): void {
    this.page.emit(event);
  }

  onSort(sort: Sort): void {
    this.sortChange.emit(sort);
  }
}
