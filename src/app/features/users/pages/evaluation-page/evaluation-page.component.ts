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
import { EvaluationService } from '../../services/evaluation.service';
import { QuranService } from '../../../../shared/services/quran.service';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UserDetail } from '../../models/user.model';
import { CompetitionHistoryItem } from '../../models/competition.model';
import {
  EVALUATION_QUESTIONS,
  EvaluationScoreEntry,
  MAX_QUESTION_SCORE,
  MAX_TOTAL_SCORE,
  QuranEvaluationEntry,
  SubmitEvaluationRequest,
} from '../../models/evaluation.model';
import {
  QURAN_MAX_QUESTION_SCORE,
  QURAN_QUESTION_TYPE_LABELS,
  QuranModelOption,
  QuranQuestion,
} from '../../models/quran.model';

/**
 * Score cards for the "previous history" panel: derived client-side, since
 * `CompetitionHistoryItem` has no `status`/`rank` field from the backend.
 * Thresholds are a reasonable placeholder — adjust once real pass/win rules exist.
 */
type HistoryStatus = 'pending' | 'winner' | 'passed' | 'failed';

@Component({
  selector: 'app-evaluation-page',
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
  templateUrl: './evaluation-page.component.html',
  styleUrl: './evaluation-page.component.scss',
})
export class EvaluationPageComponent implements OnInit {
  /** Bound from route params via withComponentInputBinding(). */
  readonly nationalId = input<string | undefined>();
  readonly competitionUserId = input<string | undefined>();

  private readonly userService = inject(UserService);
  private readonly competitionService = inject(CompetitionService);
  private readonly evaluationService = inject(EvaluationService);
  private readonly quranService = inject(QuranService);
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

  readonly savingDraft = signal(false);
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

  readonly busy = computed(() => this.savingDraft() || this.submitting());

  /* ---- Quran memorization questions ---- */

  readonly maxQuranQuestionScore = QURAN_MAX_QUESTION_SCORE;

  readonly quranLoading = signal(false);
  readonly quranError = signal(false);
  readonly quranQuestions = signal<QuranQuestion[]>([]);
  readonly quranModelOptions = signal<QuranModelOption[]>([]);
  readonly selectedModelNumber = signal<number | null>(null);

  /** questionId -> score (0-10). */
  readonly quranScores = signal<Record<string, number>>({});
  /** questionId -> evaluator notes. */
  readonly quranNotes = signal<Record<string, string>>({});
  /** questionIds whose answer (per its type) is currently revealed. */
  readonly revealedAnswers = signal<Set<string>>(new Set());
  /**
   * questionIds whose prompt (the ayah text / instruction) has been shown to the evaluator.
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
   * Quran competitions are scored on the 10 memorization questions alone (max 100) — the
   * fixed criteria section has no UI on this page today, so it must not be added on top.
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
   * later, but defaults to showing the Quran questions since that's the only type today.
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
          this.loadQuranModels(current);
        }
      });
  }

  /**
   * Loads the available exam-sheet models for the participant's level
   * (`current.level.id`, matching `levelId` in `quran_competition_data.json`) and
   * auto-selects the first one so questions appear without an extra click; the
   * evaluator can still switch models via `onModelChange`.
   */
  private loadQuranModels(current: CompetitionHistoryItem): void {
    this.quranLoading.set(true);
    this.quranError.set(false);

    this.quranService
      .getModelOptions(current.level.id)
      .pipe(
        catchError(() => {
          this.quranError.set(true);
          return of<QuranModelOption[]>([]);
        })
      )
      .subscribe((options) => {
        this.quranModelOptions.set(options);
        if (options.length > 0) {
          this.selectedModelNumber.set(options[0].modelNumber);
          this.generateQuranQuestions(current.level.id, options[0].modelNumber);
        } else {
          this.selectedModelNumber.set(null);
          this.quranQuestions.set([]);
          this.quranScores.set({});
          this.quranNotes.set({});
          this.quranLoading.set(false);
        }
      });
  }

  /** Called when the evaluator picks a different model from the dropdown. */
  onModelChange(modelNumber: number): void {
    const entry = this.currentEntry();
    if (!entry) {
      return;
    }
    this.selectedModelNumber.set(modelNumber);
    this.generateQuranQuestions(entry.level.id, modelNumber);
  }

  /** Generates the 10 fixed questions from the chosen level+model exam sheet. */
  private generateQuranQuestions(levelId: number, modelNumber: number): void {
    this.quranLoading.set(true);
    this.quranError.set(false);

    this.quranService
      .generateQuestionsFromModel(levelId, modelNumber)
      .pipe(
        catchError(() => {
          this.quranError.set(true);
          return of<QuranQuestion[]>([]);
        }),
        finalize(() => this.quranLoading.set(false))
      )
      .subscribe((questions) => {
        this.quranQuestions.set(questions);
        this.quranScores.set(Object.fromEntries(questions.map((q) => [q.id, 0])));
        this.quranNotes.set(Object.fromEntries(questions.map((q) => [q.id, ''])));
        this.revealedAnswers.set(new Set());
        this.revealedQuestions.set(new Set());
      });
  }

  setScore(questionId: string, value: number): void {
    const clamped = Math.max(0, Math.min(this.maxQuestionScore, Math.round(value)));
    this.scores.update((current) => ({ ...current, [questionId]: clamped }));
  }

