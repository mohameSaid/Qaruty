import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import {
  QURAN_ANSWER_LENGTH,
  QURAN_QUESTION_COUNT,
  QuranAyahData,
  QuranQuestion,
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
   * Generates `questionCount` unique memorization questions.
   *
   * `numberOfParts` is the participant's level (`CompetitionLevel.numberOfParts`) — the
   * number of Juz' (Ajza') they are expected to have memorized. Quran memorization is
   * conventionally taught starting from Juz' 30 (Juz' Amma) and working backwards, so a
   * participant on a "5 parts" level is quizzed only within the last 5 Juz' (26-30).
   * An unknown/missing level falls back to the entire Quran.
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

    const [poolStart, poolEnd] = this.resolvePool(ayahs, numberOfParts);
    return this.pickQuestions(ayahs, poolStart, poolEnd, questionCount);
  }

  /**
   * Resolves the inclusive [start, end] range of *starting-ayah* indices (into `ayahs`)
   * that are eligible for question generation, given the participant's level. `end` is
   * already pulled back so every candidate is guaranteed to have `QURAN_ANSWER_LENGTH`
   * ayahs after it, anywhere in the Mushaf (the answer may run into the next sura).
   */
  private resolvePool(ayahs: QuranAyahData[], numberOfParts: number | null | undefined): [number, number] {
    const total = ayahs.length;
    const lastValidStart = total - 1 - QURAN_ANSWER_LENGTH;

    const parts = Math.round(Number(numberOfParts));
    const clampedParts = Number.isFinite(parts) && parts > 0 ? Math.min(30, parts) : 30;
    const startJuz = Math.max(1, 30 - clampedParts + 1);
    const boundary = JUZ_BOUNDARIES.find((j) => j.juz === startJuz) ?? JUZ_BOUNDARIES[0];

    const fromIndex = ayahs.findIndex(
      (a) => a.suraIndex === boundary.sura && a.ayaIndex === boundary.aya
    );

    const poolStart = fromIndex >= 0 ? fromIndex : 0;

    // If the level's range is too close to the end of the Quran to fit any full
    // question, fall back to the whole Mushaf rather than returning nothing.
    if (poolStart > lastValidStart) {
      return [0, Math.max(0, lastValidStart)];
    }
    return [poolStart, lastValidStart];
  }

  private pickQuestions(
    ayahs: QuranAyahData[],
    poolStart: number,
    poolEnd: number,
    questionCount: number
  ): QuranQuestion[] {
    const span = poolEnd - poolStart + 1;
    if (span <= 0) {
      return [];
    }

    const targetCount = Math.min(questionCount, span);
    const usedIndices = new Set<number>();
    const questions: QuranQuestion[] = [];
    const maxAttempts = Math.max(500, span * 3);
    let attempts = 0;

    while (questions.length < targetCount && attempts < maxAttempts) {
      attempts++;
      const candidateIndex = poolStart + Math.floor(Math.random() * span);

      // Avoid duplicate questions (same starting ayah).
      if (usedIndices.has(candidateIndex)) {
        continue;
      }
      usedIndices.add(candidateIndex);

      const startAyah = ayahs[candidateIndex];
      const answerAyahs = ayahs.slice(candidateIndex + 1, candidateIndex + 1 + QURAN_ANSWER_LENGTH);
      if (answerAyahs.length < QURAN_ANSWER_LENGTH) {
        continue;
      }

      questions.push({
        id: `sura${startAyah.suraIndex}-aya${startAyah.ayaIndex}-${candidateIndex}`,
        suraIndex: startAyah.suraIndex,
        suraName: startAyah.suraName,
        ayaIndex: startAyah.ayaIndex,
        ayahText: startAyah.text,
        answerAyahs,
      });
    }

    return questions;
  }
}
