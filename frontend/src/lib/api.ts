import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./cookies";
import type {
  CandidateProfile,
  DashboardStats,
  JobMatch,
  JobPreference,
  TrackedJob,
  User,
  TelegramLink,
  TelegramStatus,
} from "../types";

const API_BASE_URL = import.meta.env.API_BASE_URL ?? "http://localhost:8000/api/v1";

type RequestOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: Record<string, string>;
  auth?: boolean;
  retry?: boolean;
};

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }
  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    clearTokens();
    return null;
  }
  const payload = (await response.json()) as TokenResponse;
  setTokens(payload.access_token, payload.refresh_token);
  return payload.access_token;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useAuth = options.auth !== false;
  const token = useAuth ? getAccessToken() : null;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    body: options.body ?? null,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (response.status === 401 && useAuth && options.retry !== false) {
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    const nextToken = await refreshPromise;
    if (nextToken) {
      return request<T>(path, { ...options, retry: false });
    }
    throw new Error("Session expired. Please sign in again.");
  }
  if (!response.ok) {
    let detail = "Request failed.";
    try {
      const payload = (await response.json()) as { detail?: string };
      detail = payload.detail ?? detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  register: (email: string, password: string) =>
    request<User>("/auth/register", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    }),
  login: (email: string, password: string) =>
    request<TokenResponse>("/auth/login", {
      method: "POST",
      auth: false,
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<User>("/auth/me"),
  getProfile: () => request<CandidateProfile | null>("/profile"),
  updateProfile: (payload: Omit<CandidateProfile, "id" | "user_id">) =>
    request<CandidateProfile>("/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  getPreferences: () => request<JobPreference | null>("/profile/preferences"),
  updatePreferences: (payload: Omit<JobPreference, "id" | "user_id">) =>
    request<JobPreference>("/profile/preferences", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<{ extracted_text: string; profile: CandidateProfile | null }>("/resumes", {
      method: "POST",
      body: formData,
    });
  },
  getDashboardStats: () => request<DashboardStats>("/dashboard/stats"),
  getJobs: (params: {
    minScore: number;
    sortBy: "score" | "recent" | "salary";
    includeSkipped: boolean;
    search: string;
    remoteTypes: string;
  }) => {
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
    return request<{ items: JobMatch[]; total: number }>(`/jobs/matches?${searchParams.toString()}`);
  },
  getTrackedJobs: () => request<TrackedJob[]>("/jobs/tracked"),
  clearTrackedJobs: (status?: "saved" | "applied" | "skipped") => {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return request<{ cleared: number }>(`/jobs/tracked${suffix}`, { method: "DELETE" });
  },
  trackJob: (payload: { status: "saved" | "applied" | "skipped"; score: number; job: JobMatch["job"] }) =>
    request<TrackedJob>("/jobs/actions", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getTelegramStatus: () => request<TelegramStatus>("/telegram/status"),
  getTelegramLink: () => request<TelegramLink>("/telegram/link"),
  updateTelegramSettings: (payload: { notifications_enabled?: boolean; notify_min_score?: number }) =>
    request<TelegramStatus>("/telegram/settings", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
