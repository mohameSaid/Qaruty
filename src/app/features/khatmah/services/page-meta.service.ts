import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DEFAULT_APP_DESCRIPTION, DEFAULT_APP_TITLE } from '../data/page-title';

/**
 * Updates the document title/description while a khatmah page is active, and restores the
 * app's default (competition) title on the way out. Client-side only — this does NOT change
 * what WhatsApp/Telegram link-preview crawlers see, since they read the static index.html
 * without executing JavaScript. Fixing that needs a server-side/edge piece, tracked separately.
 */
@Injectable({ providedIn: 'root' })
export class KhatmahPageMetaService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  set(title: string, description: string = DEFAULT_APP_DESCRIPTION): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
  }

  reset(): void {
    this.set(DEFAULT_APP_TITLE, DEFAULT_APP_DESCRIPTION);
  }
}
