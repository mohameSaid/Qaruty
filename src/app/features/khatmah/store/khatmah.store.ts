import { Injectable, computed, signal } from '@angular/core';
import { Khatmah } from '../models/khatmah.model';

@Injectable({ providedIn: 'root' })
export class KhatmahStore {
  private readonly _khatmah = signal<Khatmah | null>(null);
  private readonly _loading = signal(false);

  readonly khatmah = this._khatmah.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly isClosed = computed(() => this._khatmah()?.status === 'closed');

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setKhatmah(khatmah: Khatmah): void {
    this._khatmah.set(khatmah);
  }

  applyRealtimeUpdate(khatmah: Khatmah): void {
    if (this._khatmah()?.id === khatmah.id) {
      this._khatmah.set(khatmah);
    }
  }

  clear(): void {
    this._khatmah.set(null);
  }
}
