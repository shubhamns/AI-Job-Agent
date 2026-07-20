import type {
  ApplicationPack,
  CandidateProfile,
  DashboardStats,
  JobMatch,
  JobPreference,
  OutcomeIntelligence,
  StrategyResponse,
  TrackedJob,
  TrackingStatus,
  User,
  TelegramLink,
  TelegramStatus,
} from "@/types";
import {
  cloneDemoState,
  demoApplicationPack,
  demoOutcomes,
  demoStrategy,
  demoTelegramLink,
  type DemoState,
} from "./mockData";
import { clearDemoSession, startDemoSession } from "./session";

let state: DemoState = cloneDemoState();

function recomputeDashboardStats(): DashboardStats {
  const counts = {
    saved: 0,
    applied: 0,
    skipped: 0,
    interview: 0,
    rejected: 0,
    offer: 0,
    no_response: 0,
  };
  let savedScoreTotal = 0;

  for (const item of state.trackedJobs) {
    if (item.status === "saved") {
      counts.saved += 1;
      savedScoreTotal += item.score ?? 0;
    } else if (item.status === "applied") counts.applied += 1;
    else if (item.status === "skipped") counts.skipped += 1;
    else if (item.status === "interview") counts.interview += 1;
    else if (item.status === "rejected") counts.rejected += 1;
    else if (item.status === "offer") counts.offer += 1;
    else if (item.status === "no_response") counts.no_response += 1;
  }

  const pipelineTotal = counts.applied + counts.interview + counts.rejected + counts.offer + counts.no_response;

  return {
    total_saved: counts.saved,
    total_applied: counts.applied,
    total_skipped: counts.skipped,
    total_interview: counts.interview,
    total_rejected: counts.rejected,
    total_offer: counts.offer,
    total_no_response: counts.no_response,
    total_tracked: state.trackedJobs.length,
    average_saved_score: counts.saved ? Math.round(savedScoreTotal / counts.saved) : 0,
    interview_rate: pipelineTotal ? counts.interview / pipelineTotal : 0,
    recent_activity: [...state.trackedJobs]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 5),
    upcoming_follow_ups: state.trackedJobs
      .filter((item) => item.follow_up_at)
      .sort((a, b) => String(a.follow_up_at).localeCompare(String(b.follow_up_at))),
  };
}

function findTracked(source: string, sourceJobId: string) {
  return state.trackedJobs.find((item) => item.source === source && item.source_job_id === sourceJobId);
}

function updateJobTracking(source: string, sourceJobId: string, status: JobMatch["tracking_status"]) {
  state.jobMatches = state.jobMatches.map((item) =>
    item.job.source === source && item.job.source_job_id === sourceJobId
      ? { ...item, tracking_status: status }
      : item,
  );
}

export function resetDemoStore() {
  state = cloneDemoState();
}

export function enterDemoSession() {
  startDemoSession();
  resetDemoStore();
}

export function exitDemoSession() {
  clearDemoSession();
  resetDemoStore();
}

