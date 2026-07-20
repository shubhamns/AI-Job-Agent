import type {
  ApplicationPack,
  CandidateProfile,
  DashboardStats,
  JobMatch,
  JobPreference,
  NormalizedJob,
  OutcomeIntelligence,
  StrategyResponse,
  TrackedJob,
  TrackingStatus,
  User,
  TelegramLink,
  TelegramStatus,
} from "@/types";

const DEMO_USER: User = {
  id: 1,
  email: "demo@ai-job-agent.local",
  is_active: true,
};

function job(
  id: string,
  title: string,
  company: string,
  location: string,
  overrides: Partial<NormalizedJob> = {},
): NormalizedJob {
  return {
    source: "adzuna",
    source_job_id: id,
    title,
    company_name: company,
    location_display: location,
    location_area: location.split(",").map((part) => part.trim()),
    description: `We are hiring a ${title} to build scalable products for India-first users. You will work with modern stacks, ship quickly, and collaborate across product and design.`,
    category: "IT Jobs",
    employment_type: "permanent",
    remote_type: location.toLowerCase().includes("remote") ? "remote" : "hybrid",
    salary_min: 1800000,
    salary_max: 2800000,
    salary_currency: "INR",
    redirect_url: `https://example.com/jobs/${id}`,
    posted_at: "2026-07-15T10:00:00Z",
    raw_payload: {},
    ...overrides,
  };
}

function match(
  id: string,
  title: string,
  company: string,
  location: string,
  score: number,
  tracking: JobMatch["tracking_status"],
  skills: string[],
  aiScore?: number,
): JobMatch {
  return {
    dedupe_key: `adzuna:${id}`,
    score,
    tracking_status: tracking,
    job: job(id, title, company, location),
    matched_skills: skills,
    preferred_excluded_technologies_found: [],
    filter_decision: { passed: true, reasons: [], required_excluded_technologies_found: [] },
    score_breakdown: {
      title_points: 30,
      skill_points: 25,
      location_points: 15,
      employment_type_points: 10,
      compensation_points: 10,
      preferred_exclusion_penalty: 0,
    },
    ai_fit: aiScore
      ? { score: aiScore, rationale: "Strong overlap with React, TypeScript, and backend APIs.", score_source: "openai" }
      : null,
  };
}

function tracked(
  id: string,
  title: string,
  company: string,
  location: string,
  status: TrackingStatus,
  score: number,
  notes: string | null = null,
  followUp: string | null = null,
): TrackedJob {
  return {
    source: "adzuna",
    source_job_id: id,
    dedupe_key: `adzuna:${id}`,
    status,
    score,
    ai_score: score + 4,
    ai_score_rationale: "Good fit for your profile and preferred locations.",
    notes,
    follow_up_at: followUp,
    job: job(id, title, company, location),
    updated_at: "2026-07-18T09:30:00Z",
  };
}

export const demoProfile: CandidateProfile = {
  id: 1,
  user_id: 1,
  full_name: "Demo Candidate",
  phone: "+91 98765 43210",
  location: "Bangalore, India",
  summary: "Full-stack engineer with 5 years building React and FastAPI products for India-focused teams.",
  years_experience: 5,
  skills: ["React", "TypeScript", "Python", "FastAPI", "PostgreSQL", "Docker"],
  work_authorization: "India citizen",
};

export const demoPreferences: JobPreference = {
  id: 1,
  user_id: 1,
  desired_titles: ["Full Stack Developer", "Backend Engineer", "Software Engineer"],
  preferred_locations: ["Bangalore", "Hyderabad", "Remote India"],
  remote_preference: "remote-first",
  employment_types: ["permanent"],
  required_excluded_technologies: ["PHP"],
  preferred_excluded_technologies: ["WordPress"],
  salary_min: 1800000,
  salary_currency: "INR",
};

export const demoJobMatches: JobMatch[] = [
  match("1001", "Senior Full Stack Engineer", "Razorpay", "Bangalore", 88, "new", ["React", "TypeScript", "Python"], 91),
  match("1002", "Backend Engineer", "Swiggy", "Bangalore", 84, "saved", ["Python", "FastAPI", "PostgreSQL"], 86),
  match("1003", "Software Engineer II", "Freshworks", "Chennai", 79, "applied", ["React", "Node.js"], 82),
  match("1004", "Platform Engineer", "PhonePe", "Remote India", 82, "interview", ["Docker", "PostgreSQL"], 85),
  match("1005", "Frontend Engineer", "Zerodha", "Bangalore", 76, "skipped", ["React", "TypeScript"], 74),
  match("1006", "Full Stack Developer", "CRED", "Mumbai", 81, "new", ["React", "Python"], 80),
];

export const demoTrackedJobs: TrackedJob[] = [
  tracked("1002", "Backend Engineer", "Swiggy", "Bangalore", "saved", 84, "Strong Python role, review tomorrow."),
  tracked("1003", "Software Engineer II", "Freshworks", "Chennai", "applied", 79, "Submitted tailored CV.", "2026-07-22T10:00:00Z"),
  tracked("1004", "Platform Engineer", "PhonePe", "Remote India", "interview", 82, "Round 1 scheduled Friday.", "2026-07-21T14:00:00Z"),
];

