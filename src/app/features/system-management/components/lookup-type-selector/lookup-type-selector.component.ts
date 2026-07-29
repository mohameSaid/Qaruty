import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatListModule } from '@angular/material/list';

import { LookupTypeConfig, LookupTypeKey } from '../../models/lookup.model';

@Component({
  selector: 'app-lookup-type-selector',
  standalone: true,
  imports: [MatListModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-nav-list class="type-list">
      @for (type of types(); track type.key) {
        <a
          mat-list-item
          [class.selected]="type.key === selectedTypeKey()"
          (click)="typeSelected.emit(type.key)"
        >
          {{ type.label }}
        </a>
      }
    </mat-nav-list>
  `,
  styles: [
    `
      .type-list a.selected {
        background: var(--mat-sys-secondary-container, rgba(0, 0, 0, 0.06));
        font-weight: 600;
      }
    `,
  ],
})
export class LookupTypeSelectorComponent {
  readonly types = input.required<LookupTypeConfig[]>();
  readonly selectedTypeKey = input<LookupTypeKey | null>(null);

  readonly typeSelected = output<LookupTypeKey>();
}
