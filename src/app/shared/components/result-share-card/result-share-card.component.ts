import { ChangeDetectionStrategy, Component, ElementRef, input, viewChild } from '@angular/core';

/**
 * Renders the portrait (4:5) achievement card designed to be captured with `ShareCardService` and
 * shared as a PNG on WhatsApp/Facebook. Kept visually self-contained (no Material, no external
 * network requests once `participantPhoto` is a data URL) so the DOM `html2canvas` walks is simple
 * and captures reliably — see `ShareCardService` for the gotchas that shaped that constraint.
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
  readonly quranQuote = input('وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ فَهَلْ مِن مُّدَّكِرٍ');
  /** Data URL (see `readFileAsDataUrl`) for the medallion photo — shows a placeholder icon when absent. */
  readonly participantPhoto = input<string | null>(null);
  readonly participantName = input.required<string>();
  /** e.g. "شهادة إنجاز للطالب" vs "...للطالبة" — gendered by the caller, since this component has no notion of gender itself. */
  readonly participantLabel = input('شهادة إنجاز للطالب/ة');
  /** Overall grade text for the badge, e.g. "جيد جدا" — the backend's `grade.name.arabic`. */
  readonly evaluation = input.required<string>();
  readonly websiteUrl = input(window.location.origin);

  /** Native element `ShareCardService.capture()` renders — the whole card, aura and motifs included. */
  readonly captureRoot = viewChild.required<ElementRef<HTMLElement>>('captureRoot');
}
