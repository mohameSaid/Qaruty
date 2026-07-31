import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, shareReplay } from 'rxjs';

import {
  QURAN_CONTINUE_LENGTH,
  QuranAyahData,
  QuranCompetitionData,
  QuranCompetitionItem,
  QuranCompetitionPage,
  QuranModelOption,
  QuranQuestion,
} from '../../features/users/models/quran.model';

const QURAN_XML_ASSET_PATH = 'assets/quran/quran-simple-plain.xml';
const QURAN_COMPETITION_JSON_PATH = 'assets/quran/quran_competition_data.json';

/** Arabic ordinal words used in `model` labels, in order — index + 1 = model number (1-8). */
const MODEL_ORDINALS = ['أول', 'ثاني', 'ثالث', 'رابع', 'خامس', 'سادس', 'سابع', 'ثامن'];

/**
 * Loads `quran-simple-plain.xml` (for ayah text) and `quran_competition_data.json` (the
 * curated, pre-authored exam sheets) once each, cached for the app's lifetime, and builds
 * the Quran evaluation panel's questions from the exam sheet matching the participant's
 * level and the evaluator's chosen model.
 */
@Injectable({ providedIn: 'root' })
export class QuranService {
  private readonly http = inject(HttpClient);
  private ayahs$: Observable<QuranAyahData[]> | null = null;
  private competitionData$: Observable<QuranCompetitionData> | null = null;

  /** Available models (exam sheets) for a competition level, sorted 1st..8th. */
  getModelOptions(levelId: number): Observable<QuranModelOption[]> {
    return this.loadCompetitionData().pipe(
      map((data) =>
        data.pages
          .filter((p) => p.levelId === levelId)
          .map((p) => ({
            modelNumber: this.parseModelNumber(p.model),
            label: p.model,
            pageNumber: p.page,
          }))
          .sort((a, b) => a.modelNumber - b.modelNumber)
      )
    );
  }

  /** Builds the 10 fixed questions for a given level's chosen model exam sheet. */
  generateQuestionsFromModel(levelId: number, modelNumber: number): Observable<QuranQuestion[]> {
    return combineLatest([this.loadAyahs(), this.loadCompetitionData()]).pipe(
      map(([ayahs, data]) => this.buildQuestionsFromModel(ayahs, data, levelId, modelNumber))
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

  private loadCompetitionData(): Observable<QuranCompetitionData> {
    if (!this.competitionData$) {
      this.competitionData$ = this.http
        .get<QuranCompetitionData>(QURAN_COMPETITION_JSON_PATH)
        .pipe(shareReplay(1));
    }
    return this.competitionData$;
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

  /** Maps a `model` label ("النموذج الأول".."النموذج الثامن") to its number 1-8. */
  private parseModelNumber(label: string): number {
    return MODEL_ORDINALS.findIndex((ordinal) => label.includes(ordinal)) + 1;
  }

  /**
   * Normalizes hamza/alif variants so surah names match regardless of orthography
   * differences between the curated JSON (e.g. "سبأ", "إبراهيم") and the Quran XML
   * asset (e.g. "سبإ", "ابراهيم").
   */
  private normalizeArabic(value: string): string {
    return value.replace(/[إأٱآ]/g, 'ا').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي').replace(/ء/g, '');
  }

  /** Takes the first number out of an ayah value — plain, or a range like "58-59". */
  private parseAyahNumber(item: QuranCompetitionItem): number {
    if (typeof item.ayah === 'number') {
      return item.ayah;
    }
    if (typeof item.ayah === 'string') {
      const parsed = parseInt(item.ayah, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return 1;
  }

  private buildQuestionsFromModel(
    ayahs: QuranAyahData[],
    data: QuranCompetitionData,
    levelId: number,
    modelNumber: number
  ): QuranQuestion[] {
    const page: QuranCompetitionPage | undefined = data.pages.find(
      (p) => p.levelId === levelId && this.parseModelNumber(p.model) === modelNumber
    );
    if (!page) {
      return [];
    }

    const questions: QuranQuestion[] = [];
    for (const item of page.items) {
      if (!item.surah) {
        continue;
      }
      const ayaIndex = this.parseAyahNumber(item);
      const targetSura = this.normalizeArabic(item.surah);
      const anchorIndex = ayahs.findIndex(
        (a) => this.normalizeArabic(a.suraName) === targetSura && a.ayaIndex === ayaIndex
      );
      if (anchorIndex < 0) {
        continue;
      }
      const anchor = ayahs[anchorIndex];
      questions.push({
        id: `m${modelNumber}-q${item.number}-sura${anchor.suraIndex}-aya${anchor.ayaIndex}`,
        type: 'CONTINUE_NEXT',
        suraIndex: anchor.suraIndex,
        suraName: anchor.suraName,
        ayaIndex: anchor.ayaIndex,
        ayahText: anchor.text,
        answerAyahs: ayahs.slice(anchorIndex + 1, anchorIndex + 1 + QURAN_CONTINUE_LENGTH),
      });
    }
    return questions;
  }
}
