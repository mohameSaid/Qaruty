import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Khatmah } from '../../models/khatmah.model';
import { ProgressRingComponent } from '../progress-ring/progress-ring.component';

@Component({
  selector: 'app-khatmah-summary-header',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, ProgressRingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './khatmah-summary-header.component.html',
  styleUrl: './khatmah-summary-header.component.scss',
})
export class KhatmahSummaryHeaderComponent {
  readonly khatmah = input.required<Khatmah>();
  readonly progressPercent = input(0);
  readonly completedCount = input(0);
  readonly totalCount = input(30);
  readonly isOwner = input(false);

  readonly share = output<void>();
  readonly closeKhatmah = output<void>();
}
