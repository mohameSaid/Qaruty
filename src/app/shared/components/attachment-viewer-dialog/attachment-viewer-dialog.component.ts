import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

export interface AttachmentViewerDialogData {
  title: string;
  url: string;
  mimeType: string;
}

@Component({
  selector: 'app-attachment-viewer-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content class="attachment-content">
      @if (isImage) {
        <img [src]="data.url" [alt]="data.title" />
      } @else if (isPdf) {
        <iframe [src]="safeUrl" title="attachment"></iframe>
      } @else {
        <p>لا يمكن معاينة هذا النوع من الملفات.</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <a mat-button [href]="data.url" target="_blank" rel="noopener">تنزيل</a>
      <button mat-flat-button (click)="dialogRef.close()">إغلاق</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .attachment-content {
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 320px;
        min-height: 240px;
      }
      img {
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
      }
      iframe {
        width: 70vw;
        height: 70vh;
        border: none;
      }
    `,
  ],
})
export class AttachmentViewerDialogComponent {
  readonly dialogRef = inject(MatDialogRef<AttachmentViewerDialogComponent>);
  readonly data: AttachmentViewerDialogData = inject(MAT_DIALOG_DATA);
  private readonly sanitizer = inject(DomSanitizer);

  readonly isImage = this.data.mimeType.startsWith('image/');
  readonly isPdf = this.data.mimeType === 'application/pdf';
  readonly safeUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.data.url);
}
