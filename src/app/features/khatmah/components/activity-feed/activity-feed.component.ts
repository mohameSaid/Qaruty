import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivityEntry } from '../../models/activity.model';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './activity-feed.component.html',
  styleUrl: './activity-feed.component.scss',
})
export class ActivityFeedComponent {
  readonly entries = input.required<ActivityEntry[]>();

  formatEntry(entry: ActivityEntry): string {
    const name = entry.display_name_snapshot;
    const partLabel = entry.part_number ? `الجزء ${entry.part_number}` : '';
    switch (entry.action) {
      case 'khatmah_created':
        return 'تم إنشاء الختمة';
      case 'reserved':
        return `${name} حجز ${partLabel}`;
      case 'started_reading':
        return `${name} بدأ ${partLabel}`;
      case 'completed':
        return `${name} أنهى ${partLabel}`;
      case 'released':
        return `تم تحرير ${partLabel}`;
      case 'admin_released':
        return `قام المشرف بتحرير ${partLabel}`;
      case 'auto_released':
        return `تم إلغاء حجز ${partLabel} تلقائيًا لانتهاء الوقت`;
      case 'khatmah_closed':
        return 'تم إغلاق الختمة';
    }
  }

  iconFor(entry: ActivityEntry): string {
    switch (entry.action) {
      case 'completed':
        return 'check_circle';
      case 'started_reading':
        return 'menu_book';
      case 'reserved':
        return 'schedule';
      case 'released':
      case 'admin_released':
      case 'auto_released':
        return 'undo';
      case 'khatmah_created':
        return 'auto_stories';
      case 'khatmah_closed':
        return 'lock';
    }
  }
}
