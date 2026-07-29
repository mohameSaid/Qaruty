import { LocalizedName, LookupItem } from '../../users/models/lookup.model';

export type LookupTypeKey = 'governorate' | 'city' | 'village' | 'studyLevel' | 'instructor' | 'place';

/** Static config describing every real lookup resource already used elsewhere in the app
 * (`src/app/features/users/services/lookup.service.ts`), so all of them are manageable here.
 * `parentType` marks resources whose GET/POST require a `parentId` from another lookup type
 * (city -> governorate, village -> city). */
export interface LookupTypeConfig {
  key: LookupTypeKey;
  label: string;
  parentType?: LookupTypeKey;
  parentLabel?: string;
}

export const LOOKUP_TYPES: LookupTypeConfig[] = [
  { key: 'governorate', label: 'المحافظات' },
  { key: 'city', label: 'المدن', parentType: 'governorate', parentLabel: 'المحافظة' },
  { key: 'village', label: 'القرى', parentType: 'city', parentLabel: 'المدينة' },
  { key: 'studyLevel', label: 'المراحل الدراسية' },
  { key: 'instructor', label: 'المدربون' },
  { key: 'place', label: 'الأماكن' },
];

export interface LookupItemInput {
  name: LocalizedName;
}

export type { LookupItem };
