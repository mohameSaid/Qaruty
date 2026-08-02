import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { KhatmahService } from '../../services/khatmah.service';
import { PartsService } from '../../services/parts.service';
import { QuranReaderService } from '../../services/quran-reader.service';
import { ParticipantIdentityService } from '../../services/participant-identity.service';
import { QuranReaderStore } from '../../store/quran-reader.store';
import { Khatmah } from '../../models/khatmah.model';
import { Part } from '../../models/part.model';
import { AyaRecord } from '../../models/aya.model';
import { JUZ_LABELS } from '../../data/juz-labels';
import { getKhatmahErrorMessage } from '../../data/error-messages';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { KhatmahBreadcrumbComponent } from '../../components/khatmah-breadcrumb/khatmah-breadcrumb.component';
import { KhatmahPageMetaService } from '../../services/page-meta.service';

@Component({
  selector: 'app-khatmah-reader-page',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, KhatmahBreadcrumbComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './khatmah-reader-page.component.html',
  styleUrl: './khatmah-reader-page.component.scss',
})
export class KhatmahReaderPageComponent {
  readonly slug = input.required<string>();
  readonly partNumber = input.required<string>();

  protected readonly reader = inject(QuranReaderStore);

  private readonly khatmahService = inject(KhatmahService);
  private readonly partsService = inject(PartsService);
  private readonly quranReaderService = inject(QuranReaderService);
  private readonly identity = inject(ParticipantIdentityService);
  private readonly snackbar = inject(SnackbarService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly pageMeta = inject(KhatmahPageMetaService);

  private readonly _khatmah = signal<Khatmah | null>(null);
  private readonly _part = signal<Part | null>(null);
  private readonly _loading = signal(true);
  private readonly _hasReachedEnd = signal(false);
  private readonly _fullMode = signal(false);
  private readonly _dragOffset = signal(0);
  private readonly _isDragging = signal(false);
  private readonly _pageTransitioning = signal(false);

  protected readonly khatmah = this._khatmah.asReadonly();
  protected readonly part = this._part.asReadonly();
  protected readonly loading = this._loading.asReadonly();
  protected readonly reachedLastPage = this._hasReachedEnd.asReadonly();
  /** Full Mode: hides all chrome except the Quran text. Independent of the native Fullscreen
   *  API (which it opportunistically also requests) since that API isn't available for
   *  arbitrary elements on iOS Safari — a primary target platform here. */
  protected readonly fullMode = this._fullMode.asReadonly();
  protected readonly dragOffset = this._dragOffset.asReadonly();
  protected readonly isDragging = this._isDragging.asReadonly();
  protected readonly pageTransitioning = this._pageTransitioning.asReadonly();

  private touchStartX = 0;
  private touchStartY = 0;
  private touchDeltaX = 0;
  private swipeAxis: 'horizontal' | 'vertical' | null = null;
  private pageTransitionTimeoutId: ReturnType<typeof setTimeout> | undefined;

  private static readonly SWIPE_AXIS_THRESHOLD = 10;
  private static readonly SWIPE_COMMIT_THRESHOLD = 60;
  private static readonly SWIPE_MAX_DRAG = 120;
  private static readonly PAGE_TRANSITION_MS = 500;

  protected readonly partNumberValue = computed(() => Number(this.partNumber()));
  protected readonly juzLabel = computed(() => JUZ_LABELS[this.partNumberValue() - 1]);
  protected readonly currentSuraName = computed(() => this.reader.currentPage()?.ayahs[0]?.sura_name_ar ?? '');
  protected readonly isMine = computed(() => {
    const khatmah = this._khatmah();
    const part = this._part();
    return !!khatmah && !!part && this.identity.getMyPartIds(khatmah.id).includes(part.id);
  });

  constructor() {
    effect(() => {
      const slug = this.slug();
      const partNumber = this.partNumberValue();
      untracked(() => this.load(slug, partNumber));
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.pageTransitionTimeoutId);
      this.pageMeta.reset();
    });
  }

