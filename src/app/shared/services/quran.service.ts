import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import {
  QURAN_CONTINUE_LENGTH,
  QURAN_QUESTION_COUNT,
  QuranAyahData,
  QuranQuestion,
  QuranQuestionType,
} from '../../features/users/models/quran.model';

/** Where a Juz' (Para) starts, as sura/aya — the standard 30-part Mushaf division. Static reference data. */
interface JuzBoundary {
  juz: number;
  sura: number;
  aya: number;
}

const JUZ_BOUNDARIES: JuzBoundary[] = [
  { juz: 1, sura: 1, aya: 1 },
  { juz: 2, sura: 2, aya: 142 },
  { juz: 3, sura: 2, aya: 253 },
  { juz: 4, sura: 3, aya: 92 },
  { juz: 5, sura: 4, aya: 24 },
  { juz: 6, sura: 4, aya: 148 },
  { juz: 7, sura: 5, aya: 82 },
  { juz: 8, sura: 6, aya: 111 },
  { juz: 9, sura: 7, aya: 88 },
  { juz: 10, sura: 8, aya: 41 },
  { juz: 11, sura: 9, aya: 93 },
  { juz: 12, sura: 11, aya: 6 },
  { juz: 13, sura: 12, aya: 53 },
  { juz: 14, sura: 15, aya: 1 },
  { juz: 15, sura: 17, aya: 1 },
  { juz: 16, sura: 18, aya: 75 },
  { juz: 17, sura: 21, aya: 1 },
  { juz: 18, sura: 23, aya: 1 },
  { juz: 19, sura: 25, aya: 21 },
  { juz: 20, sura: 27, aya: 56 },
  { juz: 21, sura: 29, aya: 46 },
  { juz: 22, sura: 33, aya: 31 },
  { juz: 23, sura: 36, aya: 28 },
  { juz: 24, sura: 39, aya: 32 },
  { juz: 25, sura: 41, aya: 47 },
  { juz: 26, sura: 46, aya: 1 },
  { juz: 27, sura: 51, aya: 31 },
  { juz: 28, sura: 58, aya: 1 },
  { juz: 29, sura: 67, aya: 1 },
  { juz: 30, sura: 78, aya: 1 },
];

const QURAN_XML_ASSET_PATH = 'assets/quran/quran-simple-plain.xml';

/** All question types are equally likely; each generated question rolls one independently. */
const QUESTION_TYPES: QuranQuestionType[] = [
  'CONTINUE_NEXT',
  'CONTINUE_AFTER_GAP',
  'IDENTIFY_SURAH',
  'IDENTIFY_AYAH_NUMBER',
  'START_FROM_AYAH',
  'MENTION_ADJACENT_AYAH',
];

/** CONTINUE_AFTER_GAP skips a random number of ayahs in this range before the answer starts. */
const GAP_MIN = 2;
const GAP_MAX = 6;
/** Number of ayahs revealed as the answer for CONTINUE_AFTER_GAP, starting after the gap. */
const GAP_ANSWER_LENGTH = 3;

/** A contiguous, half-open [start, end) slice of the `ayahs` array covering one Juz'. */
interface JuzRange {
  juz: number;
  start: number;
  end: number;
}

/**
 * Loads `quran-simple-plain.xml` once (cached for the app's lifetime) and generates
 * random memorization questions for the Quran evaluation panel, scoped to how much of
 * the Mushaf a participant's competition level says they should know.
 */
@Injectable({ providedIn: 'root' })
export class QuranService {
  private readonly http = inject(HttpClient);
  private ayahs$: Observable<QuranAyahData[]> | null = null;

  /**
   * Generates `questionCount` unique memorization questions, of varying random types
   * (continue/identify/mention-neighbour — see `QuranQuestionType`), drawn only from the
   * first `numberOfParts` Juz' (`CompetitionLevel.numberOfParts` — the number of Juz' the
   * participant is expected to have memorized, always starting from Juz' 1). Questions are
   * spread evenly across those Juz' rather than clustering in one area. An unknown/missing
   * level falls back to the entire Quran (30 Juz').
   */
  generateQuestions(
    numberOfParts: number | null | undefined,
    questionCount: number = QURAN_QUESTION_COUNT
  ): Observable<QuranQuestion[]> {
    return this.loadAyahs().pipe(
      map((ayahs) => this.buildQuestions(ayahs, numberOfParts, questionCount))
    );
  }

  private loadAyahs(): Observable<QuranAyahData[]> {
    if (!this.ayahs$) {
      this.ayahs$ = this.http
        .get(QURAN_XML_ASSET_PATH, { responseType: 'text' })
        .pipe(
          map((xml) => this.parseAyahs(xml)),
          shareReplay(1)
        );
    }
    return this.ayahs$;
  }

