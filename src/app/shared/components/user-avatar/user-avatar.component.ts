import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Generic default avatar keyed off a gender lookup id (1 = male, 2 = female) — no feature-specific model dependency. */
@Component({
  selector: 'app-user-avatar',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="user-avatar" [class.user-avatar--female]="isFemale()" [style.--avatar-size.px]="size()">
      <mat-icon>{{ isFemale() ? 'woman' : 'man' }}</mat-icon>
    </div>
  `,
  styleUrl: './user-avatar.component.scss',
})
export class UserAvatarComponent {
  /** Gender lookup id: 1 = male, 2 = female. Defaults to the male avatar when unknown. */
  readonly genderId = input<number | null>(null);
  readonly size = input<number>(96);

  readonly isFemale = computed(() => this.genderId() === 2);
}
