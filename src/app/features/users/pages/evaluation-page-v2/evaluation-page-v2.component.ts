import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { catchError, finalize, of } from 'rxjs';

import { UserService } from '../../services/user.service';
import { CompetitionService } from '../../services/competition.service';
import { ExamService } from '../../services/exam.service';
import { TesterService } from '../../services/tester.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserDetail } from '../../models/user.model';
import { CompetitionHistoryItem } from '../../models/competition.model';
import { PagedData } from '../../models/api-response.model';
import { EVALUATION_QUESTIONS, MAX_QUESTION_SCORE, MAX_TOTAL_SCORE } from '../../models/evaluation.model';
import {
  ExamDetail,
  ExamQuestion,
  ExamSummary,
  ParticipantRankedGrade,
  TesterEvaluateRequest,
  TesterEvaluationEntry,
} from '../../models/exam.model';

/**
 * Score cards for the "previous history" panel: derived client-side, since
 * `CompetitionHistoryItem` has no `status`/`rank` field from the backend.
 * Thresholds are a reasonable placeholder — adjust once real pass/win rules exist.
 */
type HistoryStatus = 'pending' | 'winner' | 'passed' | 'failed';

@Component({
  selector: 'app-evaluation-page-v2',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSliderModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './evaluation-page-v2.component.html',
  styleUrl: './evaluation-page-v2.component.scss',
})
export class EvaluationPageV2Component implements OnInit {
  /** Bound from route params via withComponentInputBinding(). */
  readonly nationalId = input<string | undefined>();
  readonly competitionUserId = input<string | undefined>();

  private readonly userService = inject(UserService);
  private readonly competitionService = inject(CompetitionService);
  private readonly examService = inject(ExamService);
  private readonly testerService = inject(TesterService);
  private readonly authService = inject(AuthService);
  private readonly snackbar = inject(SnackbarService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly questions = EVALUATION_QUESTIONS;
  readonly maxQuestionScore = MAX_QUESTION_SCORE;
  private readonly baseMaxTotalScore = MAX_TOTAL_SCORE;

  readonly loading = signal(false);
  readonly loadError = signal(false);

  readonly user = signal<UserDetail | null>(null);
  readonly history = signal<CompetitionHistoryItem[]>([]);
  readonly currentEntry = signal<CompetitionHistoryItem | null>(null);

  readonly submitting = signal(false);

  readonly notes = signal('');

  /** questionId -> score (0-10); starts every question at 0. */
  readonly scores = signal<Record<string, number>>(
    Object.fromEntries(EVALUATION_QUESTIONS.map((q) => [q.id, 0]))
  );

  private readonly baseTotalScore = computed(() =>
    Object.values(this.scores()).reduce((sum, v) => sum + v, 0)
  );

  readonly age = computed(() => this.calculateAge(this.user()?.birthDate));

  readonly busy = computed(() => this.submitting());

  /* ---- Exam questions (loaded from the backend) ---- */

  readonly maxQuranQuestionScore = 10;

  readonly quranLoading = signal(false);
  readonly quranError = signal(false);
  readonly examOptions = signal<ExamSummary[]>([]);
  readonly selectedExamId = signal<number | null>(null);
  readonly quranQuestions = signal<ExamQuestion[]>([]);
  /** exam question rank -> previously submitted grade, fetched once on page entry. */
  readonly previousGrades = signal<Map<number, number>>(new Map());

  /** questionId -> score (0-10). */
  readonly quranScores = signal<Record<string, number>>({});
  /** questionIds whose answer (per its type) is currently revealed. */
  readonly revealedAnswers = signal<Set<string>>(new Set());
  /**
   * questionIds whose prompt (the question text) has been shown to the evaluator.
   * Starts empty: the evaluator asks the participant the question from memory first, and
   * only reveals the printed prompt if they need to read it out or double-check it.
   */
  readonly revealedQuestions = signal<Set<string>>(new Set());

  readonly quranTotalScore = computed(() =>
    Object.values(this.quranScores()).reduce((sum, v) => sum + v, 0)
  );
  readonly quranMaxTotalScore = computed(() => this.quranQuestions().length * this.maxQuranQuestionScore);
  readonly quranProgressPercent = computed(() =>
    this.quranMaxTotalScore() === 0
      ? 0
      : Math.min(100, (this.quranTotalScore() / this.quranMaxTotalScore()) * 100)
  );

  /**
   * Quran competitions are scored on the exam questions alone (max 100) — the fixed
   * criteria section has no UI on this page today, so it must not be added on top.
   */
  readonly maxTotalScore = computed(() =>
    this.isQuranCompetition() ? this.quranMaxTotalScore() : this.baseMaxTotalScore
  );
  readonly totalScore = computed(() =>
    this.isQuranCompetition() ? this.quranTotalScore() : this.baseTotalScore()
  );
  readonly progressPercent = computed(() =>
    this.maxTotalScore() === 0 ? 0 : Math.min(100, (this.totalScore() / this.maxTotalScore()) * 100)
  );
  readonly overLimit = computed(() => this.totalScore() > this.maxTotalScore());

  /**
   * The backend has no explicit `competition.type` field (see `CompetitionRef`) — every
   * competition Qaryati manages today is a Quran memorization competition. This checks the
   * competition/level name for a marker that would indicate otherwise (e.g. a tajweed-only
   * or oral-only track) so the section degrades gracefully if such a type is introduced
   * later, but defaults to showing the exam questions since that's the only type today.
   */
  readonly isQuranCompetition = computed(() => {
    const entry = this.currentEntry();
    if (!entry) {
      return false;
    }
    const label = `${entry.competition?.name?.arabic ?? ''} ${entry.level?.name?.arabic ?? ''}`;
    return !/تجويد فقط|أداء فقط|شفوي فقط/.test(label);
  });

  ngOnInit(): void {
    const nationalId = this.nationalId();
    const competitionUserId = Number(this.competitionUserId());

    if (!nationalId || !competitionUserId) {
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.userService
      .getUserByNationalId(nationalId)
      .pipe(
        catchError(() => {
          this.loadError.set(true);
          return of(null);
        })
      )
      .subscribe((user) => {
        if (!user) {
          this.loading.set(false);
          return;
        }
        this.user.set(user);
        this.loadHistory(user.id, competitionUserId);
      });
  }

  private loadHistory(userId: number, competitionUserId: number): void {
    this.competitionService
      .getStudentHistory(userId, { pageNo: 0, size: 50, sortColumn: 'id', sortDirection: 'DESC' })
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.loading.set(false))
      )
      .subscribe((page) => {
        const items = page?.data ?? [];
        this.history.set(items);
        const current = items.find((item) => item.id === competitionUserId) ?? null;
        this.currentEntry.set(current);
        if (!current) {
          this.loadError.set(true);
          return;
        }
        if (this.isQuranCompetition()) {
          this.loadAvailableExams(current);
        }
      });
  }

