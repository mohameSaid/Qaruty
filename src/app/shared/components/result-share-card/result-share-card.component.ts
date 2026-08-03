import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

/**
 * Renders a portrait (4:5) result card designed to be captured with `ShareCardService` and
 * shared as a PNG on WhatsApp/Facebook. Kept visually self-contained (no Material, no external
 * network requests once `qrDataUrl` is a data URL) so the DOM `html2canvas` walks is simple and
 * captures reliably — see `ShareCardService` for the gotchas that shaped that constraint.
 */
@Component({
  selector: 'app-result-share-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './result-share-card.component.html',
  styleUrl: './result-share-card.component.scss',
})
export class ResultShareCardComponent {
  readonly competitionName = input.required<string>();
  readonly participantName = input.required<string>();
  /** e.g. "النتيجة" for a score card or "الترتيب" for a rank card. */
  readonly resultLabel = input('النتيجة');
  /** e.g. "96" or "الأول". Free text so ranks ("الأول") and scores ("96") both fit. */
  readonly resultValue = input.required<string>();
  /** e.g. "/ 100". Left empty for rank cards. */
  readonly resultSuffix = input('');
  readonly location = input('');
  readonly date = input('');
  /** Pre-built data URL (see `ShareLinkService.buildQrCodeDataUrl`) — kept as a data URL so html2canvas never has to fetch it. */
  readonly qrDataUrl = input<string | null>(null);
  readonly variant = input<'score' | 'rank'>('score');

  /** Native element `ShareCardService.capture()` renders — the whole card, aura and motifs included. */
  readonly captureRoot = viewChild.required<ElementRef<HTMLElement>>('captureRoot');
}