  private parseAyahs(xml: string): QuranAyahData[] {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const suraElements = Array.from(doc.getElementsByTagName('sura'));

    const ayahs: QuranAyahData[] = [];
    let globalIndex = 0;

    for (const suraEl of suraElements) {
      const suraIndex = Number(suraEl.getAttribute('index'));
      const suraName = suraEl.getAttribute('name') ?? '';
      const ayaElements = Array.from(suraEl.getElementsByTagName('aya'));

      for (const ayaEl of ayaElements) {
        ayahs.push({
          suraIndex,
          suraName,
          ayaIndex: Number(ayaEl.getAttribute('index')),
          text: ayaEl.getAttribute('text') ?? '',
          globalIndex: globalIndex++,
        });
      }
    }

    return ayahs;
  }

  private buildQuestions(
    ayahs: QuranAyahData[],
    numberOfParts: number | null | undefined,
    questionCount: number
  ): QuranQuestion[] {
    if (ayahs.length === 0) {
      return [];
    }

    const clampedParts = this.resolveClampedParts(numberOfParts);
    const juzRanges = this.resolveJuzRanges(ayahs, clampedParts).filter((r) => r.end - r.start > 0);
    if (juzRanges.length === 0) {
      return [];
    }

    const poolEnd = juzRanges[juzRanges.length - 1].end - 1;
    return this.pickQuestions(ayahs, juzRanges, poolEnd, questionCount);
  }

  private resolveClampedParts(numberOfParts: number | null | undefined): number {
    const parts = Math.round(Number(numberOfParts));
    return Number.isFinite(parts) && parts > 0 ? Math.min(30, parts) : 30;
  }

  /**
   * Slices `ayahs` into one [start, end) range per Juz', 1..`clampedParts`, using the real
   * sura/aya boundary for each Juz' (`JUZ_BOUNDARIES`) rather than any fixed ayah-count
   * assumption. The pool always starts at ayah 0 (Juz' 1) — a participant who has
   * memorized N parts is only ever quizzed on Juz' 1..N, never beyond.
   */
  private resolveJuzRanges(ayahs: QuranAyahData[], clampedParts: number): JuzRange[] {
    const ranges: JuzRange[] = [];
    for (let i = 0; i < clampedParts; i++) {
      const boundary = JUZ_BOUNDARIES[i];
      const start = ayahs.findIndex((a) => a.suraIndex === boundary.sura && a.ayaIndex === boundary.aya);
      if (start < 0) {
        continue;
      }
      const nextBoundary = JUZ_BOUNDARIES[i + 1];
      const nextStart = nextBoundary
        ? ayahs.findIndex((a) => a.suraIndex === nextBoundary.sura && a.ayaIndex === nextBoundary.aya)
        : -1;
      const end = nextStart >= 0 ? nextStart : ayahs.length;
      ranges.push({ juz: boundary.juz, start, end });
    }
    return ranges;
  }

  /**
   * Picks `questionCount` questions spread evenly across `juzRanges` (each Juz' gets an
   * equal share, remainder assigned to randomly chosen Juz' when it doesn't divide evenly),
   * then sorts the result by Mushaf order so the evaluator can follow along sequentially.
   */
  private pickQuestions(
    ayahs: QuranAyahData[],
    juzRanges: JuzRange[],
    poolEnd: number,
    questionCount: number
  ): QuranQuestion[] {
    const targetCount = Math.min(questionCount, poolEnd + 1);
    if (targetCount <= 0) {
      return [];
    }

    const counts = this.assignQuestionCounts(juzRanges.length, targetCount);
    const usedIndices = new Set<number>();
    const picked: { anchorIndex: number; question: QuranQuestion }[] = [];

    juzRanges.forEach((range, i) => {
      picked.push(...this.pickForRange(ayahs, range, poolEnd, usedIndices, counts[i], picked.length));
    });

    // Backfill from any range with remaining room if a range near the end of the pool
    // couldn't fit its full share (e.g. CONTINUE_NEXT needs room ahead of the anchor).
    for (const range of juzRanges) {
      if (picked.length >= targetCount) {
        break;
      }
      const remaining = targetCount - picked.length;
      picked.push(...this.pickForRange(ayahs, range, poolEnd, usedIndices, remaining, picked.length));
    }

    return picked.sort((a, b) => a.anchorIndex - b.anchorIndex).map((p) => p.question);
  }