  /**
   * Fetches the participant's previously submitted grades once on page entry — `GET
   * /participant/grades?filters.participant.id=...` — so a resubmission starts from what was
   * last sent instead of blank scores. This endpoint identifies each grade only by its exam
   * question's `rank` (no question id), so it's applied by matching rank in
   * {@link applyPreviousGrades}.
   */
  private loadPreviousGrades(participantEntryId: number): void {
    this.competitionService
      .getParticipantGrades(participantEntryId, this.authService.currentUserId()!, this.selectedExamId() ?? 0)
      .pipe(catchError(() => of<ParticipantRankedGrade[]>([])))
      .subscribe((grades) => {
        this.previousGrades.set(new Map(grades.map((g) => [g.rank, g.grade])));
        this.applyPreviousGrades();
      });
  }

  /** Overlays any previously submitted grades onto the currently loaded exam questions, matched by rank. */
  private applyPreviousGrades(): void {
    const previous = this.previousGrades();
    const questions = this.quranQuestions();
    if (previous.size === 0 || questions.length === 0) {
      return;
    }
    this.quranScores.update((current) => {
      const next = { ...current };
      for (const q of questions) {
        if (previous.has(q.rank)) {
          next[q.id] = previous.get(q.rank)!;
        }
      }
      return next;
    });
  }

  /**
   * Loads the exams available to the current tester for the participant's competition+level
   * (`GET /exam?filters.testers.id=...&filters.competitionLevels.competition.id=...
   * &filters.competitionLevels.level.id=...`) and auto-selects the first one so questions
   * appear without an extra click; the evaluator can still switch exams via `onExamChange`.
   */
  private loadAvailableExams(current: CompetitionHistoryItem): void {
    const testerId = this.authService.currentUserId();
    if (!testerId) {
      this.quranError.set(true);
      return;
    }

    this.quranLoading.set(true);
    this.quranError.set(false);

    this.examService
      .getAvailableExams(testerId, current.competition.id, current.level.id)
      .pipe(
        catchError(() => {
          this.quranError.set(true);
          return of<PagedData<ExamSummary>>({ data: [], totalRecords: 0 });
        })
      )
      .subscribe((page) => {
        this.examOptions.set(page.data);
        if (page.data.length > 0) {
          this.selectedExamId.set(page.data[0].id);
          this.loadExamQuestions(page.data[0].id);
          this.loadPreviousGrades(current.id);
        } else {
          this.selectedExamId.set(null);
          this.quranQuestions.set([]);
          this.quranScores.set({});
          this.quranLoading.set(false);
        }
      });
  }

  /** Called when the evaluator picks a different exam from the dropdown. */
  onExamChange(examId: number): void {
    this.selectedExamId.set(examId);
    this.loadExamQuestions(examId);
  }

