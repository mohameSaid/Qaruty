import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

export interface BreadcrumbItem {
  label: string;
  link?: string | (string | number)[];
}

@Component({
  selector: 'app-khatmah-breadcrumb',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="khatmah-breadcrumb" aria-label="مسار التنقل">
      @for (item of items(); track $index; let last = $last) {
        @if (!last && item.link) {
          <a [routerLink]="item.link" class="khatmah-breadcrumb__link">{{ item.label }}</a>
          <mat-icon class="khatmah-breadcrumb__sep" aria-hidden="true">chevron_left</mat-icon>
        } @else {
          <span class="khatmah-breadcrumb__current">{{ item.label }}</span>
        }
      }
    </nav>
  `,
  styleUrl: './khatmah-breadcrumb.component.scss',
})
export class KhatmahBreadcrumbComponent {
  readonly items = input.required<BreadcrumbItem[]>();
}
