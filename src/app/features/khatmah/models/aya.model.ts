/** Maps to the existing public.quran_ayahs Postgres table. */
export interface AyaRecord {
  id: number;
  jozz: number;
  sura_no: number;
  sura_name_en: string;
  sura_name_ar: string;
  page: number;
  line_start: number;
  line_end: number;
  aya_no: number;
  aya_text: string;
  aya_text_emlaey: string;
}

export interface QuranPage {
  page: number;
  ayahs: AyaRecord[];
}
