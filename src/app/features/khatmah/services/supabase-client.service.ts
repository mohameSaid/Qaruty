import { Injectable } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseClientService {
  readonly client: SupabaseClient = createClient(environment.supabase.url, environment.supabase.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
