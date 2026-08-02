import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Circular SVG progress indicator (0-100%) with the percentage rendered in the center. */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="progress-ring" [attr.width]="size()" [attr.height]="size()" viewBox="0 0 100 100">
      <circle class="progress-ring__track" cx="50" cy="50" [attr.r]="radius" />
      <circle
        class="progress-ring__fill"
        cx="50"
        cy="50"
        [attr.r]="radius"
        [attr.stroke-dasharray]="circumference"
        [attr.stroke-dashoffset]="dashOffset()"
      />
    </svg>
    <div class="progress-ring__label">
      <span class="progress-ring__percent">{{ percent() }}%</span>
      @if (caption()) {
        <span class="progress-ring__caption">{{ caption() }}</span>
      }
    </div>
  `,
  styleUrl: './progress-ring.component.scss',
})
export class ProgressRingComponent {
  readonly percent = input(0);
  readonly caption = input<string | null>(null);
  readonly size = input(120);

  protected readonly radius = 42;
  protected readonly circumference = 2 * Math.PI * this.radius;

  protected readonly dashOffset = computed(() => this.circumference * (1 - this.percent() / 100));
}
