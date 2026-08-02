export type PartStatus = 'available' | 'reserved' | 'reading' | 'completed';

export interface Part {
  id: string;
  khatmah_id: string;
  part_number: number;
  status: PartStatus;
  participant_id: string | null;
  reader_display_name: string | null;
  reserved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  progress_percent: number;
  last_page: number | null;
  updated_at: string;
}
