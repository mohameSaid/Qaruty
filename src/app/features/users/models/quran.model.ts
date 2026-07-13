/** One ayah as parsed from `quran-simple-plain.xml`, with its absolute position in the Mushaf. */
export interface QuranAyahData {
  suraIndex: number;
  suraName: string;
  ayaIndex: number;
  text: string;
  /** 0-based position across the whole Quran (sura 1 aya 1 = 0), used to pick "the next N ayahs". */
  globalIndex: number;
}

/**
 * One generated memorization question: the evaluator sees only `suraName` / `ayaIndex` /
 * `ayahText` (the starting ayah). `answerAyahs` holds the next `QURAN_ANSWER_LENGTH` ayahs —
 * kept out of view until the evaluator explicitly reveals it, so it can be checked against
 * the participant's live recitation without being displayed by default.
 */
export interface QuranQuestion {
  id: string;
  suraIndex: number;
  suraName: string;
  ayaIndex: number;
  ayahText: string;
  answerAyahs: QuranAyahData[];
}

/** Fixed number of memorization questions generated per evaluation. */
export const QURAN_QUESTION_COUNT = 10;
/** Fixed number of ayahs that make up the expected answer for each question. */
export const QURAN_ANSWER_LENGTH = 10;
/** Score range per Quran question, same 0-10 scale as the other evaluation criteria. */
export const QURAN_MAX_QUESTION_SCORE = 10;
