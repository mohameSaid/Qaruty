import { Injectable } from '@angular/core';

export interface ImageProcessingOptions {
  maxDimension?: number;
  minDimension?: number;
  targetMaxBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  qualityStep?: number;
  dimensionStepFactor?: number;
}

export interface ProcessedImageResult {
  blob: Blob;
  mimeType: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  sizeBytes: number;
}

/** Thrown when no combination of quality/dimension within the configured floors fits `targetMaxBytes`. */
export class ImageCompressionBudgetExceededError extends Error {
  constructor(public readonly bestAttemptBytes: number) {
    super(`Could not compress image under the target byte budget (best attempt: ${bestAttemptBytes} bytes)`);
    this.name = 'ImageCompressionBudgetExceededError';
  }
}

const DEFAULT_OPTIONS: Required<ImageProcessingOptions> = {
  maxDimension: 480,
  minDimension: 300,
  targetMaxBytes: 500 * 1024,
  initialQuality: 0.9,
  minQuality: 0.5,
  qualityStep: 0.1,
  dimensionStepFactor: 0.85,
};

let webpSupportPromise: Promise<boolean> | null = null;

/** Some browsers silently substitute PNG for an unsupported `toBlob` MIME type — check `blob.type`, not just that the call didn't throw. */
function supportsWebpEncode(): Promise<boolean> {
  webpSupportPromise ??= new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    canvas.toBlob((blob) => resolve(!!blob && blob.type === 'image/webp'), 'image/webp', 0.8);
  });
  return webpSupportPromise;
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('تعذر إنشاء الصورة.'))), mimeType, quality);
  });
}

function drawSquare(bitmap: ImageBitmap, size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('تعذر إنشاء لوحة رسم للصورة.');
  }
  ctx.drawImage(bitmap, 0, 0, size, size);
  return canvas;
}

/**
 * Resizes and compresses an already-square cropped image blob so it fits within `targetMaxBytes`,
 * preferring WebP over JPEG. Never upscales beyond the source's own dimensions. Shrinks quality
 * before dimensions at each step (cheaper visual cost), and only steps dimensions down once the
 * quality ladder is exhausted at the current size.
 */
@Injectable({ providedIn: 'root' })
export class ImageProcessingService {
  async resizeAndCompress(source: Blob, options?: ImageProcessingOptions): Promise<ProcessedImageResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const mimeType: 'image/webp' | 'image/jpeg' = (await supportsWebpEncode()) ? 'image/webp' : 'image/jpeg';

    const bitmap = await createImageBitmap(source);
    try {
      let dimension = Math.min(opts.maxDimension, Math.max(bitmap.width, bitmap.height));
      let lastBlob: Blob | null = null;

      while (dimension >= opts.minDimension) {
        const canvas = drawSquare(bitmap, dimension);
        let quality = opts.initialQuality;

        while (quality >= opts.minQuality - 1e-9) {
          const blob = await canvasToBlob(canvas, mimeType, quality);
          lastBlob = blob;

          if (blob.size <= opts.targetMaxBytes) {
            return { blob, mimeType, width: dimension, height: dimension, sizeBytes: blob.size };
          }

          quality = Math.round((quality - opts.qualityStep) * 100) / 100;
        }

        const nextDimension = Math.round(dimension * opts.dimensionStepFactor);
        if (nextDimension >= dimension) {
          break;
        }
        dimension = nextDimension;
      }

      throw new ImageCompressionBudgetExceededError(lastBlob?.size ?? 0);
    } finally {
      bitmap.close();
    }
  }
}
