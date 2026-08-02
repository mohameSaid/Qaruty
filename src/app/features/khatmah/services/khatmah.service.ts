import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';
import { SupabaseClientService } from './supabase-client.service';
import { fromSupabase } from './from-supabase.util';
import { CreateKhatmahRequest, CreateKhatmahResult, Khatmah, KhatmahWithProgress } from '../models/khatmah.model';
import { Participant } from '../models/participant.model';
import { Part } from '../models/part.model';
import { ActivityEntry } from '../models/activity.model';

const ACTIVITY_FEED_LIMIT = 20;

@Injectable({ providedIn: 'root' })
export class KhatmahService {
  private readonly supabase = inject(SupabaseClientService);

  createKhatmah(request: CreateKhatmahRequest): Observable<CreateKhatmahResult> {
    return fromSupabase<CreateKhatmahResult>(
      this.supabase.client.rpc('create_khatmah', {
        p_title: request.title,
        p_description: request.description ?? null,
        p_intention: request.intention ?? null,
        p_is_public: request.is_public,
        p_start_date: request.start_date ?? null,
        p_end_date: request.end_date ?? null,
        p_theme_color: request.theme_color ?? null,
        p_image_url: request.image_url ?? null,
      })
    );
  }

  getBySlug(slug: string): Observable<Khatmah> {
    return fromSupabase<Khatmah>(this.supabase.client.from('khatmahs').select('*').eq('slug', slug).single());
  }

  listPublic(): Observable<KhatmahWithProgress[]> {
    return fromSupabase<Khatmah[]>(
      this.supabase.client
        .from('khatmahs')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
    ).pipe(
      switchMap((khatmahs) => {
        if (khatmahs.length === 0) {
          return of<KhatmahWithProgress[]>([]);
        }
        const ids = khatmahs.map((k) => k.id);
        return fromSupabase<{ khatmah_id: string }[]>(
          this.supabase.client.from('parts').select('khatmah_id').eq('status', 'completed').in('khatmah_id', ids)
        ).pipe(
          map((completedParts) => {
            const counts = new Map<string, number>();
            for (const row of completedParts) {
              counts.set(row.khatmah_id, (counts.get(row.khatmah_id) ?? 0) + 1);
            }
            return khatmahs.map((k) => ({ ...k, completedCount: counts.get(k.id) ?? 0 }));
          })
        );
      })
    );
  }

  joinKhatmah(khatmahId: string, participantToken: string, displayName: string): Observable<Participant> {
    return fromSupabase<Participant>(
      this.supabase.client.rpc('join_khatmah', {
        p_khatmah_id: khatmahId,
        p_participant_token: participantToken,
        p_display_name: displayName,
      })
    );
  }

  closeKhatmah(khatmahId: string, ownerToken: string): Observable<Khatmah> {
    return fromSupabase<Khatmah>(
      this.supabase.client.rpc('close_khatmah', { p_khatmah_id: khatmahId, p_owner_token: ownerToken })
    );
  }

  adminReleasePart(partId: string, ownerToken: string): Observable<Part> {
    return fromSupabase<Part>(
      this.supabase.client.rpc('admin_release_part', { p_part_id: partId, p_owner_token: ownerToken })
    );
  }

  listActivity(khatmahId: string): Observable<ActivityEntry[]> {
    return fromSupabase<ActivityEntry[]>(
      this.supabase.client
        .from('activity')
        .select('*')
        .eq('khatmah_id', khatmahId)
        .order('created_at', { ascending: false })
        .limit(ACTIVITY_FEED_LIMIT)
    );
  }
}