  /** Loads the chosen exam's questions, sorted by rank — `GET /exam/{examId}`. */
  private loadExamQuestions(examId: number): void {
    this.quranLoading.set(true);
    this.quranError.set(false);

    this.examService
      .getExamById(examId)
      .pipe(
        catchError(() => {
          this.quranError.set(true);
          return of<ExamDetail | null>(null);
        }),
        finalize(() => this.quranLoading.set(false))
      )
      .subscribe((exam) => {
        const questions = (exam?.questions ?? []).slice().sort((a, b) => a.rank - b.rank);
        this.quranQuestions.set(questions);
        this.quranScores.set(Object.fromEntries(questions.map((q) => [q.id, 0])));
        this.revealedAnswers.set(new Set());
        this.revealedQuestions.set(new Set());
        this.applyPreviousGrades();
      });
  }

  setScore(questionId: string, value: number): void {
    const clamped = Math.max(0, Math.min(this.maxQuestionScore, Math.round(value)));
    this.scores.update((current) => ({ ...current, [questionId]: clamped }));
  }

  setQuranScore(questionId: number, value: number): void {
    const clamped = Math.max(0, Math.min(this.maxQuranQuestionScore, Math.round(value)));
    this.quranScores.update((current) => ({ ...current, [questionId]: clamped }));
  }

  toggleAnswer(questionId: number): void {
    this.revealedAnswers.update((current) => {
      const next = new Set(current);
      const key = String(questionId);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isAnswerRevealed(questionId: number): boolean {
    return this.revealedAnswers().has(String(questionId));
  }

  toggleQuestion(questionId: number): void {
    this.revealedQuestions.update((current) => {
      const next = new Set(current);
      const key = String(questionId);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  isQuestionRevealed(questionId: number): boolean {
    return this.revealedQuestions().has(String(questionId));
  }

  scoreLevel(score: number): 'low' | 'high' | 'mid' {
    if (score <= 5) {
      return 'low';
    }
    if (score >= 9) {
      return 'high';
    }
    return 'mid';
  }

  historyStatus(item: CompetitionHistoryItem): HistoryStatus {
    if (item.score === null || item.score === undefined) {
      return 'pending';
    }
    if (item.score >= 90) {
      return 'winner';
    }
    return item.score >= 50 ? 'passed' : 'failed';
  }

  historyStatusLabel(status: HistoryStatus): string {
    switch (status) {
      case 'winner':
        return 'الفائز';
      case 'passed':
        return 'ناجح';
      case 'failed':
        return 'راسب';
      default:
        return 'بانتظار التقييم';
    }
  }

  submitEvaluation(): void {
    if (this.overLimit()) {
      this.snackbar.error('لا يمكن إرسال التقييم — المجموع يتجاوز 100.');
      return;
    }
    this.persist();
  }

  onCancel(): void {
    const hasProgress = this.totalScore() > 0 || this.notes().trim().length > 0;
    if (!hasProgress) {
      this.goToCompetitionParticipants();
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'إلغاء التقييم',
        message: 'سيتم فقدان الدرجات والملاحظات غير المحفوظة. هل تريد المتابعة؟',
        confirmLabel: 'نعم، إلغاء',
        cancelLabel: 'متابعة التقييم',
      },
    });
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.goToCompetitionParticipants();
      }
    });
  }

  private persist(): void {
    const participant = this.currentEntry();
    const testerId = this.authService.currentUserId();
    if (!participant || !testerId) {
      return;
    }

    this.submitting.set(true);

    const grades: TesterEvaluationEntry[] = this.quranQuestions().map((q) => ({
      examQuestionId: q.id,
      grade: this.quranScores()[q.id] ?? 0,
    }));

    const payload: TesterEvaluateRequest = {
      participantId: participant.id,
      grades,
    };

    this.testerService
      .submitEvaluation(testerId, payload)
      .pipe(
        catchError(() => of(null)),
        finalize(() => this.submitting.set(false))
      )
      .subscribe((result) => {
        if (result === undefined) {
          this.snackbar.success('تم إرسال التقييم بنجاح.');
          this.goToCompetitionParticipants();
        }
      });
  }

  /** After a successful submission (or on cancel), return to the competition's participants list. */
  private goToCompetitionParticipants(): void {
    const competitionId = this.currentEntry()?.competition.id;
    if (competitionId) {
      this.router.navigate(['/competitions', competitionId, 'participants']);
    } else {
      this.goBack();
    }
  }

  private goBack(): void {
    const id = this.nationalId();
    if (id) {
      this.router.navigate(['/users', id, 'details']);
    } else {
      this.router.navigate(['/users']);
    }
  }

  private calculateAge(birthDate: string | undefined | null): number | null {
    if (!birthDate) {
      return null;
    }
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) {
      return null;
    }
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }
}
