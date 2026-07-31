import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize, of } from 'rxjs';

import { CompetitionService } from '../../services/competition.service';
import { ParticipantEvaluationDetail } from '../../models/exam.model';

interface ResultQuestionRow {
  questionId: number;
  rank: number;
  name: string;
  grade: number;
}

interface ExamResultGroup {
  examId: number;
  examName: string;
  entries: ResultQuestionRow[];
  total: number;
  max: number;
}

/** Read-only results screen: shows a participant's previously submitted exam grades, per exam, per question. */
@Component({
  selector: 'app-participant-result-page',
  standalone: true,
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './participant-result-page.component.html',
  styleUrl: './participant-result-page.component.scss',
})
export class ParticipantResultPageComponent implements OnInit {
  /** Bound from route params via withComponentInputBinding(). */
  readonly nationalId = input<string | undefined>();
  readonly competitionUserId = input<string | undefined>();

  private readonly competitionService = inject(CompetitionService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly loadError = signal(false);
  readonly detail = signal<ParticipantEvaluationDetail | null>(null);

  readonly examGroups = computed<ExamResultGroup[]>(() => {
    const detail = this.detail();
    if (!detail) {
      return [];
    }

    const groups = new Map<number, ExamResultGroup>();
    for (const entry of detail.grades) {
      const { exam, question } = entry.examQuestion;
      let group = groups.get(exam.id);
      if (!group) {
        group = { examId: exam.id, examName: exam.name.arabic, entries: [], total: 0, max: 0 };
        groups.set(exam.id, group);
      }
      group.entries.push({
        questionId: question.id,
        rank: question.rank,
        name: question.name.arabic,
        grade: entry.grade,
      });
      group.total += entry.grade;
      group.max += 10;
    }

    return Array.from(groups.values())
      .map((group) => ({ ...group, entries: group.entries.slice().sort((a, b) => a.rank - b.rank) }))
      .sort((a, b) => a.examId - b.examId);
  });

  ngOnInit(): void {
    const competitionUserId = Number(this.competitionUserId());
    if (!competitionUserId) {
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.competitionService
      .getParticipantEvaluation(competitionUserId)
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe((detail) => {
        if (detail) {
          this.detail.set(detail);
        } else {
          this.loadError.set(true);
        }
      });
  }

  onBack(): void {
    const id = this.nationalId();
    if (id) {
      this.router.navigate(['/users', id, 'details']);
    } else {
      this.router.navigate(['/users']);
    }
  }
}
