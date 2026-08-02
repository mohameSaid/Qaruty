import { Injectable } from '@angular/core';
import * as QRCode from 'qrcode';

@Injectable({ providedIn: 'root' })
export class ShareLinkService {
  buildKhatmahUrl(slug: string): string {
    return `${window.location.origin}/k/${slug}`;
  }

  buildWhatsAppUrl(text: string): string {
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  buildTelegramUrl(url: string, text: string): string {
    return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  }

  buildQrCodeDataUrl(url: string): Promise<string> {
    return QRCode.toDataURL(url, { margin: 1, width: 240 });
  }
}
