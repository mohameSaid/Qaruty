import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { PersonMatch } from '../../models/user.model';

@Component({
  selector: 'app-similar-persons',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './similar-persons.component.html',
  styleUrl: './similar-persons.component.scss',
})
export class SimilarPersonsComponent {
  readonly matches = input<PersonMatch[]>([]);
  /** Id of the match currently being submitted, if any — only that card shows a spinner. */
  readonly selectingId = input<number | null>(null);
  /** Whether the "continue as new" action is in flight. */
  readonly submittingNew = input<boolean>(false);
  /** True while any action is in flight — used to disable the other buttons without spinning them. */
  readonly busy = input<boolean>(false);

  readonly selectPerson = output<PersonMatch>();
  readonly continueNew = output<void>();

  similarityLevel(similarity: number): 'high' | 'medium' | 'low' {
    if (similarity >= 80) {
      return 'high';
    }
    if (similarity >= 50) {
      return 'medium';
    }
    return 'low';
  }

  onSelect(match: PersonMatch): void {
    this.selectPerson.emit(match);
  }

  onContinueNew(): void {
    this.continueNew.emit();
  }
}
