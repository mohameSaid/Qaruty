export type ActivityAction =
  | 'khatmah_created'
  | 'reserved'
  | 'started_reading'
  | 'completed'
  | 'released'
  | 'admin_released'
  | 'auto_released'
  | 'khatmah_closed';

export interface ActivityEntry {
  id: number;
  khatmah_id: string;
  part_number: number | null;
  participant_id: string | null;
  display_name_snapshot: string | null;
  action: ActivityAction;
  meta: Record<string, unknown>;
  created_at: string;
}
