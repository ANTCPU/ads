// ── Office types ─────────────────────────────────────────────
export type NextCohort = {
  cohort: string;
  opens: string;
  opens_in_days: number;
  signups: number;
  apply_url: string;
};

export type OfficeData = {
  id: string;
  handle: string;
  intern_id: string;
  name: string;
  initials: string;
  flag: string | null;
  color: string | null;
  track: TrackKey;
  country: string;
  progress_pct: number;
  role_title: string;
  badges: string[];
  completed_gates: string[];
  tasks_done: number;
  submissions: number;
  last_seen: string | null;
  ad_id: string | null;
  ad_url: string | null;
  github_handle: string | null;
  stack: string | null;
  channels: string | null;
  bio: string | null;
  links: Record<string, string> | null;
  cohort: string;
  is_captain: boolean | null;
  team_id: string | null;
  captain_team: string | null;
  team_notes: string | null;
  cutoff_status: string | null;
  elevation_level?: number;
  elevation_note?: string | null;
  banner_url?: string | null;
  brand_slug?: string | null;
  banner_unlocked?: boolean | null;
  arena_boost_unlocked?: boolean | null;
  cv_public?: boolean | null;
  is_graduate?: boolean | null;
  arena: {
    points: number;
    tier: string | null;
    is_champion: boolean;
    streak: number;
    visits: number;
    brand_name: string | null;
  } | null;
  activity: { label: string; icon: string; created_at: string }[];
  clock: {
    day: number;
    week: number;
    week_name: string;
    days_left_total: number;
    days_left_week: number | null;
    entry_open: boolean;
    next_cohort: NextCohort | null;
  } | null;
  presence: {
    sessions_active_1h: number;
    office_posts_today: number;
    virtual_office_live: boolean;
  } | null;
};

export type TrackKey = 'dev' | 'marketing';
