import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LookupItem } from '../../models/lookup.model';

@Component({
  selector: 'app-lookup-table',
  standalone: true,
  imports: [MatCardModule, MatTableModule, MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lookup-table.component.html',
  styleUrl: './lookup-table.component.scss',
})
export class LookupTableComponent {
  private readonly dialog = inject(MatDialog);

  readonly items = input.required<LookupItem[]>();
  readonly loading = input<boolean>(false);
  readonly isEmpty = input<boolean>(false);

  readonly edit = output<LookupItem>();
  readonly delete = output<LookupItem>();

  readonly displayedColumns = ['id', 'arabicName', 'englishName', 'actions'];
  readonly skeletonRowIndices = [0, 1, 2];

  onEdit(item: LookupItem): void {
    this.edit.emit(item);
  }

  onDelete(item: LookupItem): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'حذف العنصر',
        message: `هل أنت متأكد من حذف "${item.name.arabic}"؟`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete.emit(item);
      }
    });
  }
}