export const demoDashboardStats: DashboardStats = {
  total_saved: 1,
  total_applied: 1,
  total_skipped: 1,
  total_interview: 1,
  total_rejected: 0,
  total_offer: 0,
  total_no_response: 0,
  total_tracked: 4,
  average_saved_score: 81,
  interview_rate: 0.5,
  recent_activity: demoTrackedJobs.slice(0, 3),
  upcoming_follow_ups: demoTrackedJobs.filter((item) => item.follow_up_at),
};

export const demoOutcomes: OutcomeIntelligence = {
  total_applications: 4,
  total_interviews: 2,
  total_offers: 0,
  overall_interview_rate: 0.5,
  by_role_type: [
    { label: "Backend", applied: 2, interviews: 1, offers: 0, interview_rate: 0.5, offer_rate: 0 },
    { label: "Full Stack", applied: 2, interviews: 1, offers: 0, interview_rate: 0.5, offer_rate: 0 },
  ],
  by_skill: [
    { label: "Python", applied: 3, interviews: 2, offers: 0, interview_rate: 0.67, offer_rate: 0 },
    { label: "React", applied: 3, interviews: 1, offers: 0, interview_rate: 0.33, offer_rate: 0 },
  ],
  by_location: [
    { label: "Bangalore", applied: 2, interviews: 1, offers: 0, interview_rate: 0.5, offer_rate: 0 },
    { label: "Remote", applied: 1, interviews: 1, offers: 0, interview_rate: 1, offer_rate: 0 },
  ],
  by_salary_band: [
    { label: "18-25 LPA", applied: 3, interviews: 2, offers: 0, interview_rate: 0.67, offer_rate: 0 },
  ],
  by_source: [
    { label: "adzuna", applied: 4, interviews: 2, offers: 0, interview_rate: 0.5, offer_rate: 0 },
  ],
};

export const demoStrategy: StrategyResponse = {
  recommendations: [
    {
      kind: "evidence",
      title: "Prioritize backend-heavy roles",
      message: "Backend titles converted to interviews 50% of the time in your tracked sample.",
      metric: "50% interview rate",
      sample_size: 4,
      confidence: "medium",
    },
    {
      kind: "suggestion",
      title: "Expand remote-first search",
      message: "Remote India roles show stronger AI fit scores than hybrid-only listings.",
      metric: null,
      sample_size: null,
      confidence: "low",
    },
  ],
  llm_enabled: true,
  evidence_count: 1,
  suggestion_count: 1,
};

export const demoTelegramStatus: TelegramStatus = {
  connected: false,
  notifications_enabled: false,
  notify_min_score: 75,
};

export const demoTelegramLink: TelegramLink = {
  link_url: "https://t.me/demo_bot?start=demo",
  bot_username: "ai_job_agent_demo_bot",
};

export function demoApplicationPack(source: string, sourceJobId: string): ApplicationPack {
  return {
    source,
    source_job_id: sourceJobId,
    cv_suggestions: [
      "Lead with React + FastAPI project impact using measurable metrics.",
      "Move Python backend experience above older unrelated internships.",
    ],
    cover_letter:
      "Dear Hiring Team,\n\nI am excited to apply for this role. My experience building React and FastAPI products in India aligns closely with your stack and scale challenges.\n\nRegards,\nDemo Candidate",
    interview_questions: [
      "Describe a production incident you resolved in a distributed system.",
      "How do you evaluate trade-offs between delivery speed and code quality?",
    ],
    ats_keywords_present: ["React", "TypeScript", "Python", "FastAPI"],
    ats_keywords_missing: ["Kubernetes"],
    verified_claims: [
      { claim: "5 years experience", source: "profile.years_experience", verified: true },
      { claim: "Led migration to FastAPI", source: "resume", verified: false },
    ],
    pack_source: "demo",
  };
}

export const demoUser = DEMO_USER;

export function cloneDemoState() {
  return {
    user: { ...DEMO_USER },
    profile: { ...demoProfile, skills: [...demoProfile.skills] },
    preferences: {
      ...demoPreferences,
      desired_titles: [...demoPreferences.desired_titles],
      preferred_locations: [...demoPreferences.preferred_locations],
      employment_types: [...demoPreferences.employment_types],
      required_excluded_technologies: [...demoPreferences.required_excluded_technologies],
      preferred_excluded_technologies: [...demoPreferences.preferred_excluded_technologies],
    },
    jobMatches: demoJobMatches.map((item) => ({
      ...item,
      matched_skills: [...item.matched_skills],
      job: { ...item.job, location_area: [...item.job.location_area] },
    })),
    trackedJobs: demoTrackedJobs.map((item) => ({
      ...item,
      job: { ...item.job, location_area: [...item.job.location_area] },
    })),
    telegramStatus: { ...demoTelegramStatus },
    applicationPacks: new Map<string, ApplicationPack>(),
  };
}

export type DemoState = ReturnType<typeof cloneDemoState>;
