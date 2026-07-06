import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { defaultJobFilters, type JobFilters } from "@/lib/constants";
import { queryKeys } from "@/lib/queryKeys";
import { api } from "@/lib/api";
import { hasSession } from "@/lib/cookies";
import type { CandidateProfile, JobMatch, JobPreference, TelegramStatus } from "@/types";

export function useMe() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => api.me(),
    enabled: hasSession(),
    retry: false,
  });
}

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => api.getProfile(),
  });
}

export function usePreferences() {
  return useQuery({
    queryKey: queryKeys.preferences,
    queryFn: () => api.getPreferences(),
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: () => api.getDashboardStats(),
  });
}

export function useTrackedJobs() {
  return useQuery({
    queryKey: queryKeys.trackedJobs,
    queryFn: () => api.getTrackedJobs(),
  });
}

export function useJobMatches(filters: JobFilters & { search: string }) {
  return useQuery({
    queryKey: queryKeys.jobMatches(filters),
    queryFn: () => api.getJobs(filters),
  });
}

export function useHomeJobMatches() {
  return useJobMatches({ ...defaultJobFilters, search: "" });
}

export function useTelegramStatus() {
  return useQuery({
    queryKey: queryKeys.telegramStatus,
    queryFn: () => api.getTelegramStatus(),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<CandidateProfile, "id" | "user_id">) => api.updateProfile(payload),
    onSuccess: (profile) => {
      queryClient.setQueryData(queryKeys.profile, profile);
    },
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadResume(file),
    onSuccess: (response) => {
      if (response.profile) {
        queryClient.setQueryData(queryKeys.profile, response.profile);
      } else {
        void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      }
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<JobPreference, "id" | "user_id">) => api.updatePreferences(payload),
    onSuccess: (preferences) => {
      queryClient.setQueryData(queryKeys.preferences, preferences);
      void queryClient.invalidateQueries({ queryKey: ["jobs", "matches"] });
    },
  });
}

export function useTrackJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { status: "saved" | "applied" | "skipped"; score: number; job: JobMatch["job"] }) =>
      api.trackJob(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackedJobs });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      void queryClient.invalidateQueries({ queryKey: ["jobs", "matches"] });
    },
  });
}

export function useUpdateTelegramSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { notifications_enabled?: boolean; notify_min_score?: number }) =>
      api.updateTelegramSettings(payload),
    onSuccess: (status) => {
      queryClient.setQueryData(queryKeys.telegramStatus, status);
    },
  });
}

export function useClearTrackedJobs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status?: "saved" | "applied" | "skipped") => api.clearTrackedJobs(status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackedJobs });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      void queryClient.invalidateQueries({ queryKey: ["jobs", "matches"] });
    },
  });
}

export function useTelegramLink() {
  return useMutation({
    mutationFn: () => api.getTelegramLink(),
  });
}
