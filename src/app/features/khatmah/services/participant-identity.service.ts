import { Injectable } from '@angular/core';

const PARTICIPANT_TOKEN_KEY = 'khatmah:participant_token';
const LAST_DISPLAY_NAME_KEY = 'khatmah:last_display_name';
const ownerTokenKey = (khatmahId: string) => `khatmah:owner_token:${khatmahId}`;
const myPartsKey = (khatmahId: string) => `khatmah:my_parts:${khatmahId}`;

/**
 * Manages this browser's anonymous identity for the khatmah feature — a persistent
 * participant UUID, the last-used display name, and per-khatmah owner tokens / "my parts"
 * caches. There is no login, so this localStorage identity is the only way a returning
 * visitor is recognized; losing it means losing access to reservations/ownership made under it.
 */
@Injectable({ providedIn: 'root' })
export class ParticipantIdentityService {
  getParticipantToken(): string {
    let token = localStorage.getItem(PARTICIPANT_TOKEN_KEY);
    if (!token) {
      token = crypto.randomUUID();
      localStorage.setItem(PARTICIPANT_TOKEN_KEY, token);
    }
    return token;
  }

  getLastDisplayName(): string | null {
    return localStorage.getItem(LAST_DISPLAY_NAME_KEY);
  }

  setLastDisplayName(name: string): void {
    localStorage.setItem(LAST_DISPLAY_NAME_KEY, name);
  }

  getOwnerToken(khatmahId: string): string | null {
    return localStorage.getItem(ownerTokenKey(khatmahId));
  }

  setOwnerToken(khatmahId: string, ownerToken: string): void {
    localStorage.setItem(ownerTokenKey(khatmahId), ownerToken);
  }

  isOwner(khatmahId: string): boolean {
    return this.getOwnerToken(khatmahId) !== null;
  }

  getMyPartIds(khatmahId: string): string[] {
    const raw = localStorage.getItem(myPartsKey(khatmahId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  }

  addMyPartId(khatmahId: string, partId: string): void {
    const ids = new Set(this.getMyPartIds(khatmahId));
    ids.add(partId);
    localStorage.setItem(myPartsKey(khatmahId), JSON.stringify([...ids]));
  }

  removeMyPartId(khatmahId: string, partId: string): void {
    const ids = this.getMyPartIds(khatmahId).filter((id) => id !== partId);
    localStorage.setItem(myPartsKey(khatmahId), JSON.stringify(ids));
  }
}
