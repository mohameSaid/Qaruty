/** One fixed judging criterion on the evaluation form. Score range is always 0-10. */
export interface EvaluationQuestion {
  id: string;
  label: string;
  hint?: string;
}

/**
 * The 10 standard Quran-recitation judging criteria, 0-10 each (100 total).
 * Not sourced from the backend — no lookup endpoint for evaluation criteria exists
 * in this codebase yet, so this list is defined client-side. If the real competition
 * rules use different criteria, edit this array; nothing else needs to change since
 * the rest of the page is driven off it.
 */
export const EVALUATION_QUESTIONS: EvaluationQuestion[] = [
  { id: 'memorization_accuracy', label: 'دقة الحفظ', hint: 'مطابقة الآيات المحفوظة للمصحف دون خطأ' },
  { id: 'tajweed_rules', label: 'أحكام التجويد', hint: 'تطبيق أحكام التجويد بشكل صحيح' },
  { id: 'makharij', label: 'مخارج الحروف', hint: 'وضوح ودقة نطق الحروف من مخارجها' },
  { id: 'waqf_ibtida', label: 'الوقف والابتداء', hint: 'حسن الوقف على رؤوس الآيات والابتداء الصحيح' },
  { id: 'tashkeel', label: 'ضبط التشكيل', hint: 'دقة ضبط الحركات والتشكيل' },
  { id: 'recall_speed', label: 'سرعة الاسترجاع', hint: 'القدرة على استرجاع الحفظ دون تلقين' },
  { id: 'fluency', label: 'الطلاقة وعدم التردد', hint: 'الاستمرارية دون تقطع أو تردد ملحوظ' },
  { id: 'voice_performance', label: 'تناسق الأداء الصوتي', hint: 'جمال الصوت وتناسق النبرة أثناء التلاوة' },
  { id: 'rules_compliance', label: 'الالتزام بقواعد المسابقة', hint: 'الالتزام بالوقت والضوابط العامة للمسابقة' },
  { id: 'overall_impression', label: 'الانطباع العام والهيئة', hint: 'الثقة والهيئة العامة أثناء الأداء' },
];

export const MAX_QUESTION_SCORE = 10;
export const MAX_TOTAL_SCORE = EVALUATION_QUESTIONS.length * MAX_QUESTION_SCORE;

export type EvaluationStatus = 'DRAFT' | 'SUBMITTED';

export interface EvaluationScoreEntry {
  questionId: string;
  score: number;
}

/**
 * Body for saving/submitting an evaluation. Posted against the specific
 * competition-registration record (`competitionUserId` = a `CompetitionHistoryItem.id`),
 * not the student directly, since a student can be evaluated separately per competition.
 * Endpoint/shape is NOT confirmed against a live backend — no evaluation endpoint exists
 * yet in the Postman collection this project was built from. See `EvaluationService`.
 */
export interface SubmitEvaluationRequest {
  competitionUserId: number;
  scores: EvaluationScoreEntry[];
  totalScore: number;
  notes: string;
  status: EvaluationStatus;
}
