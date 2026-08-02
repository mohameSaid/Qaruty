import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SupabaseClientService } from './supabase-client.service';
import { fromSupabase } from './from-supabase.util';
import { Part } from '../models/part.model';

@Injectable({ providedIn: 'root' })
export class PartsService {
  private readonly supabase = inject(SupabaseClientService);

  listParts(khatmahId: string): Observable<Part[]> {
    return fromSupabase<Part[]>(
      this.supabase.client.from('parts').select('*').eq('khatmah_id', khatmahId).order('part_number')
    );
  }

  getPart(khatmahId: string, partNumber: number): Observable<Part> {
    return fromSupabase<Part>(
      this.supabase.client
        .from('parts')
        .select('*')
        .eq('khatmah_id', khatmahId)
        .eq('part_number', partNumber)
        .single()
    );
  }

  reservePart(khatmahId: string, partNumber: number, participantToken: string, displayName: string): Observable<Part> {
    return fromSupabase<Part>(
      this.supabase.client.rpc('reserve_part', {
        p_khatmah_id: khatmahId,
        p_part_number: partNumber,
        p_participant_token: participantToken,
        p_display_name: displayName,
      })
    );
  }

  startReading(partId: string, participantToken: string): Observable<Part> {
    return fromSupabase<Part>(
      this.supabase.client.rpc('start_reading', { p_part_id: partId, p_participant_token: participantToken })
    );
  }

  updateProgress(
    partId: string,
    participantToken: string,
    progressPercent: number,
    lastPage: number | null = null
  ): Observable<Part> {
    return fromSupabase<Part>(
      this.supabase.client.rpc('update_progress', {
        p_part_id: partId,
        p_participant_token: participantToken,
        p_progress_percent: progressPercent,
        p_last_page: lastPage,
      })
    );
  }

  completePart(partId: string, participantToken: string): Observable<Part> {
    return fromSupabase<Part>(
      this.supabase.client.rpc('complete_part', { p_part_id: partId, p_participant_token: participantToken })
    );
  }

  releasePart(partId: string, participantToken: string): Observable<Part> {
    return fromSupabase<Part>(
      this.supabase.client.rpc('release_part', { p_part_id: partId, p_participant_token: participantToken })
    );
  }

  /** Client-triggered visual-freshness sweep — see khatmah-view-page's 60s poll. reserve_part also sweeps server-side. */
  releaseExpiredReservations(khatmahId: string): Observable<number> {
    return fromSupabase<number>(this.supabase.client.rpc('release_expired_reservations', { p_khatmah_id: khatmahId }));
  }
}
