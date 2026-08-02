import { Injectable, signal } from '@angular/core';
import { ActivityEntry } from '../models/activity.model';

const MAX_ENTRIES = 20;

@Injectable({ providedIn: 'root' })
export class ActivityFeedStore {
  private readonly _entries = signal<ActivityEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  setInitial(entries: ActivityEntry[]): void {
    this._entries.set(entries.slice(0, MAX_ENTRIES));
  }

  addEntry(entry: ActivityEntry): void {
    this._entries.update((entries) => [entry, ...entries].slice(0, MAX_ENTRIES));
  }

  clear(): void {
    this._entries.set([]);
  }
}