export const mockApi = {
  me: async (): Promise<User> => state.user,
  getProfile: async (): Promise<CandidateProfile | null> => state.profile,
  updateProfile: async (payload: Omit<CandidateProfile, "id" | "user_id">): Promise<CandidateProfile> => {
    state.profile = { ...state.profile, ...payload, skills: [...payload.skills] };
    return state.profile;
  },
  getPreferences: async (): Promise<JobPreference | null> => state.preferences,
  updatePreferences: async (payload: Omit<JobPreference, "id" | "user_id">): Promise<JobPreference> => {
    state.preferences = {
      ...state.preferences,
      ...payload,
      desired_titles: [...payload.desired_titles],
      preferred_locations: [...payload.preferred_locations],
      employment_types: [...payload.employment_types],
      required_excluded_technologies: [...payload.required_excluded_technologies],
      preferred_excluded_technologies: [...payload.preferred_excluded_technologies],
    };
    return state.preferences;
  },
  uploadResume: async () => ({
    extracted_text: "Demo resume text with React, TypeScript, Python, and FastAPI experience.",
    profile: state.profile,
  }),
  getDashboardStats: async (): Promise<DashboardStats> => recomputeDashboardStats(),
  getJobs: async (params: {
    minScore: number;
    sortBy: "score" | "recent" | "salary" | "ai_score";
    includeSkipped: boolean;
    search: string;
    remoteTypes: string;
  }) => {
    let items = [...state.jobMatches];
    if (!params.includeSkipped) {
      items = items.filter((item) => item.tracking_status !== "skipped");
    }
    if (params.minScore > 0) {
      items = items.filter((item) => item.score >= params.minScore);
    }
    const query = params.search.trim().toLowerCase();
    if (query) {
      items = items.filter(
        (item) =>
          item.job.title.toLowerCase().includes(query) ||
          (item.job.company_name ?? "").toLowerCase().includes(query),
      );
    }
    if (params.remoteTypes.trim()) {
      const remoteFilters = params.remoteTypes.split(",").map((value) => value.trim().toLowerCase());
      items = items.filter((item) => remoteFilters.includes(item.job.remote_type.toLowerCase()));
    }
    items.sort((a, b) => {
      if (params.sortBy === "ai_score") {
        return (b.ai_fit?.score ?? 0) - (a.ai_fit?.score ?? 0);
      }
      if (params.sortBy === "salary") {
        return (b.job.salary_max ?? 0) - (a.job.salary_max ?? 0);
      }
      if (params.sortBy === "recent") {
        return String(b.job.posted_at).localeCompare(String(a.job.posted_at));
      }
      return b.score - a.score;
    });
    return { items, total: items.length, ai_scoring_enabled: true };
  },
  getTrackedJobs: async (params?: { status?: TrackingStatus; pipelineOnly?: boolean }) => {
    let items = [...state.trackedJobs];
    if (params?.status) {
      items = items.filter((item) => item.status === params.status);
    }
    if (params?.pipelineOnly) {
      items = items.filter((item) =>
        ["applied", "interview", "rejected", "offer", "no_response"].includes(item.status),
      );
    }
    return items.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  },
  updateTrackedJob: async (
    source: string,
    sourceJobId: string,
    payload: { status?: TrackingStatus; notes?: string | null; follow_up_at?: string | null },
  ): Promise<TrackedJob> => {
    const existing = findTracked(source, sourceJobId);
    if (!existing) {
      throw new Error("Tracked job not found.");
    }
    const updated: TrackedJob = {
      ...existing,
      status: payload.status ?? existing.status,
      notes: payload.notes ?? existing.notes,
      follow_up_at: payload.follow_up_at ?? existing.follow_up_at,
      updated_at: new Date().toISOString(),
    };
    state.trackedJobs = state.trackedJobs.map((item) =>
      item.source === source && item.source_job_id === sourceJobId ? updated : item,
    );
    if (payload.status) {
      updateJobTracking(source, sourceJobId, payload.status);
    }
    return updated;
  },
  clearTrackedJobs: async (params?: { status?: TrackingStatus; limit?: number }) => {
    const before = state.trackedJobs.length;
    if (params?.status) {
      const removable = state.trackedJobs.filter((item) => item.status === params.status);
      const limit = params.limit ?? removable.length;
      const removeKeys = new Set(
        removable.slice(0, limit).map((item) => `${item.source}:${item.source_job_id}`),
      );
      state.trackedJobs = state.trackedJobs.filter(
        (item) => !removeKeys.has(`${item.source}:${item.source_job_id}`),
      );
    } else if (params?.limit) {
      state.trackedJobs = state.trackedJobs.slice(params.limit);
    } else {
      state.trackedJobs = [];
    }
    return { cleared: before - state.trackedJobs.length };
  },
  trackJob: async (payload: {
    status: TrackingStatus;
    score: number;
    ai_score?: number | null;
    ai_score_rationale?: string | null;
    job: JobMatch["job"];
  }): Promise<TrackedJob> => {
    const existing = findTracked(payload.job.source, payload.job.source_job_id);
    const trackedJob: TrackedJob = existing
      ? {
          ...existing,
          status: payload.status,
          score: payload.score,
          ai_score: payload.ai_score ?? existing.ai_score,
          ai_score_rationale: payload.ai_score_rationale ?? existing.ai_score_rationale,
          updated_at: new Date().toISOString(),
        }
      : {
          source: payload.job.source,
          source_job_id: payload.job.source_job_id,
          dedupe_key: `${payload.job.source}:${payload.job.source_job_id}`,
          status: payload.status,
          score: payload.score,
          ai_score: payload.ai_score ?? null,
          ai_score_rationale: payload.ai_score_rationale ?? null,
          notes: null,
          follow_up_at: null,
          job: payload.job,
          updated_at: new Date().toISOString(),
        };
    if (existing) {
      state.trackedJobs = state.trackedJobs.map((item) =>
        item.source === trackedJob.source && item.source_job_id === trackedJob.source_job_id ? trackedJob : item,
      );
    } else {
      state.trackedJobs = [trackedJob, ...state.trackedJobs];
    }
    updateJobTracking(payload.job.source, payload.job.source_job_id, payload.status);
    return trackedJob;
  },
  getOutcomeIntelligence: async (): Promise<OutcomeIntelligence> => demoOutcomes,
  getStrategy: async (): Promise<StrategyResponse> => demoStrategy,
  generateApplicationPack: async (source: string, sourceJobId: string): Promise<ApplicationPack> => {
    const key = `${source}:${sourceJobId}`;
    const existing = state.applicationPacks.get(key);
    if (existing) return existing;
    const pack = demoApplicationPack(source, sourceJobId);
    state.applicationPacks.set(key, pack);
    return pack;
  },
  getTelegramStatus: async (): Promise<TelegramStatus> => state.telegramStatus,
  getTelegramLink: async (): Promise<TelegramLink> => demoTelegramLink,
  updateTelegramSettings: async (payload: {
    notifications_enabled?: boolean;
    notify_min_score?: number;
  }): Promise<TelegramStatus> => {
    state.telegramStatus = { ...state.telegramStatus, ...payload };
    return state.telegramStatus;
  },
};
