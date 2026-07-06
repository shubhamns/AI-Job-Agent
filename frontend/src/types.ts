export type User = {
  id: number;
  email: string;
  is_active: boolean;
};

export type CandidateProfile = {
  id: number;
  user_id: number;
  full_name: string | null;
  phone: string | null;
  location: string | null;
  summary: string | null;
  years_experience: number | null;
  skills: string[];
  work_authorization: string | null;
};

export type JobPreference = {
  id: number;
  user_id: number;
  desired_titles: string[];
  preferred_locations: string[];
  remote_preference: string | null;
  employment_types: string[];
  required_excluded_technologies: string[];
  preferred_excluded_technologies: string[];
  salary_min: number | null;
  salary_currency: string | null;
};

export type NormalizedJob = {
  source: string;
  source_job_id: string;
  title: string;
  company_name: string | null;
  location_display: string | null;
  location_area: string[];
  description: string;
  category: string | null;
  employment_type: string | null;
  remote_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  redirect_url: string;
  posted_at: string | null;
  raw_payload: Record<string, unknown>;
};

export type JobMatch = {
  dedupe_key: string;
  score: number;
  tracking_status: "new" | "saved" | "applied" | "skipped";
  job: NormalizedJob;
  matched_skills: string[];
  preferred_excluded_technologies_found: string[];
  filter_decision: {
    passed: boolean;
    reasons: string[];
    required_excluded_technologies_found: string[];
  };
  score_breakdown: {
    title_points: number;
    skill_points: number;
    location_points: number;
    employment_type_points: number;
    compensation_points: number;
    preferred_exclusion_penalty: number;
  };
};

export type TrackedJob = {
  source: string;
  source_job_id: string;
  dedupe_key: string;
  status: "saved" | "applied" | "skipped";
  score: number | null;
  job: NormalizedJob;
  updated_at: string;
};

export type TelegramStatus = {
  connected: boolean;
  notifications_enabled: boolean;
  notify_min_score: number;
};

export type TelegramLink = {
  link_url: string;
  bot_username: string | null;
};

export type DashboardStats = {
  total_saved: number;
  total_applied: number;
  total_skipped: number;
  total_tracked: number;
  average_saved_score: number;
  recent_activity: TrackedJob[];
};

