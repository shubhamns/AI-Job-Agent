import type { JobFilters } from "@/lib/constants";

export const queryKeys = {
  me: ["me"] as const,
  profile: ["profile"] as const,
  preferences: ["preferences"] as const,
  dashboardStats: ["dashboard", "stats"] as const,
  trackedJobs: ["jobs", "tracked"] as const,
  jobMatches: (filters: JobFilters & { search: string }) => ["jobs", "matches", filters] as const,
  telegramStatus: ["telegram", "status"] as const,
};
