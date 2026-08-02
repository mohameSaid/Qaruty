import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
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

  private readonly _khatmah = signal<Khatmah | null>(null);
  private readonly _part = signal<Part | null>(null);
  private readonly _loading = signal(true);
  private readonly _hasReachedEnd = signal(false);

  protected readonly khatmah = this._khatmah.asReadonly();
  protected readonly part = this._part.asReadonly();
  protected readonly loading = this._loading.asReadonly();
  protected readonly reachedLastPage = this._hasReachedEnd.asReadonly();

  protected readonly partNumberValue = computed(() => Number(this.partNumber()));
  protected readonly juzLabel = computed(() => JUZ_LABELS[this.partNumberValue() - 1]);
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
  }

  goBack(): void {
    const khatmah = this._khatmah();
    if (khatmah) {
      this.router.navigate(['/k', khatmah.slug]);
    }
  }

  goToPreviousPage(): void {
    this.reader.goToPageIndex(this.reader.currentPageIndex() - 1);
    this.onPageChanged();
  }

  goToNextPage(): void {
    this.reader.goToPageIndex(this.reader.currentPageIndex() + 1);
    this.onPageChanged();
  }

  isNewSurah(ayahs: AyaRecord[], index: number): boolean {
    return index === 0 || ayahs[index].sura_no !== ayahs[index - 1].sura_no;
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
    this.khatmahService.getBySlug(slug).subscribe({
      next: (khatmah) => {
        this._khatmah.set(khatmah);
        this.partsService.getPart(khatmah.id, partNumber).subscribe({
          next: (part) => {
            this._part.set(part);
            this._loading.set(false);
            this.startReadingIfMine(khatmah, part);
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
    this.quranReaderService.getJuzPages(part.part_number).subscribe((pages) => {
      this.reader.setPages(pages);
      const lastPage = this.reader.loadLastPosition(khatmah.id, part.part_number);
      if (lastPage) {
        this.reader.goToPageNumber(lastPage);
      }
      this.checkReachedEnd();
    });
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
