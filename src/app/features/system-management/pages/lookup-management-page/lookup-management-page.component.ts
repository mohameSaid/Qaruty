import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';

import { LookupTypeSelectorComponent } from '../../components/lookup-type-selector/lookup-type-selector.component';
import { LookupTableComponent } from '../../components/lookup-table/lookup-table.component';
import { LookupFormDialogComponent } from '../../components/lookup-form-dialog/lookup-form-dialog.component';
import { LookupItem, LookupTypeKey } from '../../models/lookup.model';
import { SystemLookupStore } from '../../store/system-lookup.store';

@Component({
  selector: 'app-lookup-management-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    LookupTypeSelectorComponent,
    LookupTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lookup-management-page.component.html',
  styleUrl: './lookup-management-page.component.scss',
})
export class LookupManagementPageComponent implements OnInit {
  readonly store = inject(SystemLookupStore);
  private readonly dialog = inject(MatDialog);

  ngOnInit(): void {
    this.store.init();
  }

  onTypeSelected(typeKey: LookupTypeKey): void {
    this.store.selectType(typeKey);
  }

  onGovernorateSelected(governorateId: number): void {
    this.store.selectGovernorate(governorateId);
  }

  onCitySelected(cityId: number): void {
    this.store.selectCity(cityId);
  }

  onAdd(): void {
    const ref = this.dialog.open(LookupFormDialogComponent, {
      data: { title: 'إضافة عنصر جديد', item: null },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.store.createItem(result);
      }
    });
  }

  onEdit(item: LookupItem): void {
    const ref = this.dialog.open(LookupFormDialogComponent, {
      data: { title: 'تعديل العنصر', item },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.store.updateItem(item.id, result);
      }
    });
  }

  onDelete(item: LookupItem): void {
    this.store.deleteItem(item.id);
  }
}
