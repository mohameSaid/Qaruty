import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SnackbarService } from '../../../../core/services/snackbar.service';
import { ShareLinkService } from '../../services/share-link.service';

export interface ShareSheetData {
  slug: string;
  title: string;
}

@Component({
  selector: 'app-share-sheet',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './share-sheet.component.html',
  styleUrl: './share-sheet.component.scss',
})
export class ShareSheetComponent {
  readonly data: ShareSheetData = inject(MAT_DIALOG_DATA);
  private readonly shareLink = inject(ShareLinkService);
  private readonly snackbar = inject(SnackbarService);

  readonly url = this.shareLink.buildKhatmahUrl(this.data.slug);
  readonly shareText = `انضم إلينا في «${this.data.title}» — ${this.url}`;
  readonly whatsAppUrl = this.shareLink.buildWhatsAppUrl(this.shareText);
  readonly telegramUrl = this.shareLink.buildTelegramUrl(this.url, this.shareText);
  readonly qrCodeDataUrl = signal<string | null>(null);

  constructor() {
    this.shareLink.buildQrCodeDataUrl(this.url).then((dataUrl) => this.qrCodeDataUrl.set(dataUrl));
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.url).then(() => this.snackbar.success('تم نسخ الرابط.'));
  }
}
