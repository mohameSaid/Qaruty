import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ParticipantListItem, ParticipantWithGrades } from '../../models/participant.model';
import { HasPermissionDirective } from '../../../../core/directives/has-permission.directive';
import { Permission } from '../../../../core/models/permission.model';
import { Role } from '../../../../core/models/role.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

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
    MatMenuModule,
    MatTooltipModule,
    HasPermissionDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participants-table.component.html',
  styleUrl: './participants-table.component.scss',
})
export class ParticipantsTableComponent {
  readonly Permission = Permission;
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(AuthService);

  readonly participants = input.required<ParticipantWithGrades[]>();
  readonly totalElements = input<number>(0);
  readonly pageNo = input<number>(0);
  readonly pageSize = input<number>(10);
  readonly sortColumn = input<string>('id');
  readonly sortDirection = input<'ASC' | 'DESC'>('DESC');
  readonly loading = input<boolean>(false);
  readonly isEmpty = input<boolean>(false);
  /** When the competition is inactive, every row action except "evaluate" is hidden — unless the user is an admin. */
  readonly competitionActive = input<boolean>(true);

  readonly isAdmin = computed(() => this.auth.hasRole(Role.Admin));

  readonly page = output<PageEvent>();
  readonly sortChange = output<Sort>();
  readonly view = output<ParticipantListItem>();
  readonly evaluate = output<ParticipantListItem>();
  readonly edit = output<ParticipantListItem>();
  readonly deactivate = output<ParticipantListItem>();
  readonly activate = output<ParticipantListItem>();
  readonly delete = output<ParticipantListItem>();

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
    'gradesDetail',
    // 'exceptions',
    'actions',
  ];

  /** Placeholder rows rendered while a page of data is loading. */
  readonly skeletonRowIndices = [0, 1, 2, 3, 4, 5];

  readonly matSortDirection = computed(() => this.sortDirection().toLowerCase() as 'asc' | 'desc');

  /** Admins can always act; everyone else needs the competition active *and* one of the given permissions. */
  canPerform(perms: Permission | Permission[]): boolean {
    if (this.isAdmin()) {
      return true;
    }
    if (!this.competitionActive()) {
      return false;
    }
    const list = Array.isArray(perms) ? perms : [perms];
    return list.some((perm) => this.auth.hasPermission(perm));
  }

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

  onEditItem(participant: ParticipantListItem): void {
    this.edit.emit(participant);
  }

  onDeactivate(participant: ParticipantListItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'إلغاء تفعيل التسجيل',
        message: `هل أنت متأكد من إلغاء تفعيل تسجيل "${participant.user?.name?.arabic ?? ''}"؟`,
        confirmLabel: 'إلغاء التفعيل',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.deactivate.emit(participant);
      }
    });
  }

  onActivate(participant: ParticipantListItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'تفعيل التسجيل',
        message: `هل أنت متأكد من إعادة تفعيل تسجيل "${participant.user?.name?.arabic ?? ''}"؟`,
        confirmLabel: 'تفعيل',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.activate.emit(participant);
      }
    });
  }

  onDelete(participant: ParticipantListItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'حذف التسجيل',
        message: `هل أنت متأكد من حذف تسجيل "${participant.user?.name?.arabic ?? ''}" نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete.emit(participant);
      }
    });
  }
}
