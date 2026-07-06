import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { useClearTrackedJobs, useDashboardStats, useHomeJobMatches, useTrackedJobs } from "@/hooks/queries";

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

  async function handleClearRecent() {
    await toast.promise(clearTracked.mutateAsync(undefined), {
      loading: "Clearing recent activity...",
      success: (result) => `Cleared ${result.cleared} tracked jobs`,
      error: (error) => (error instanceof Error ? error.message : "Unable to clear activity"),
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
