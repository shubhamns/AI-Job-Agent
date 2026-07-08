import type { JobFilters } from "@/lib/constants";

export const queryKeys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  preferences: ["preferences"] as const,
  dashboardStats: ["dashboard", "stats"] as const,
  trackedJobsRoot: ["jobs", "tracked"] as const,
  jobMatchesRoot: ["jobs", "matches"] as const,
  trackedJobs: (params?: { status?: string; pipelineOnly?: boolean }) =>
    ["jobs", "tracked", params ?? {}] as const,
  jobMatches: (filters: JobFilters & { search: string }) => ["jobs", "matches", filters] as const,
  telegramStatus: ["telegram", "status"] as const,
  outcomes: ["analytics", "outcomes"] as const,
  strategy: ["analytics", "strategy"] as const,
  applicationPack: (source: string, sourceJobId: string) =>
    ["applications", "pack", source, sourceJobId] as const,
};