  /** Splits `targetCount` questions across `rangeCount` Juz' as evenly as possible. */
  private assignQuestionCounts(rangeCount: number, targetCount: number): number[] {
    if (rangeCount === 0) {
      return [];
    }
    const base = Math.floor(targetCount / rangeCount);
    const remainder = targetCount % rangeCount;
    const counts = new Array(rangeCount).fill(base);
    const order = this.shuffle(Array.from({ length: rangeCount }, (_, i) => i));
    for (let i = 0; i < remainder; i++) {
      counts[order[i]]++;
    }
    return counts;
  }

  private pickForRange(
    ayahs: QuranAyahData[],
    range: JuzRange,
    poolEnd: number,
    usedIndices: Set<number>,
    count: number,
    idOffset: number
  ): { anchorIndex: number; question: QuranQuestion }[] {
    const span = range.end - range.start;
    const results: { anchorIndex: number; question: QuranQuestion }[] = [];
    if (span <= 0 || count <= 0) {
      return results;
    }

    const maxAttempts = Math.max(50, span * 5);
    let attempts = 0;

    while (results.length < count && attempts < maxAttempts) {
      attempts++;
      const anchorIndex = range.start + Math.floor(Math.random() * span);

      // Avoid duplicate questions (same starting ayah).
      if (usedIndices.has(anchorIndex)) {
        continue;
      }

      const type = QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)];
      const question = this.buildQuestion(ayahs, anchorIndex, type, poolEnd, idOffset + results.length);
      if (!question) {
        continue;
      }

      usedIndices.add(anchorIndex);
      results.push({ anchorIndex, question });
    }

    return results;
  }

  /** Builds one question anchored at `anchorIndex`, or returns null if `type` doesn't fit there. */
  private buildQuestion(
    ayahs: QuranAyahData[],
    anchorIndex: number,
    type: QuranQuestionType,
    poolEnd: number,
    questionIndex: number
  ): QuranQuestion | null {
    const anchor = ayahs[anchorIndex];
    const base = {
      id: `q${questionIndex}-sura${anchor.suraIndex}-aya${anchor.ayaIndex}-${anchorIndex}`,
      suraIndex: anchor.suraIndex,
      suraName: anchor.suraName,
      ayaIndex: anchor.ayaIndex,
    };

    switch (type) {
      case 'CONTINUE_NEXT': {
        const answerAyahs = ayahs.slice(anchorIndex + 1, anchorIndex + 1 + QURAN_CONTINUE_LENGTH);
        if (answerAyahs.length < QURAN_CONTINUE_LENGTH || anchorIndex + QURAN_CONTINUE_LENGTH > poolEnd) {
          return null;
        }
        return { ...base, type, ayahText: anchor.text, answerAyahs };
      }

      case 'CONTINUE_AFTER_GAP': {
        const gapCount = GAP_MIN + Math.floor(Math.random() * (GAP_MAX - GAP_MIN + 1));
        const answerStart = anchorIndex + gapCount + 1;
        const answerAyahs = ayahs.slice(answerStart, answerStart + GAP_ANSWER_LENGTH);
        if (answerAyahs.length < GAP_ANSWER_LENGTH || answerStart + GAP_ANSWER_LENGTH - 1 > poolEnd) {
          return null;
        }
        return { ...base, type, ayahText: anchor.text, answerAyahs, gapCount };
      }

      case 'IDENTIFY_SURAH':
      case 'IDENTIFY_AYAH_NUMBER':
        return { ...base, type, ayahText: anchor.text, answerAyahs: [] };

      case 'START_FROM_AYAH': {
        const answerAyahs = ayahs.slice(anchorIndex, anchorIndex + QURAN_CONTINUE_LENGTH);
        if (answerAyahs.length < QURAN_CONTINUE_LENGTH || anchorIndex + QURAN_CONTINUE_LENGTH - 1 > poolEnd) {
          return null;
        }
        return { ...base, type, ayahText: '', answerAyahs };
      }

      case 'MENTION_ADJACENT_AYAH': {
        const canGoAfter = anchorIndex + 1 <= poolEnd;
        const canGoBefore = anchorIndex - 1 >= 0;
        if (!canGoAfter && !canGoBefore) {
          return null;
        }
        const direction: 'before' | 'after' =
          canGoAfter && canGoBefore ? (Math.random() < 0.5 ? 'before' : 'after') : canGoAfter ? 'after' : 'before';
        const neighborIndex = direction === 'after' ? anchorIndex + 1 : anchorIndex - 1;
        return { ...base, type, ayahText: anchor.text, answerAyahs: [ayahs[neighborIndex]], direction };
      }
    }
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
