export type KhatmahStatus = 'active' | 'closed';

export interface Khatmah {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  intention: string | null;
  is_public: boolean;
  start_date: string | null;
  end_date: string | null;
  theme_color: string | null;
  image_url: string | null;
  total_parts: number;
  status: KhatmahStatus;
  reservation_timeout_minutes: number;
  created_at: string;
  closed_at: string | null;
}

/** Returned only by create_khatmah — includes owner_token, never fetched again afterwards. */
export interface CreateKhatmahResult extends Khatmah {
  owner_token: string;
}

export interface CreateKhatmahRequest {
  title: string;
  description?: string | null;
  intention?: string | null;
  is_public: boolean;
  start_date?: string | null;
  end_date?: string | null;
  theme_color?: string | null;
  image_url?: string | null;
}

export interface KhatmahWithProgress extends Khatmah {
  completedCount: number;
}
