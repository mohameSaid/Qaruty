import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SupabaseClientService } from './supabase-client.service';
import { fromSupabase } from './from-supabase.util';
import { AyaRecord, QuranPage } from '../models/aya.model';

@Injectable({ providedIn: 'root' })
export class QuranReaderService {
  private readonly supabase = inject(SupabaseClientService);

  getJuzPages(jozz: number): Observable<QuranPage[]> {
    return fromSupabase<AyaRecord[]>(
      this.supabase.client.from('quran_ayahs').select('*').eq('jozz', jozz).order('id')
    ).pipe(map((ayahs) => groupByPage(ayahs)));
  }
}

function groupByPage(ayahs: AyaRecord[]): QuranPage[] {
  const pages = new Map<number, AyaRecord[]>();
  for (const aya of ayahs) {
    const list = pages.get(aya.page) ?? [];
    list.push(aya);
    pages.set(aya.page, list);
  }
  return [...pages.entries()]
    .sort(([pageA], [pageB]) => pageA - pageB)
    .map(([page, pageAyahs]) => ({ page, ayahs: pageAyahs }));
}
