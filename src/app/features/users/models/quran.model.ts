/** One ayah as parsed from `quran-simple-plain.xml`, with its absolute position in the Mushaf. */
export interface QuranAyahData {
  suraIndex: number;
  suraName: string;
  ayaIndex: number;
  text: string;
  /** 0-based position across the whole Quran (sura 1 aya 1 = 0), used to pick "the next N ayahs". */
  globalIndex: number;
}

/** The six memorization drills a generated question can ask for. */
export type QuranQuestionType =
  | 'CONTINUE_NEXT'
  | 'CONTINUE_AFTER_GAP'
  | 'IDENTIFY_SURAH'
  | 'IDENTIFY_AYAH_NUMBER'
  | 'START_FROM_AYAH'
  | 'MENTION_ADJACENT_AYAH';

/** Arabic label shown on each question's panel/badge. */
export const QURAN_QUESTION_TYPE_LABELS: Record<QuranQuestionType, string> = {
  CONTINUE_NEXT: 'إكمال الآيات التالية',
  CONTINUE_AFTER_GAP: 'إكمال بعد عدة آيات',
  IDENTIFY_SURAH: 'تحديد اسم السورة',
  IDENTIFY_AYAH_NUMBER: 'تحديد رقم الآية',
  START_FROM_AYAH: 'البدء من آية محددة',
  MENTION_ADJACENT_AYAH: 'ذكر الآية المجاورة',
};

/**
 * One generated memorization question. `ayahText` is the prompt shown to the evaluator up
 * front — empty for `START_FROM_AYAH`, where only the sura/ayah reference is shown and the
 * text itself is part of the hidden answer. `answerAyahs` holds whatever the evaluator should
 * reveal to check the participant's recitation; its meaning depends on `type`:
 * - CONTINUE_NEXT / CONTINUE_AFTER_GAP / START_FROM_AYAH: the ayahs to recite.
 * - MENTION_ADJACENT_AYAH: the single neighboring ayah (see `direction`).
 * - IDENTIFY_SURAH / IDENTIFY_AYAH_NUMBER: empty — the answer is `suraName` / `ayaIndex` above.
 */
export interface QuranQuestion {
  id: string;
  type: QuranQuestionType;
  suraIndex: number;
  suraName: string;
  ayaIndex: number;
  ayahText: string;
  answerAyahs: QuranAyahData[];
  /** CONTINUE_AFTER_GAP only: how many ayahs are skipped before the answer starts. */
  gapCount?: number;
  /** MENTION_ADJACENT_AYAH only: which neighbour is being asked for. */
  direction?: 'before' | 'after';
}

/** Number of ayahs revealed as the answer for a CONTINUE_NEXT / START_FROM_AYAH question. */
export const QURAN_CONTINUE_LENGTH = 10;
/** Score range per Quran question, same 0-10 scale as the other evaluation criteria. */
export const QURAN_MAX_QUESTION_SCORE = 10;

/** One fixed exam-sheet item as authored in `quran_competition_data.json`. */
export interface QuranCompetitionItem {
  number: number;
  label?: string;
  surah?: string;
  ayah?: number | string;
  text?: string;
  note?: string;
}

/** One page of `quran_competition_data.json` — a single level+model exam sheet. */
export interface QuranCompetitionPage {
  page: number;
  level: string | null;
  levelId: number | null;
  model: string;
  note?: string;
  items: QuranCompetitionItem[];
}

/** Shape of `assets/quran/quran_competition_data.json`. */
export interface QuranCompetitionData {
  competition_title: string;
  edition: string;
  pages: QuranCompetitionPage[];
}

/** One selectable "model" (exam sheet) for a given competition level. */
export interface QuranModelOption {
  modelNumber: number;
  label: string;
  pageNumber: number;
}
