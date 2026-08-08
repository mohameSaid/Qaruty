import { ChangeDetectionStrategy, Component, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImageCropperComponent } from 'ngx-image-cropper';

import { SnackbarService } from '../../../core/services/snackbar.service';
import {
  ImageCompressionBudgetExceededError,
  ImageProcessingService,
} from '../../services/image-processing.service';
import { formatFileSize } from '../../utils/format-bytes.util';

export interface AvatarCropDialogData {
  file: File;
}

export interface AvatarCropDialogResult {
  blob: Blob;
  mimeType: 'image/webp' | 'image/jpeg';
  width: number;
  height: number;
  sizeBytes: number;
}

type Step = 'crop' | 'processing' | 'preview';

/** Crop -> compress -> preview flow for the profile photo, hosted as a `MatDialog`. */
@Component({
  selector: 'app-avatar-crop-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatProgressSpinnerModule, ImageCropperComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './avatar-crop-dialog.component.html',
  styleUrl: './avatar-crop-dialog.component.scss',
})
export class AvatarCropDialogComponent implements OnDestroy {
  private readonly data: AvatarCropDialogData = inject(MAT_DIALOG_DATA);
  readonly dialogRef = inject(MatDialogRef<AvatarCropDialogComponent, AvatarCropDialogResult | undefined>);
  private readonly imageProcessing = inject(ImageProcessingService);
  private readonly snackbar = inject(SnackbarService);

  readonly file = this.data.file;
  readonly step = signal<Step>('crop');
  readonly cropperReady = signal(false);
  readonly processedResult = signal<AvatarCropDialogResult | null>(null);
  readonly previewObjectUrl = signal<string | null>(null);
  readonly formatFileSize = formatFileSize;

  private readonly cropper = viewChild(ImageCropperComponent);

  onCropperReady(): void {
    this.cropperReady.set(true);
  }

  onLoadImageFailed(): void {
    this.snackbar.error('تعذر تحميل الصورة للقص، جرّب صورة أخرى.');
    this.dialogRef.close(undefined);
  }

  async confirmCrop(): Promise<void> {
    const cropper = this.cropper();
    if (!cropper) {
      return;
    }

    const cropPromise = cropper.crop('blob');
    if (!cropPromise) {
      return;
    }

    this.step.set('processing');
    try {
      const cropped = await cropPromise;
      if (!cropped.blob) {
        throw new Error('empty crop result');
      }

      const result = await this.imageProcessing.resizeAndCompress(cropped.blob, {
        maxDimension: 480,
        targetMaxBytes: 500 * 1024,
      });

      this.revokePreviewUrl();
      const url = URL.createObjectURL(result.blob);
      this.previewObjectUrl.set(url);
      this.processedResult.set(result);
      this.step.set('preview');
    } catch (err) {
      if (err instanceof ImageCompressionBudgetExceededError) {
        this.snackbar.error('يصعب تصغير هذه الصورة إلى الحجم المطلوب، جرّب صورة أخرى أو قصًا أصغر.');
      } else {
        console.error('AvatarCropDialogComponent.confirmCrop failed', err);
        this.snackbar.error('تعذرت معالجة الصورة، حاول مرة أخرى.');
      }
      this.step.set('crop');
    }
  }

  backToCrop(): void {
    this.revokePreviewUrl();
    this.processedResult.set(null);
    this.step.set('crop');
  }

  useThisImage(): void {
    const result = this.processedResult();
    if (result) {
      this.dialogRef.close(result);
    }
  }

  cancel(): void {
    this.dialogRef.close(undefined);
  }

  private revokePreviewUrl(): void {
    const url = this.previewObjectUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewObjectUrl.set(null);
    }
  }

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }
}
