import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DashboardStore } from '../../store/dashboard.store';
import { LookupRef } from '../../../competitions/models/lookup.model';

/** `null` represents the "جميع المسابقات" (all competitions) option in the filter select. */
const ALL_COMPETITIONS = null;

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.scss',
})
export class DashboardPageComponent implements OnInit {
  readonly store = inject(DashboardStore);
  readonly allCompetitions = ALL_COMPETITIONS;

  readonly topInstructors = computed(() => this.store.instructorBreakdown().slice(0, 8));
  readonly instructorMax = computed(() => this.maxOf(this.topInstructors().map((e) => e.studentCount)));
  readonly exceptionMax = computed(() =>
    this.maxOf(this.store.exceptionBreakdown().map((e) => e.participantCount))
  );

  /** Arabic label for the currently selected filter scope, e.g. "لمسابقة: ..." or "لكل المسابقات". */
  readonly scopeLabel = computed(() => {
    const id = this.store.selectedCompetitionId();
    if (id === null) {
      return 'لكل المسابقات';
    }
    const match = this.store.competitions().find((c) => c.id === id);
    return match ? `لمسابقة: ${match.name.arabic}` : 'لكل المسابقات';
  });

  ngOnInit(): void {
    this.store.load();
  }

  onCompetitionFilterChange(competitionId: number | null): void {
    this.store.selectCompetition(competitionId);
  }

  reload(): void {
    this.store.reload();
  }

  instructorName(instructor: LookupRef | null): string {
    return instructor?.name?.arabic ?? 'بدون معلم';
  }

  instructorTooltip(entry: { instructor: LookupRef | null; studentCount: number }): string {
    return `${this.instructorName(entry.instructor)} — ${entry.studentCount} مشارك`;
  }

  exceptionTooltip(entry: { exception: { name: { arabic: string } }; participantCount: number }): string {
    return `${entry.exception.name.arabic} — ${entry.participantCount} مشارك`;
  }

  barWidth(value: number, max: number): number {
    // Never render a literal 0-width bar for a non-zero value — keep a sliver visible.
    return value === 0 ? 0 : Math.max(4, (value / max) * 100);
  }

  private maxOf(counts: number[]): number {
    return counts.reduce((max, count) => Math.max(max, count), 0) || 1;
  }
}
