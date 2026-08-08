export const MAX_SOURCE_FILE_BYTES = 15 * 1024 * 1024; // 15MB — generous for any phone photo, caps worst-case memory
export const MAX_SOURCE_DIMENSION = 8000; // px — guards against decompression-bomb-style small-file/huge-pixel images
export const ACCEPTED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export type ImageValidationError = 'unsupported-type' | 'too-large' | 'corrupt-or-unreadable' | 'dimensions-too-large';

export type ImageValidationResult =
  | { ok: true; width: number; height: number }
  | { ok: false; error: ImageValidationError };

function hasAcceptedExtension(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_IMAGE_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

/**
 * Validates a picked file is a real, decodable image before it ever reaches the crop dialog.
 * Checks MIME + extension and the file-size cap before doing any decode, then uses
 * `createImageBitmap` (discarded immediately) as the actual "is this a real image" check — the
 * crop dialog does its own independent decode, so this one is validation-only.
 */
export async function validateImageFile(file: File): Promise<ImageValidationResult> {
  const mimeOk = (ACCEPTED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type);
  if (!mimeOk || !hasAcceptedExtension(file.name)) {
    return { ok: false, error: 'unsupported-type' };
  }

  if (file.size === 0 || file.size > MAX_SOURCE_FILE_BYTES) {
    return { ok: false, error: 'too-large' };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, error: 'corrupt-or-unreadable' };
  }

  const { width, height } = bitmap;
  bitmap.close();

  if (width === 0 || height === 0) {
    return { ok: false, error: 'corrupt-or-unreadable' };
  }
  if (width > MAX_SOURCE_DIMENSION || height > MAX_SOURCE_DIMENSION) {
    return { ok: false, error: 'dimensions-too-large' };
  }

  return { ok: true, width, height };
}

export function imageValidationErrorMessage(error: ImageValidationError): string {
  switch (error) {
    case 'unsupported-type':
      return 'صيغة الملف غير مدعومة، يرجى اختيار صورة بصيغة JPG أو PNG أو WebP.';
    case 'too-large':
      return 'حجم الصورة كبير جدًا، يرجى اختيار صورة أصغر من 15 ميجابايت.';
    case 'dimensions-too-large':
      return 'أبعاد الصورة كبيرة جدًا، يرجى اختيار صورة بدقة أقل.';
    case 'corrupt-or-unreadable':
      return 'تعذر قراءة هذه الصورة، يرجى اختيار ملف صورة آخر.';
  }
}
