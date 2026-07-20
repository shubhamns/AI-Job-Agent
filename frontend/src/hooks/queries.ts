import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { defaultJobFilters, type JobFilters } from "@/lib/constants";
import { queryKeys } from "@/lib/queryKeys";
import { api } from "@/lib/api";
import { hasSession } from "@/lib/session";
import type { CandidateProfile, JobMatch, JobPreference, TelegramStatus, TrackingStatus } from "@/types";

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

export function useTrackedJobs(params?: { status?: TrackingStatus; pipelineOnly?: boolean }) {
  return useQuery({
    queryKey: queryKeys.trackedJobs(params),
    queryFn: () => api.getTrackedJobs(params),
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobMatchesRoot });
    },
  });
}

export function useTrackJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      status: TrackingStatus;
      score: number;
      ai_score?: number | null;
      ai_score_rationale?: string | null;
      job: JobMatch["job"];
    }) => api.trackJob(payload),
    onSuccess: (_data, variables) => {
      queryClient.setQueriesData<{ items: JobMatch[]; total: number; ai_scoring_enabled: boolean }>(
        { queryKey: queryKeys.jobMatchesRoot },
        (current) => {
          if (!current) return current;
          return {
            ...current,
            items: current.items.map((item) =>
              item.job.source === variables.job.source &&
              item.job.source_job_id === variables.job.source_job_id
                ? { ...item, tracking_status: variables.status }
                : item,
            ),
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackedJobsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.outcomes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.strategy });
    },
  });
}

export function useUpdateTrackedJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      source: string;
      sourceJobId: string;
      status?: TrackingStatus;
      notes?: string | null;
      follow_up_at?: string | null;
    }) =>
      api.updateTrackedJob(payload.source, payload.sourceJobId, {
        status: payload.status,
        notes: payload.notes,
        follow_up_at: payload.follow_up_at,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackedJobsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.outcomes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.strategy });
    },
  });
}

export function useOutcomeIntelligence() {
  return useQuery({
    queryKey: queryKeys.outcomes,
    queryFn: () => api.getOutcomeIntelligence(),
  });
}

export function useStrategy() {
  return useQuery({
    queryKey: queryKeys.strategy,
    queryFn: () => api.getStrategy(),
  });
}

export function useApplicationPack(source: string, sourceJobId: string, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.applicationPack(source, sourceJobId),
    queryFn: () => api.generateApplicationPack(source, sourceJobId),
    enabled,
    staleTime: 1000 * 60 * 30,
  });
}

export function useGenerateApplicationPack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { source: string; sourceJobId: string; refresh?: boolean }) =>
      api.generateApplicationPack(payload.source, payload.sourceJobId, payload.refresh ?? false),
    onSuccess: (pack) => {
      queryClient.setQueryData(queryKeys.applicationPack(pack.source, pack.source_job_id), pack);
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
    mutationFn: (params?: { status?: TrackingStatus; limit?: number }) =>
      api.clearTrackedJobs(params),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackedJobsRoot });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats });
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobMatchesRoot });
    },
  });
}

export function useTelegramLink() {
  return useMutation({
    mutationFn: () => api.getTelegramLink(),
  });
}
