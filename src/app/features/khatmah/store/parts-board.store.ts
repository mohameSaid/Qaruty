import { Injectable, computed, inject, signal } from '@angular/core';
import { Part } from '../models/part.model';
import { ParticipantIdentityService } from '../services/participant-identity.service';

@Injectable({ providedIn: 'root' })
export class PartsBoardStore {
  private readonly identity = inject(ParticipantIdentityService);

  private readonly _khatmahId = signal<string | null>(null);
  private readonly _parts = signal<Part[]>([]);
  private readonly _loading = signal(false);

  readonly parts = this._parts.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly totalCount = computed(() => this._parts().length);
  readonly completedCount = computed(() => this._parts().filter((p) => p.status === 'completed').length);
  readonly availableCount = computed(() => this._parts().filter((p) => p.status === 'available').length);
  readonly reservedCount = computed(() => this._parts().filter((p) => p.status === 'reserved').length);
  readonly readingCount = computed(() => this._parts().filter((p) => p.status === 'reading').length);
  readonly progressPercent = computed(() =>
    this.totalCount() ? Math.round((this.completedCount() / this.totalCount()) * 100) : 0
  );

  /** UX convenience only — real ownership is always enforced server-side by the RPCs. */
  readonly myParts = computed(() => {
    const khatmahId = this._khatmahId();
    if (!khatmahId) return [];
    const myIds = new Set(this.identity.getMyPartIds(khatmahId));
    return this._parts().filter((p) => myIds.has(p.id));
  });

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setParts(khatmahId: string, parts: Part[]): void {
    this._khatmahId.set(khatmahId);
    this._parts.set([...parts].sort((a, b) => a.part_number - b.part_number));
  }

  applyPartRealtimeUpdate(part: Part): void {
    this._parts.update((parts) => {
      const index = parts.findIndex((p) => p.id === part.id);
      if (index === -1) {
        return [...parts, part].sort((a, b) => a.part_number - b.part_number);
      }
      const next = [...parts];
      next[index] = part;
      return next;
    });
  }

  clear(): void {
    this._khatmahId.set(null);
    this._parts.set([]);
  }
}
