import { getErrorMessage, http } from "./axios";
import { isDemoSession } from "./demo/session";
import { mockApi } from "./demo/mockApi";
import type {
  ApplicationPack,
  CandidateProfile,
  DashboardStats,
  JobMatch,
  JobPreference,
  OutcomeIntelligence,
  StrategyResponse,
  TrackedJob,
  User,
  TelegramLink,
  TelegramStatus,
  TrackingStatus,
} from "../types";

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

const publicRequest = { headers: { "X-Skip-Auth": "true" } };

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options?: { body?: unknown; auth?: boolean; formData?: FormData },
): Promise<T> {
  try {
    const response = await http.request<T>({
      method,
      url: path,
      data: options?.formData ?? options?.body,
      ...(options?.auth === false ? publicRequest : {}),
      ...(options?.formData ? { headers: { "Content-Type": "multipart/form-data" } } : {}),
    });
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

function useMock<T>(mockCall: () => Promise<T>, realCall: () => Promise<T>): Promise<T> {
  if (isDemoSession()) {
    return mockCall();
  }
  return realCall();
}

export const api = {
  register: (email: string, password: string) =>
    request<User>("POST", "/auth/register", {
      auth: false,
      body: { email, password },
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>("POST", "/auth/login", {
      auth: false,
      body: { email, password },
    }),
  me: () => useMock(() => mockApi.me(), () => request<User>("GET", "/auth/me")),
  getProfile: () => useMock(() => mockApi.getProfile(), () => request<CandidateProfile | null>("GET", "/profile")),
  updateProfile: (payload: Omit<CandidateProfile, "id" | "user_id">) =>
    useMock(
      () => mockApi.updateProfile(payload),
      () => request<CandidateProfile>("PUT", "/profile", { body: payload }),
    ),
  getPreferences: () =>
    useMock(() => mockApi.getPreferences(), () => request<JobPreference | null>("GET", "/profile/preferences")),
  updatePreferences: (payload: Omit<JobPreference, "id" | "user_id">) =>
    useMock(
      () => mockApi.updatePreferences(payload),
      () => request<JobPreference>("PUT", "/profile/preferences", { body: payload }),
    ),
  uploadResume: (file: File) => {
    if (isDemoSession()) {
      void file;
      return mockApi.uploadResume();
    }
    const formData = new FormData();
    formData.append("file", file);
    return request<{ extracted_text: string; profile: CandidateProfile | null }>("POST", "/resumes", {
      formData,
    });
  },
  getDashboardStats: () =>
    useMock(() => mockApi.getDashboardStats(), () => request<DashboardStats>("GET", "/dashboard/stats")),
  getJobs: (params: {
    minScore: number;
    sortBy: "score" | "recent" | "salary" | "ai_score";
    includeSkipped: boolean;
    search: string;
    remoteTypes: string;
  }) => {
    if (isDemoSession()) {
      return mockApi.getJobs(params);
    }
    const searchParams = new URLSearchParams({
      min_score: String(params.minScore),
      sort_by: params.sortBy,
      include_skipped: String(params.includeSkipped),
    });
    if (params.search.trim()) {
      searchParams.set("search", params.search.trim());
    }
    if (params.remoteTypes.trim()) {
      searchParams.set("remote_types", params.remoteTypes.trim());
    }
    return request<{ items: JobMatch[]; total: number; ai_scoring_enabled: boolean }>(
      "GET",
      `/jobs/matches?${searchParams.toString()}`,
    );
  },
  getTrackedJobs: (params?: { status?: TrackingStatus; pipelineOnly?: boolean }) => {
    if (isDemoSession()) {
      return mockApi.getTrackedJobs(params);
    }
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.pipelineOnly) searchParams.set("pipeline_only", "true");
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request<TrackedJob[]>("GET", `/jobs/tracked${suffix}`);
  },
  updateTrackedJob: (
    source: string,
    sourceJobId: string,
    payload: { status?: TrackingStatus; notes?: string | null; follow_up_at?: string | null },
  ) =>
    useMock(
      () => mockApi.updateTrackedJob(source, sourceJobId, payload),
      () =>
        request<TrackedJob>(
          "PATCH",
          `/jobs/tracked/${encodeURIComponent(source)}/${encodeURIComponent(sourceJobId)}`,
          { body: payload },
        ),
    ),
  clearTrackedJobs: (params?: { status?: TrackingStatus; limit?: number }) => {
    if (isDemoSession()) {
      return mockApi.clearTrackedJobs(params);
    }
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request<{ cleared: number }>("DELETE", `/jobs/tracked${suffix}`);
  },
  trackJob: (payload: {
    status: TrackingStatus;
    score: number;
    ai_score?: number | null;
    ai_score_rationale?: string | null;
    job: JobMatch["job"];
  }) =>
    useMock(
      () => mockApi.trackJob(payload),
      () => request<TrackedJob>("POST", "/jobs/actions", { body: payload }),
    ),
  getOutcomeIntelligence: () =>
    useMock(() => mockApi.getOutcomeIntelligence(), () => request<OutcomeIntelligence>("GET", "/analytics/outcomes")),
  getStrategy: () =>
    useMock(() => mockApi.getStrategy(), () => request<StrategyResponse>("GET", "/analytics/strategy")),
  generateApplicationPack: (source: string, sourceJobId: string, refresh = false) => {
    if (isDemoSession()) {
      void refresh;
      return mockApi.generateApplicationPack(source, sourceJobId);
    }
    return request<ApplicationPack>(
      "POST",
      `/applications/${encodeURIComponent(source)}/${encodeURIComponent(sourceJobId)}/pack?refresh=${refresh}`,
    );
  },
  getTelegramStatus: () =>
    useMock(() => mockApi.getTelegramStatus(), () => request<TelegramStatus>("GET", "/telegram/status")),
  getTelegramLink: () =>
    useMock(() => mockApi.getTelegramLink(), () => request<TelegramLink>("GET", "/telegram/link")),
  updateTelegramSettings: (payload: { notifications_enabled?: boolean; notify_min_score?: number }) =>
    useMock(
      () => mockApi.updateTelegramSettings(payload),
      () => request<TelegramStatus>("PATCH", "/telegram/settings", { body: payload }),
    ),
};