  setQuranScore(questionId: string, value: number): void {
    const clamped = Math.max(0, Math.min(this.maxQuranQuestionScore, Math.round(value)));
    this.quranScores.update((current) => ({ ...current, [questionId]: clamped }));
  }

  setQuranNotes(questionId: string, value: string): void {
    this.quranNotes.update((current) => ({ ...current, [questionId]: value }));
  }

  toggleAnswer(questionId: string): void {
    this.revealedAnswers.update((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  isAnswerRevealed(questionId: string): boolean {
    return this.revealedAnswers().has(questionId);
  }

  toggleQuestion(questionId: string): void {
    this.revealedQuestions.update((current) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }

  isQuestionRevealed(questionId: string): boolean {
    return this.revealedQuestions().has(questionId);
  }

  readonly quranQuestionTypeLabel = QURAN_QUESTION_TYPE_LABELS;

  /** Arabic instruction shown above the question, describing what the participant must do. */
  quranQuestionInstruction(question: QuranQuestion): string {
    switch (question.type) {
      case 'CONTINUE_NEXT':
        return 'يُطلب من المتسابق إكمال تلاوة الآيات التالية لهذه الآية حفظًا.';
      case 'CONTINUE_AFTER_GAP':
        return `يُطلب من المتسابق تخطي ${question.gapCount} آيات بعد هذه الآية ثم إكمال التلاوة من الآية التالية لها.`;
      case 'IDENTIFY_SURAH':
        return 'يُطلب من المتسابق تحديد اسم السورة التي وردت فيها هذه الآية.';
      case 'IDENTIFY_AYAH_NUMBER':
        return 'يُطلب من المتسابق تحديد رقم هذه الآية داخل سورتها.';
      case 'START_FROM_AYAH':
        return `يُطلب من المتسابق البدء بالتلاوة حفظًا من سورة ${question.suraName} — الآية ${question.ayaIndex}.`;
      case 'MENTION_ADJACENT_AYAH':
        return question.direction === 'before'
          ? 'يُطلب من المتسابق ذكر الآية التي تسبق هذه الآية.'
          : 'يُطلب من المتسابق ذكر الآية التي تلي هذه الآية.';
    }
  }

  /** Human-readable description of the expected answer, shown once the evaluator reveals it. */
  quranAnswerRangeLabel(question: QuranQuestion): string {
    switch (question.type) {
      case 'IDENTIFY_SURAH':
        return `اسم السورة: ${question.suraName}`;
      case 'IDENTIFY_AYAH_NUMBER':
        return `رقم الآية: ${question.ayaIndex}`;
      case 'MENTION_ADJACENT_AYAH': {
        const neighbor = question.answerAyahs[0];
        if (!neighbor) {
          return '';
        }
        const label = question.direction === 'before' ? 'الآية السابقة' : 'الآية التالية';
        return `${label} (سورة ${neighbor.suraName} — الآية ${neighbor.ayaIndex})`;
      }
      default: {
        const first = question.answerAyahs[0];
        const last = question.answerAyahs[question.answerAyahs.length - 1];
        if (!first || !last) {
          return '';
        }
        if (last.suraIndex === first.suraIndex) {
          return `من الآية ${first.ayaIndex} إلى الآية ${last.ayaIndex} — سورة ${first.suraName}`;
        }
        return `من الآية ${first.ayaIndex} (سورة ${first.suraName}) حتى الآية ${last.ayaIndex} (سورة ${last.suraName})`;
      }
    }
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

  saveDraft(): void {
    this.persist('DRAFT');
  }

  submitEvaluation(): void {
    if (this.overLimit()) {
      this.snackbar.error('لا يمكن إرسال التقييم — المجموع يتجاوز 100.');
      return;
    }
    this.persist('SUBMITTED');
  }

  onCancel(): void {
    const hasProgress = this.totalScore() > 0 || this.notes().trim().length > 0;
    if (!hasProgress) {
      this.goBack();
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
        this.goBack();
      }
    });
  }

  private persist(status: 'DRAFT' | 'SUBMITTED'): void {
    const entry = this.currentEntry();
    if (!entry) {
      return;
    }

    const busySignal = status === 'DRAFT' ? this.savingDraft : this.submitting;
    busySignal.set(true);

    const scoreEntries: EvaluationScoreEntry[] = this.questions.map((q) => ({
      questionId: q.id,
      score: this.scores()[q.id] ?? 0,
    }));

    const quranEvaluations: QuranEvaluationEntry[] | undefined = this.isQuranCompetition()
      ? this.quranQuestions().map((q) => ({
          questionId: q.id,
          suraName: q.suraName,
          ayaIndex: q.ayaIndex,
          score: this.quranScores()[q.id] ?? 0,
          notes: this.quranNotes()[q.id] ?? '',
        }))
      : undefined;

    const payload: SubmitEvaluationRequest = {
      competitionUserId: entry.id,
      scores: scoreEntries,
      totalScore: this.totalScore(),
      notes: this.notes(),
      status,
      ...(quranEvaluations && quranEvaluations.length > 0 ? { quranEvaluations } : {}),
    };

    this.evaluationService
      .submitEvaluation(payload)
      .pipe(
        catchError(() => of(null)),
        finalize(() => busySignal.set(false))
      )
      .subscribe((result) => {
        if (result === undefined) {
          this.snackbar.success(
            status === 'DRAFT' ? 'تم حفظ المسودة بنجاح.' : 'تم إرسال التقييم بنجاح.'
          );
          if (status === 'SUBMITTED') {
            this.goBack();
          }
        }
      });
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
