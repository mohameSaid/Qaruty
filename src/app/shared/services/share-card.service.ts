import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import * as QRCode from 'qrcode';

export interface ShareCardOptions {
  /** Download/attachment file name, e.g. "نتيجتي-يوسف.png". */
  fileName?: string;
  shareTitle?: string;
  shareText?: string;
  /**
   * Public URL for the result (e.g. a `/r/:token` share-landing route with its own OG:image).
   * Facebook's web sharer can only preview a URL — it never accepts an attached file — so this
   * is required to get a real Facebook preview when the Web Share API isn't available.
   */
  pageUrl?: string;
}

/** How `shareToWhatsApp`/`shareToFacebook` actually handed the image off, for the caller to message the user accordingly. */
export type ShareOutcome = 'shared' | 'downloaded';

/**
 * Captures a `ResultShareCardComponent` (or any element) to a PNG and hands it to WhatsApp/Facebook.
 *
 * Neither wa.me nor Facebook's sharer.php can accept a raw image file — wa.me only prefills text,
 * and sharer.php only previews a URL. The only way to hand an image directly to those apps from
 * the web is the OS share sheet (`navigator.share` with `files`), which is mobile-only and not
 * guaranteed to be available. So both share methods try that first, and fall back to downloading
 * the PNG for the user to attach by hand.
 */
@Injectable({ providedIn: 'root' })
export class ShareCardService {
  private readonly cache = new WeakMap<HTMLElement, Blob>();

  buildQrCodeDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, { margin: 1, width: 240 });
  }

  /** Renders `el` to a PNG blob. Cached per element — call again after changing the card's content. */
  async capture(el: HTMLElement): Promise<Blob> {
    const cached = this.cache.get(el);
    if (cached) {
      return cached;
    }

    // Without this, a card whose custom font hasn't finished loading yet gets captured with the
    // fallback font substituted in — the most common cause of "why does the exported PNG look wrong".
    await document.fonts.ready;

    const canvas = await html2canvas(el, {
      scale: 3, // 360px design width -> ~1080px export, matching a 1080x1350 share image
      backgroundColor: null,
      useCORS: true,
    });

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('تعذر إنشاء صورة النتيجة.'))), 'image/png');
    });

    this.cache.set(el, blob);
    return blob;
  }

  download(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async shareToWhatsApp(el: HTMLElement, options: ShareCardOptions = {}): Promise<ShareOutcome> {
    const { fileName = 'نتيجتي.png', shareTitle = 'نتيجتي', shareText = '' } = options;
    const blob = await this.capture(el);

    if (await this.shareNative(blob, fileName, shareTitle, shareText)) {
      return 'shared';
    }

    this.download(blob, fileName);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText || shareTitle)}`, '_blank', 'noopener');
    return 'downloaded';
  }

  async shareToFacebook(el: HTMLElement, options: ShareCardOptions = {}): Promise<ShareOutcome> {
    const { fileName = 'نتيجتي.png', shareTitle = 'نتيجتي', shareText = '', pageUrl } = options;
    const blob = await this.capture(el);

    if (await this.shareNative(blob, fileName, shareTitle, shareText)) {
      return 'shared';
    }

    this.download(blob, fileName);
    if (pageUrl) {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank', 'noopener');
    }
    return 'downloaded';
  }

  /** Tries the OS share sheet with the image attached. Returns false (never throws) if it's unavailable, unsupported, or fails. */
  private async shareNative(blob: Blob, fileName: string, title: string, text: string): Promise<boolean> {
    if (!navigator.share || !navigator.canShare) {
      return false;
    }

    const file = new File([blob], fileName, { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) {
      return false;
    }

    try {
      await navigator.share({ files: [file], title, text });
      return true;
    } catch (err) {
      // The user closing the share sheet isn't a failure — the app shouldn't also fall back to a download.
      return (err as DOMException)?.name === 'AbortError';
    }
  }
}
