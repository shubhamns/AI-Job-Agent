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

export type AiFitScore = {
  score: number;
  rationale: string;
  score_source: string;
};

export type JobMatch = {
  dedupe_key: string;
  score: number;
  tracking_status: "new" | "saved" | "applied" | "skipped" | "interview" | "rejected" | "offer" | "no_response";
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
  ai_fit?: AiFitScore | null;
};

export type PipelineStatus = "applied" | "interview" | "rejected" | "offer" | "no_response";
export type TrackingStatus = "saved" | "applied" | "skipped" | PipelineStatus;

export type TrackedJob = {
  source: string;
  source_job_id: string;
  dedupe_key: string;
  status: TrackingStatus;
  score: number | null;
  ai_score: number | null;
  ai_score_rationale: string | null;
  notes: string | null;
  follow_up_at: string | null;
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
  total_interview: number;
  total_rejected: number;
  total_offer: number;
  total_no_response: number;
  total_tracked: number;
  average_saved_score: number;
  interview_rate: number;
  recent_activity: TrackedJob[];
  upcoming_follow_ups: TrackedJob[];
};

export type OutcomeBucket = {
  label: string;
  applied: number;
  interviews: number;
  offers: number;
  interview_rate: number;
  offer_rate: number;
};

export type OutcomeIntelligence = {
  total_applications: number;
  total_interviews: number;
  total_offers: number;
  overall_interview_rate: number;
  by_role_type: OutcomeBucket[];
  by_skill: OutcomeBucket[];
  by_location: OutcomeBucket[];
  by_salary_band: OutcomeBucket[];
  by_source: OutcomeBucket[];
};

export type StrategyRecommendation = {
  kind: "evidence" | "suggestion";
  title: string;
  message: string;
  metric: string | null;
  sample_size: number | null;
  confidence: string | null;
};

export type StrategyResponse = {
  recommendations: StrategyRecommendation[];
  llm_enabled: boolean;
  evidence_count: number;
  suggestion_count: number;
};

export type VerifiedClaim = {
  claim: string;
  source: string;
  verified: boolean;
};

export type ApplicationPack = {
  source: string;
  source_job_id: string;
  cv_suggestions: string[];
  cover_letter: string;
  interview_questions: string[];
  ats_keywords_present: string[];
  ats_keywords_missing: string[];
  verified_claims: VerifiedClaim[];
  pack_source: string;
};
