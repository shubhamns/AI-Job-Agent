import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { useClearTrackedJobs, useDashboardStats, useHomeJobMatches, useTrackedJobs } from "@/hooks/queries";
import { errorMessage } from "@/lib/errors";

export function HomePage() {
  const navigate = useNavigate();
  const statsQuery = useDashboardStats();
  const trackedQuery = useTrackedJobs();
  const jobsQuery = useHomeJobMatches();
  const clearTracked = useClearTrackedJobs();
  const loading = statsQuery.isLoading || trackedQuery.isLoading || jobsQuery.isLoading;

  function openJob(jobId: string, source?: string) {
    const params = new URLSearchParams({ open: jobId });
    if (source) {
      params.set("source", source);
    }
    navigate(`/jobs?${params.toString()}`);
  }

  function handleClearRecent() {
    const limit = statsQuery.data?.recent_activity.length ?? 0;
    if (!limit) {
      return;
    }
    void toast.promise(clearTracked.mutateAsync({ limit }), {
      loading: "Clearing recent activity...",
      success: (result) => `Cleared ${result.cleared} recent jobs`,
      error: (error) => errorMessage(error, "Unable to clear activity"),
    });
  }

  return (
    <DashboardPage
      stats={statsQuery.data ?? null}
      trackedJobs={trackedQuery.data ?? []}
      jobs={jobsQuery.data?.items ?? []}
      loading={loading}
      clearingRecent={clearTracked.isPending}
      onClearRecent={handleClearRecent}
      onSelectJob={openJob}
    />
  );
}
