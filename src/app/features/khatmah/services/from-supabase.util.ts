import { Observable } from 'rxjs';
import type { PostgrestError } from '@supabase/supabase-js';

/** Bridges a Supabase Promise<{data,error}> response into an Observable<T>, matching this app's Observable-based service convention. */
export function fromSupabase<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>
): Observable<T> {
  return new Observable<T>((subscriber) => {
    promise.then(
      ({ data, error }) => {
        if (error) {
          subscriber.error(error);
        } else {
          subscriber.next(data as T);
          subscriber.complete();
        }
      },
      (err) => subscriber.error(err)
    );
  });
}
