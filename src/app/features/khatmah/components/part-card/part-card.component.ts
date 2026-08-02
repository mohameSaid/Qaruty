import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Part } from '../../models/part.model';
import { JuzLabel } from '../../data/juz-labels';

@Component({
  selector: 'app-part-card',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './part-card.component.html',
  styleUrl: './part-card.component.scss',
})
export class PartCardComponent {
  readonly part = input.required<Part>();
  readonly juzLabel = input.required<JuzLabel>();
  readonly isMine = input(false);
  readonly isOwner = input(false);

  readonly reserve = output<void>();
  readonly openReader = output<void>();
  readonly cancel = output<void>();
  readonly adminRelease = output<void>();

  protected readonly statusIcon = computed(() => {
    switch (this.part().status) {
      case 'available':
        return 'add_circle_outline';
      case 'reserved':
        return 'schedule';
      case 'reading':
        return 'menu_book';
      case 'completed':
        return 'check_circle';
    }
  });

  protected readonly statusLabel = computed(() => {
    switch (this.part().status) {
      case 'available':
        return 'متاح';
      case 'reserved':
        return 'محجوز';
      case 'reading':
        return 'يقرأ الآن';
      case 'completed':
        return 'مكتمل';
    }
  });
}
