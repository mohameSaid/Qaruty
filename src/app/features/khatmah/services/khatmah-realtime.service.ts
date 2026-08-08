import { Injectable, NgZone, inject } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';
import { PartsBoardStore } from '../store/parts-board.store';
import { ActivityFeedStore } from '../store/activity-feed.store';
import { KhatmahStore } from '../store/khatmah.store';
import { Part } from '../models/part.model';
import { ActivityEntry } from '../models/activity.model';
import { Khatmah } from '../models/khatmah.model';

/**
 * Owns one Supabase Realtime channel per open khatmah view and feeds incoming
 * postgres_changes payloads directly into the signal stores' mutator methods —
 * matching this app's existing convention of plain store mutators rather than
 * an Observable/scan pipeline. ngZone.run wrapping is defensive/self-documenting;
 * zone.js already patches WebSocket by default so change detection fires either way.
 */
@Injectable({ providedIn: 'root' })
export class KhatmahRealtimeService {
  private readonly supabase = inject(SupabaseClientService);
  private readonly partsBoardStore = inject(PartsBoardStore);
  private readonly activityFeedStore = inject(ActivityFeedStore);
  private readonly khatmahStore = inject(KhatmahStore);
  private readonly ngZone = inject(NgZone);

  private channel: RealtimeChannel | null = null;

  connect(khatmahId: string): void {
    this.disconnect();

    this.channel = this.supabase.client
      .channel(`khatmah:${khatmahId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parts', filter: `khatmah_id=eq.${khatmahId}` },
        (payload) => this.ngZone.run(() => this.partsBoardStore.applyPartRealtimeUpdate(payload.new as Part))
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'activity', filter: `khatmah_id=eq.${khatmahId}` },
        (payload) => this.ngZone.run(() => this.activityFeedStore.addEntry(payload.new as ActivityEntry))
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'khatmahs', filter: `id=eq.${khatmahId}` },
        (payload) => this.ngZone.run(() => this.khatmahStore.applyRealtimeUpdate(payload.new as Khatmah))
      )
      .subscribe();
  }

  disconnect(): void {
    if (this.channel) {
      this.supabase.client.removeChannel(this.channel);
      this.channel = null;
    }
  }
}
