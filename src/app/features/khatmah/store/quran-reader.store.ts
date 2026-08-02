import { Injectable, computed, signal } from '@angular/core';
import { QuranPage } from '../models/aya.model';

interface ReaderPreferences {
  fontSize: number;
  nightMode: boolean;
}

const PREFS_KEY = 'khatmah:reader:preferences';
const DEFAULT_PREFS: ReaderPreferences = { fontSize: 24, nightMode: false };
const MIN_FONT_SIZE = 16;
const MAX_FONT_SIZE = 40;

const lastPositionKey = (khatmahId: string, partNumber: number) => `khatmah:reader:position:${khatmahId}:${partNumber}`;

@Injectable({ providedIn: 'root' })
export class QuranReaderStore {
  private readonly prefs = loadPrefs();

  private readonly _pages = signal<QuranPage[]>([]);
  private readonly _currentPageIndex = signal(0);
  private readonly _fontSize = signal(this.prefs.fontSize);
  private readonly _nightMode = signal(this.prefs.nightMode);
  private readonly _loading = signal(false);

  readonly pages = this._pages.asReadonly();
  readonly currentPageIndex = this._currentPageIndex.asReadonly();
  readonly currentPage = computed(() => this._pages()[this._currentPageIndex()] ?? null);
  readonly fontSize = this._fontSize.asReadonly();
  readonly nightMode = this._nightMode.asReadonly();
  readonly loading = this._loading.asReadonly();

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setPages(pages: QuranPage[]): void {
    this._pages.set(pages);
    this._currentPageIndex.set(0);
  }

  goToPageIndex(index: number): void {
    if (index >= 0 && index < this._pages().length) {
      this._currentPageIndex.set(index);
    }
  }

  goToPageNumber(pageNumber: number): void {
    const index = this._pages().findIndex((p) => p.page === pageNumber);
    if (index !== -1) {
      this._currentPageIndex.set(index);
    }
  }

  goToSurah(suraNo: number): void {
    const index = this._pages().findIndex((p) => p.ayahs.some((a) => a.sura_no === suraNo));
    if (index !== -1) {
      this._currentPageIndex.set(index);
    }
  }

  increaseFontSize(): void {
    this.setFontSize(Math.min(this._fontSize() + 2, MAX_FONT_SIZE));
  }

  decreaseFontSize(): void {
    this.setFontSize(Math.max(this._fontSize() - 2, MIN_FONT_SIZE));
  }

  toggleNightMode(): void {
    this._nightMode.set(!this._nightMode());
    this.savePrefs();
  }

  saveLastPosition(khatmahId: string, partNumber: number): void {
    const page = this.currentPage();
    if (!page) return;
    localStorage.setItem(lastPositionKey(khatmahId, partNumber), JSON.stringify({ page: page.page }));
  }

  loadLastPosition(khatmahId: string, partNumber: number): number | null {
    const raw = localStorage.getItem(lastPositionKey(khatmahId, partNumber));
    if (!raw) return null;
    return (JSON.parse(raw) as { page: number }).page;
  }

  private setFontSize(size: number): void {
    this._fontSize.set(size);
    this.savePrefs();
  }

  private savePrefs(): void {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ fontSize: this._fontSize(), nightMode: this._nightMode() }));
  }
}

function loadPrefs(): ReaderPreferences {
  const raw = localStorage.getItem(PREFS_KEY);
  return raw ? (JSON.parse(raw) as ReaderPreferences) : DEFAULT_PREFS;
}