  goBack(): void {
    const khatmah = this._khatmah();
    if (khatmah) {
      this.router.navigate(['/k', khatmah.slug]);
    }
  }

  goToPreviousPage(): void {
    this.changePage(this.reader.currentPageIndex() - 1);
  }

  goToNextPage(): void {
    this.changePage(this.reader.currentPageIndex() + 1);
  }

  /** Brief fake-loading beat between pages — a deliberate page-turn feel rather than an
   *  instant content jump, matching the pacing of dedicated Quran reading apps. */
  private changePage(targetIndex: number): void {
    if (targetIndex < 0 || targetIndex >= this.reader.pages().length) {
      return;
    }
    clearTimeout(this.pageTransitionTimeoutId);
    this._pageTransitioning.set(true);
    this.pageTransitionTimeoutId = setTimeout(() => {
      this.reader.goToPageIndex(targetIndex);
      this.onPageChanged();
      this.scrollContentToTop();
      this._pageTransitioning.set(false);
    }, KhatmahReaderPageComponent.PAGE_TRANSITION_MS);
  }

  isNewSurah(ayahs: AyaRecord[], index: number): boolean {
    return index === 0 || ayahs[index].sura_no !== ayahs[index - 1].sura_no;
  }

  toggleFullMode(): void {
    const next = !this._fullMode();
    this._fullMode.set(next);

    if (next && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => undefined);
    } else if (!next && document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  @HostListener('document:fullscreenchange')
  protected onFullscreenChange(): void {
    // Leaving native fullscreen via Esc / OS back-gesture / browser UI also exits Full Mode.
    if (!document.fullscreenElement) {
      this._fullMode.set(false);
    }
  }

  onTouchStart(event: TouchEvent): void {
    if (event.touches.length > 1) {
      this.swipeAxis = null;
      return;
    }
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.touchDeltaX = 0;
    this.swipeAxis = null;
  }

  onTouchMove(event: TouchEvent): void {
    if (event.touches.length > 1) {
      this.endDrag();
      return;
    }

    const deltaX = event.touches[0].clientX - this.touchStartX;
    const deltaY = event.touches[0].clientY - this.touchStartY;

    if (this.swipeAxis === null) {
      const axisThreshold = KhatmahReaderPageComponent.SWIPE_AXIS_THRESHOLD;
      if (Math.abs(deltaX) < axisThreshold && Math.abs(deltaY) < axisThreshold) {
        return;
      }
      this.swipeAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      if (this.swipeAxis === 'horizontal') {
        this._isDragging.set(true);
      }
    }

    if (this.swipeAxis !== 'horizontal') {
      return;
    }

    // Stop the page from scrolling horizontally and, critically, stop the browser from
    // interpreting this as its native edge-swipe back/forward navigation gesture.
    event.preventDefault();

    const atFirstPage = this.reader.currentPageIndex() === 0;
    const atLastPage = this.reader.currentPageIndex() >= this.reader.pages().length - 1;
    // Rubber-band resistance past a boundary (no previous/next page to reveal). Rightward
    // drag (deltaX > 0) advances forward, so it's resisted at the last page; leftward goes
    // back, resisted at the first page — matching the RTL mapping used in onTouchEnd.
    const resisted = (deltaX > 0 && atLastPage) || (deltaX < 0 && atFirstPage) ? deltaX / 3 : deltaX;
    const max = KhatmahReaderPageComponent.SWIPE_MAX_DRAG;

    this.touchDeltaX = deltaX;
    this._dragOffset.set(Math.max(-max, Math.min(max, resisted)));
  }

  onTouchEnd(): void {
    if (this.swipeAxis === 'horizontal') {
      const delta = this.touchDeltaX;
      const commit = KhatmahReaderPageComponent.SWIPE_COMMIT_THRESHOLD;

      // RTL Mushaf pagination: content advances right-to-left, so swiping right (finger
      // moving left-to-right, positive delta) pulls the next page in, and swiping left goes back.
      if (delta >= commit && this.reader.currentPageIndex() < this.reader.pages().length - 1) {
        this.goToNextPage();
      } else if (delta <= -commit && this.reader.currentPageIndex() > 0) {
        this.goToPreviousPage();
      }
    }
    this.endDrag();
  }

  private endDrag(): void {
    this.swipeAxis = null;
    this.touchDeltaX = 0;
    this._isDragging.set(false);
    this._dragOffset.set(0);
  }

  completePart(): void {
    const part = this._part();
    if (!part) return;
    this.partsService.completePart(part.id, this.identity.getParticipantToken()).subscribe({
      next: () => {
        const khatmah = this._khatmah();
        this.identity.removeMyPartId(khatmah!.id, part.id);
        this.snackbar.success('تم بحمد الله. جزاك الله خيرًا.');
        this.router.navigate(['/k', this.slug()]);
      },
      error: (err) => this.snackbar.error(getKhatmahErrorMessage(err)),
    });
  }

  private load(slug: string, partNumber: number): void {
    this._loading.set(true);
    this._hasReachedEnd.set(false);
    this.khatmahService.getBySlug(slug).subscribe({
      next: (khatmah) => {
        this._khatmah.set(khatmah);
        this.partsService.getPart(khatmah.id, partNumber).subscribe({
          next: (part) => {
            this._part.set(part);
            this.startReadingIfMine(khatmah, part);
            this.pageMeta.set(`${this.juzLabel().label} - ${khatmah.title} | قريتي`);
            // _loading stays true through this step too — pages are fetched separately and
            // can take a moment, so we don't want the empty-hint state to flash in between.
            this.loadPages(khatmah, part);
          },
          error: () => {
            this._loading.set(false);
            this.snackbar.error('تعذر العثور على هذا الجزء.');
          },
        });
      },
      error: () => {
        this._loading.set(false);
        this.snackbar.error('تعذر العثور على هذه الختمة.');
      },
    });
  }

  private startReadingIfMine(khatmah: Khatmah, part: Part): void {
    const isMine = this.identity.getMyPartIds(khatmah.id).includes(part.id);
    if (isMine && part.status === 'reserved') {
      this.partsService.startReading(part.id, this.identity.getParticipantToken()).subscribe((updated) => this._part.set(updated));
    }
  }

  private loadPages(khatmah: Khatmah, part: Part): void {
    this.quranReaderService.getJuzPages(part.part_number).subscribe({
      next: (pages) => {
        this.reader.setPages(pages);
        const lastPage = this.reader.loadLastPosition(khatmah.id, part.part_number);
        if (lastPage) {
          this.reader.goToPageNumber(lastPage);
        }
        this.checkReachedEnd();
        this._loading.set(false);
      },
      error: () => {
        this._loading.set(false);
        this.snackbar.error('تعذر تحميل نص الجزء.');
      },
    });
  }

  private scrollContentToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private checkReachedEnd(): void {
    const pageCount = this.reader.pages().length;
    if (pageCount > 0 && this.reader.currentPageIndex() >= pageCount - 1) {
      this._hasReachedEnd.set(true);
    }
  }

  private onPageChanged(): void {
    const khatmah = this._khatmah();
    const part = this._part();
    if (!khatmah || !part) return;

    this.reader.saveLastPosition(khatmah.id, part.part_number);
    this.checkReachedEnd();

    if (this.isMine() && part.status === 'reading') {
      const pageCount = this.reader.pages().length;
      const progress = pageCount ? Math.round(((this.reader.currentPageIndex() + 1) / pageCount) * 100) : 0;
      const currentPage = this.reader.currentPage();
      this.partsService
        .updateProgress(part.id, this.identity.getParticipantToken(), progress, currentPage?.page ?? null)
        .subscribe();
    }
  }
}
