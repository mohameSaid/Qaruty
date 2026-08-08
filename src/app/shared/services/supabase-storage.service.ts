import { Injectable, inject } from '@angular/core';
import { SupabaseClientService } from '../../core/services/supabase-client.service';

const PROFILE_IMAGES_BUCKET = 'profile-images';

/** `[extension, mimeType]` pairs to probe, in the same preference order `ImageProcessingService` writes them in. */
const PROFILE_IMAGE_VARIANTS: ReadonlyArray<['webp' | 'jpg', 'image/webp' | 'image/jpeg']> = [
  ['webp', 'image/webp'],
  ['jpg', 'image/jpeg'],
];

export interface ExistingProfileImage {
  blob: Blob;
  mimeType: 'image/webp' | 'image/jpeg';
  url: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseStorageService {
  private readonly supabase = inject(SupabaseClientService);

  /**
   * Uploads a processed profile image to `{userId}/profile.<ext>` — a deterministic key, so
   * re-uploading overwrites the previous photo instead of accumulating orphaned files. Returns a
   * cache-busted public URL: the raw `getPublicUrl()` result never changes across re-uploads since
   * the key is stable, so without the `?v=` param a browser/CDN could keep serving a stale image.
   */
  async uploadProfileImage(userId: number, blob: Blob, mimeType: 'image/webp' | 'image/jpeg'): Promise<string> {
    const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/profile.${ext}`;

    const { error } = await this.supabase.client.storage
      .from(PROFILE_IMAGES_BUCKET)
      .upload(path, blob, { contentType: mimeType, upsert: true, cacheControl: '3600' });
    if (error) {
      console.error('SupabaseStorageService.uploadProfileImage failed', error);
      throw new Error('تعذر رفع الصورة، حاول مرة أخرى.');
    }

    const { data } = this.supabase.client.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
    return `${data.publicUrl}?v=${Date.now()}`;
  }

  /**
   * Looks up a previously-uploaded profile photo by the same deterministic `{userId}/profile.<ext>`
   * key `uploadProfileImage` writes to — lets the app restore the photo on page load/reload without
   * needing backend persistence of the URL (see `ProfilePageComponent`'s open item on that). Returns
   * the actual `Blob` (via `download()`, not just a URL) so the caller can wrap it in a local
   * `blob:` object URL — same reasoning as the upload flow: keeps `ResultShareCardComponent` free of
   * cross-origin images so its `html2canvas` capture stays reliable.
   */
  async fetchExistingProfileImage(userId: number): Promise<ExistingProfileImage | null> {
    for (const [ext, mimeType] of PROFILE_IMAGE_VARIANTS) {
      const path = `${userId}/profile.${ext}`;
      const { data, error } = await this.supabase.client.storage.from(PROFILE_IMAGES_BUCKET).download(path);
      if (data && !error) {
        const { data: urlData } = this.supabase.client.storage.from(PROFILE_IMAGES_BUCKET).getPublicUrl(path);
        return { blob: data, mimeType, url: `${urlData.publicUrl}?v=${Date.now()}` };
      }
    }
    return null;
  }
}
