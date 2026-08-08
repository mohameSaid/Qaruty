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

// ---------------------------------------------------------------------------------------------
// html2canvas 1.4.1 has a real bug in CanvasRenderer.prototype.renderBackgroundImage (dist/
// html2canvas.esm.js ~L7184-7199): for a `linear-gradient` background it sets canvas.width/height
// from the element's unrounded getBoundingClientRect() *before* checking width>0 && height>0, so
// a sub-pixel positive size (ordinary sub-pixel flex/text layout, common under OS display scaling)
// truncates the canvas to 0x0 via the IDL setter yet still passes the JS guard, and createPattern
// throws InvalidStateError. getBoundingClientRect() is routinely fractional, so this can hit ANY
// linear-gradient element in a captured subtree, not one specific one. Rather than chase which
// element/condition triggers it next, this makes that one narrow failure mode non-fatal.
// (Alternative considered: patch-package to fix the source line directly, mirroring html2canvas's
// own `Math.max(1, width)` guard used at its sibling url()-background call site. Rejected as
// version-fragile — silently stops applying on any future `npm update html2canvas`. This patches
// a stable browser API instead, so it keeps working across any html2canvas upgrade and becomes an
// inert no-op the day upstream fixes it.)
// ---------------------------------------------------------------------------------------------

let activeCaptures = 0;
let nativeCreatePattern: typeof CanvasRenderingContext2D.prototype.createPattern | null = null;

/**
 * Runs `run()` with `createPattern` patched so the html2canvas bug above degrades gracefully
 * instead of crashing. Reference-counted so overlapping captures can't have one call's cleanup
 * restore the native function while another is still mid-flight.
 */
function withPatchedCreatePattern<T>(run: () => Promise<T>): Promise<T> {
  if (activeCaptures === 0) {
    const native = CanvasRenderingContext2D.prototype.createPattern;
    nativeCreatePattern = native;
    CanvasRenderingContext2D.prototype.createPattern = function (
      this: CanvasRenderingContext2D,
      image: CanvasImageSource,
      repetition: string | null
    ): CanvasPattern | null {
      try {
        return native.call(this, image, repetition);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'InvalidStateError') {
          console.warn(
            'ShareCardService: html2canvas hit the known 0-size-canvas createPattern bug; that gradient rendered unpainted.',
            err
          );
          return null;
        }
        throw err;
      }
    };
  }
  activeCaptures++;

  return run().finally(() => {
    activeCaptures--;
    if (activeCaptures === 0) {
      CanvasRenderingContext2D.prototype.createPattern = nativeCreatePattern!;
      nativeCreatePattern = null;
    }
  });
}

/**
 * Captures a `ResultShareCardComponent` (or any element) to a PNG and hands it to WhatsApp/Facebook.
 *
 * Neither wa.me nor Facebook's sharer.php can accept a raw image file — wa.me only prefills text,
 * and sharer.php only previews a URL. WhatsApp sharing always downloads the PNG first (so the user
 * has it to attach by hand) and opens wa.me's prefilled text, since WhatsApp's own share target
 * (reached via the Web Share API) inconsistently drops the accompanying caption/link once a file is
 * attached.
 *
 * Facebook sharing instead tries the OS share sheet (Web Share API with `files`) first, so the
 * captured image attaches directly to the Facebook post with no manual download/re-upload — the
 * trade-off, accepted deliberately, is that Facebook's app drops the accompanying caption/result
 * link when a file is attached this way. Where the Web Share API isn't available (desktop browsers,
 * mainly) it falls back to the same download + link-preview sharer.php flow as before.
 */
@Injectable({ providedIn: 'root' })
export class ShareCardService {
  private readonly cache = new WeakMap<HTMLElement, Blob>();

  buildQrCodeDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, { margin: 1, width: 240 });
  }

  /** Drops the cached capture for `el` — call before `capture()` whenever the element's content may have changed since the last capture (e.g. a permanently-mounted card reused across shares). */
  invalidate(el: HTMLElement): void {
    this.cache.delete(el);
  }

  /** Renders `el` to a PNG blob. Cached per element — call `invalidate()` after changing the card's content. */
  async capture(el: HTMLElement): Promise<Blob> {
    const cached = this.cache.get(el);
    if (cached) {
      return cached;
    }

    // Without this, a card whose custom font hasn't finished loading yet gets captured with the
    // fallback font substituted in — the most common cause of "why does the exported PNG look wrong".
    await document.fonts.ready;

    const canvas = await withPatchedCreatePattern(() =>
      html2canvas(el, {
        scale: 3, // 360px design width -> ~1080px export, matching a 1080x1350 share image
        backgroundColor: null,
        useCORS: true,
      })
    );

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

  async shareToWhatsApp(el: HTMLElement, options: ShareCardOptions = {}): Promise<void> {
    const { fileName = 'نتيجتي.png', shareTitle = 'نتيجتي', shareText = '' } = options;
    const blob = await this.capture(el);

    this.download(blob, fileName);
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText || shareTitle)}`, '_blank', 'noopener');
  }

  /**
   * Returns `'native'` when the image was handed directly to the OS share sheet (no download
   * needed), or `'download'` when it fell back to the download + sharer.php link-preview flow —
   * callers use this to decide whether the "attach the downloaded image yourself" hint still applies.
   */
  async shareToFacebook(el: HTMLElement, options: ShareCardOptions = {}): Promise<'native' | 'download'> {
    const { fileName = 'نتيجتي.png', shareTitle = 'نتيجتي', shareText = '', pageUrl } = options;
    const blob = await this.capture(el);
    const file = new File([blob], fileName, { type: 'image/png' });

    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: shareTitle, text: shareText || shareTitle });
        return 'native';
      } catch (err) {
        // AbortError means the user dismissed the share sheet themselves — respect that instead of
        // falling back to a download they didn't ask for. Any other failure (e.g. no app on the
        // sheet actually accepted the file) falls through to the link-preview flow below.
        if (err instanceof DOMException && err.name === 'AbortError') {
          return 'native';
        }
      }
    }

    this.download(blob, fileName);
    if (pageUrl) {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank', 'noopener');
    }
    return 'download';
  }
}
