import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { Part } from '../../models/part.model';
import { JUZ_LABELS } from '../../data/juz-labels';
import { PartCardComponent } from '../part-card/part-card.component';

@Component({
  selector: 'app-parts-board',
  standalone: true,
  imports: [PartCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './parts-board.component.html',
  styleUrl: './parts-board.component.scss',
})
export class PartsBoardComponent {
  readonly parts = input.required<Part[]>();
  readonly myPartIds = input<string[]>([]);
  readonly isOwner = input(false);

  readonly reserve = output<Part>();
  readonly openReader = output<Part>();
  readonly cancel = output<Part>();
  readonly adminRelease = output<Part>();

  readonly juzLabels = JUZ_LABELS;

  isMine(part: Part): boolean {
    return this.myPartIds().includes(part.id);
  }

  juzLabelFor(part: Part) {
    return this.juzLabels[part.part_number - 1];
  }
}
